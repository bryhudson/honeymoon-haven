const { onSchedule } = require("firebase-functions/v2/scheduler");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
const { sendGmail, gmailSecrets } = require("../helpers/email");
const { emailTemplates } = require("../helpers/emailTemplates");

// Ensure admin is initialized
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();

/**
 * Scheduled Email Reminder System
 * Runs every 5 minutes to check for turn reminders
 * Sends time-based reminders for Normal mode and interval-based for Fast mode
 */
exports.turnReminderScheduler = onSchedule(
    {
        schedule: "* * * * *", // Every 1 minute for precision
        secrets: gmailSecrets
    },
    async (event) => {
        logger.info("=== Turn Reminder Scheduler Started ===");

        try {
            // 1. Fetch current draft status
            const statusDoc = await db.collection("status").doc("draftStatus").get();
            if (!statusDoc.exists) {
                logger.info("No draft status found, skipping");
                return;
            }

            const draftStatus = statusDoc.data();
            const { activePicker, windowStarts, windowEnds, round, phase } = draftStatus;

            if (!activePicker) {
                logger.info("No active picker, skipping");
                return;
            }

            logger.info(`Active Picker: ${activePicker}, Round: ${round}`);

            // 2. Fetch settings for test mode and timing
            const settingsDoc = await db.collection("settings").doc("general").get();
            const settings = settingsDoc.exists ? settingsDoc.data() : {};
            const fastTestingMode = settings.fastTestingMode || false;
            const isTestMode = settings.isTestMode !== false; // Default to true for safety

            // 3. Get shareholder email
            const shareholderDoc = await db.collection("shareholders")
                .where("name", "==", activePicker)
                .limit(1)
                .get();

            if (shareholderDoc.empty) {
                logger.error(`Shareholder not found: ${activePicker}`);
                return;
            }

            const shareholder = shareholderDoc.docs[0].data();
            const shareholderEmail = shareholder.email;
            const cabinNumber = shareholder.cabin || shareholder.cabinNumber || shareholder.defaultCabin;

            if (!shareholderEmail) {
                logger.error(`No email for shareholder: ${activePicker}`);
                return;
            }

            // 4. Get or create notification log
            const notificationLogId = `${activePicker}-${round}`;
            const notificationLogRef = db.collection("notification_log").doc(notificationLogId);
            const notificationLogDoc = await notificationLogRef.get();
            const notificationLog = notificationLogDoc.exists ? notificationLogDoc.data() : {};

            // CRITICAL FIX: Race Condition Check
            // Before proceeding, verify this user hasn't ALREADY booked.
            // (autosyncDraftStatus might lag by 1 minute, causing "Ghost Reminders")
            const bookingCheck = await db.collection("bookings")
                .where("shareholderName", "==", activePicker)
                .where("round", "==", round) // Ensure it matches current round
                .get();

            const hasConfirmedBooking = bookingCheck.docs.some(d => {
                const data = d.data();
                return data.status !== 'cancelled' && data.type !== 'cancelled';
            });

            if (hasConfirmedBooking) {
                logger.info(`[Race Condition Avoided] ${activePicker} has already booked. Skipping reminder.`);
                return;
            }

            const now = new Date();
            const turnStart = windowStarts ? new Date(windowStarts.toDate()) : null;
            const turnEnd = windowEnds ? new Date(windowEnds.toDate()) : null;

            if (!turnStart || !turnEnd) {
                logger.error("Missing turn start or end time");
                return;
            }

            // 5. Check if this is a new turn (turn start notification)
            const lastTurnStartTime = notificationLog.turnStartTime?.toDate();
            const isNewTurn = !lastTurnStartTime || lastTurnStartTime.getTime() !== turnStart.getTime();

            if (isNewTurn) {
                logger.info("New turn detected, sending turn start notification");
                await sendTurnStartEmail(shareholderEmail, activePicker, turnEnd, round, phase, isTestMode, cabinNumber);

                // Update notification log
                await notificationLogRef.set({
                    shareholderName: activePicker,
                    round: round,
                    phase: phase, // Store phase for robustness
                    turnStartTime: admin.firestore.Timestamp.fromDate(turnStart),
                    lastTurnStartSent: admin.firestore.Timestamp.now()
                }, { merge: true });

                return; // Don't send other reminders in the same run
            }

            // 6. Send appropriate reminders based on mode
            if (fastTestingMode) {
                await handleFastModeReminders(
                    now, turnEnd, shareholderEmail, activePicker,
                    notificationLog, notificationLogRef, round, phase, isTestMode, cabinNumber
                );
            } else {
                await handleNormalModeReminders(
                    now, turnStart, turnEnd, shareholderEmail, activePicker,
                    notificationLog, notificationLogRef, round, phase, isTestMode, fastTestingMode, cabinNumber
                );
            }

        } catch (error) {
            logger.error("Error in turn reminder scheduler:", error);
        }

        logger.info("=== Turn Reminder Scheduler Completed ===");
    }
);

/**
 * Handle Fast Mode Reminders (10-minute windows)
 * Send at 5min and 2min remaining
 */
async function handleFastModeReminders(
    now, turnEnd, email, shareholderName,
    notificationLog, notificationLogRef, round, phase, isTestMode, cabinNumber
) {
    const minutesRemaining = (turnEnd - now) / (1000 * 60);
    logger.info(`Fast Mode: ${minutesRemaining.toFixed(1)} minutes remaining`);

    // 2-minute urgent warning (Catch anything between 0 and 2.5 mins)
    if (minutesRemaining <= 2.5 && minutesRemaining > 0 && !notificationLog.last2minSent) {
        logger.info("Sending 2-minute urgent reminder");
        await sendReminderEmail(email, shareholderName, turnEnd, round, phase, "2 minutes", true, isTestMode, 'evening', cabinNumber);
        await notificationLogRef.update({
            last2minSent: admin.firestore.Timestamp.now()
        });
    }
    // 5-minute warning (Catch anything between 2.5 and 6 mins)
    else if (minutesRemaining <= 6 && minutesRemaining > 2.5 && !notificationLog.last5minSent) {
        logger.info("Sending 5-minute reminder");
        await sendReminderEmail(email, shareholderName, turnEnd, round, phase, "5 minutes", false, isTestMode, 'morning', cabinNumber);
        await notificationLogRef.update({
            last5minSent: admin.firestore.Timestamp.now()
        });
    }
}

/**
 * Handle Normal Mode Reminders (48-hour windows)
 * Send at: 7pm same day, 9am next day, 9am last day, 2h before deadline
 * In Fast Mode: 2min, 5min, 8min, 2min before deadline
 */
async function handleNormalModeReminders(
    now, turnStart, turnEnd, email, shareholderName,
    notificationLog, notificationLogRef, round, phase, isTestMode, fastMode, cabinNumber
) {
    // Calculate specific reminder times
    let sameDayEvening, nextDayMorning, lastDayMorning, twoHourWarning;

    if (fastMode) {
        // Fast Mode: Compressed schedule for 10-minute testing
        sameDayEvening = new Date(turnStart.getTime() + 2 * 60 * 1000); // 2 min after start
        nextDayMorning = new Date(turnStart.getTime() + 5 * 60 * 1000); // 5 min after start
        lastDayMorning = new Date(turnStart.getTime() + 8 * 60 * 1000); // 8 min after start
        twoHourWarning = new Date(turnEnd.getTime() - 2 * 60 * 1000); // 2 min before end
    } else {
        // Normal Mode: Standard 48h schedule
        // ADJUSTED FOR PST TIMEZONE (UTC-8)
        // Cloud Functions run in UTC. To target PST times, we add 8 hours to the target hour.

        // 7pm PST same day = 03:00 UTC next day
        sameDayEvening = new Date(turnStart);
        sameDayEvening.setDate(sameDayEvening.getDate() + 1); // Move to next UTC day
        sameDayEvening.setHours(3, 0, 0, 0);

        // 9am PST next day = 17:00 UTC next day
        // NOTE: This assumes UTC-8 (PST). During PDT (April-Oct), 17:00 UTC is 10:00 AM PDT.
        // Reminders will arrive at 10 AM instead of 9 AM during the season. 
        // This is acceptable for now but could be improved with 'luxon' or similar.
        // 9am PST Day 2 (Middle Morning)
        nextDayMorning = new Date(turnStart);
        nextDayMorning.setDate(nextDayMorning.getDate() + 1);
        nextDayMorning.setHours(17, 0, 0, 0); // 17:00 UTC = 9:00 AM PST

        // 7pm PST Day 2 (Middle Evening) - NEW
        nextDayEvening = new Date(turnStart);
        nextDayEvening.setDate(nextDayEvening.getDate() + 1);
        nextDayEvening.setHours(3, 0, 0, 0); // 03:00 UTC (Next Day) = 7:00 PM PST
        // Note: nextDayEvening is technically Day 3 in UTC, so we add 2 days to date if using base UTC logic?
        // Wait, turnStart is UTC? 
        // Let's rely on relative Date logic.
        // turnStart (10am D1). +1d = 10am D2. Set hours 19 (7pm).
        // JS Date setHours(19) sets it to 19:00 local time if using local, or we should use UTC.
        // The previous code used UTC offsets.
        // 9am PST = 17:00 UTC.
        // 7pm PST = 03:00 UTC (Next Day).

        // Let's stick to the pattern:
        // Day 2 7pm:
        nextDayEvening = new Date(turnStart);
        nextDayEvening.setDate(nextDayEvening.getDate() + 2); // +2 because 7pm PST is 3am UTC next day
        nextDayEvening.setHours(3, 0, 0, 0);

        // Final Morning 6am (T-4h)
        // 6am PST = 14:00 UTC
        finalMorning6am = new Date(turnEnd);
        finalMorning6am.setHours(14, 0, 0, 0); // Directly set to 14:00 UTC of the deadline day?
        // Wait, deadline is 10am PST = 18:00 UTC.
        // 6am PST is 4 hours before.
        // 18 - 4 = 14:00 UTC. Correct.
        // But turnEnd might vary? If turnEnd is flexible, use relative subtraction.
        finalMorning6am = new Date(turnEnd);
        finalMorning6am.setHours(turnEnd.getHours() - 4);

        // Final Urgent 9am (T-1h)
        finalMorning9am = new Date(turnEnd);
        finalMorning9am.setHours(turnEnd.getHours() - 1);
    }

    logger.info(`Normal Mode - Checking reminders at ${now.toISOString()}`);

    // Check each reminder time (in priority order - most urgent first)

    // 1. Final Morning 9 AM (Urgent 1h)
    if (now >= finalMorning9am && now < turnEnd && !notificationLog.finalMorning9amSent) {
        logger.info("Sending final urgent reminder (9 AM)");
        await sendReminderEmail(email, shareholderName, turnEnd, round, phase, "1 hour", true, isTestMode, 'morning', cabinNumber);
        await notificationLogRef.update({
            finalMorning9amSent: admin.firestore.Timestamp.now()
        });
    }
    // 2. Final Morning 6 AM (4h)
    else if (now >= finalMorning6am && !notificationLog.finalMorning6amSent) {
        logger.info("Sending final morning reminder (6 AM)");
        await sendReminderEmail(email, shareholderName, turnEnd, round, phase, "4 hours", false, isTestMode, 'morning', cabinNumber);
        await notificationLogRef.update({
            finalMorning6amSent: admin.firestore.Timestamp.now()
        });
    }
    // 3. Day 2 Evening (7 PM)
    else if (now >= nextDayEvening && !notificationLog.nextDayEveningSent) {
        logger.info("Sending Day 2 evening reminder (7 PM)");
        await sendReminderEmail(email, shareholderName, turnEnd, round, phase, "day 2 evening", false, isTestMode, 'evening', cabinNumber);
        await notificationLogRef.update({
            nextDayEveningSent: admin.firestore.Timestamp.now()
        });
    }
    // 4. Day 2 Morning (9 AM)
    else if (now >= nextDayMorning && !notificationLog.nextDayMorningSent) {
        logger.info("Sending next day 9am reminder");
        await sendReminderEmail(email, shareholderName, turnEnd, round, phase, "day 2", false, isTestMode, 'morning', cabinNumber);
        await notificationLogRef.update({
            nextDayMorningSent: admin.firestore.Timestamp.now()
        });
    }
    // 5. Day 1 Evening (7 PM)
    else if (now >= sameDayEvening && !notificationLog.sameDayEveningSent) {
        logger.info("Sending same day 7pm reminder");
        await sendReminderEmail(email, shareholderName, turnEnd, round, phase, "evening", false, isTestMode, 'evening', cabinNumber);
        await notificationLogRef.update({
            sameDayEveningSent: admin.firestore.Timestamp.now()
        });
    }
}

/**
 * Send Turn Start Email
 */
async function sendTurnStartEmail(email, shareholderName, deadline, round, phase, isTestMode, cabinNumber) {
    const templateData = {
        name: shareholderName,
        round: round,
        phase: phase,
        phase: phase,
        deadline_date: formatDeadlineDate(deadline),
        deadline_time: formatDeadlineTime(deadline),
        dashboard_url: "https://hhr-trailer-booking.web.app/dashboard"
    };

    const { subject, htmlContent } = emailTemplates.turnStarted(templateData);

    // SAFETY: We pass the REAL recipient. 
    // The 'sendGmail' helper will check 'isTestMode' and intercept it if necessary.
    const recipient = email;
    const finalSubject = subject;

    await sendGmail({
        to: { name: shareholderName, email: recipient, cabinNumber }, // ADDED cabinNumber
        subject: finalSubject,
        htmlContent: htmlContent
    });

    logger.info(`Turn start email sent to: ${recipient}`);
}

/**
 * Send Reminder Email
 */
async function sendReminderEmail(email, shareholderName, deadline, round, phase, timeRemaining, isUrgent, isTestMode, reminderType = 'morning', cabinNumber) {
    const urgencyMessage = isUrgent
        ? "⚠️ URGENT: Your booking window is about to expire!"
        : "Friendly reminder to complete your booking.";

    const statusMessage = `You have ${timeRemaining} remaining to make your selection.`;

    // Calculate hours remaining for template logic (e.g. "49 hours")
    const hoursRemaining = Math.max(0, Math.ceil((deadline - new Date()) / (1000 * 60 * 60)));

    const templateData = {
        name: shareholderName,
        round: round,
        phase: phase,
        deadline_date: formatDeadlineDate(deadline),
        deadline_time: formatDeadlineTime(deadline),
        status_message: statusMessage,
        urgency_message: urgencyMessage,
        hours_remaining: hoursRemaining,
        type: reminderType, // Fix: Explicitly pass type for greeting logic
        dashboard_url: "https://hhr-trailer-booking.web.app/dashboard"
    };

    const emailFunction = isUrgent ? emailTemplates.finalWarning : emailTemplates.reminder;
    const { subject, htmlContent } = emailFunction(templateData);

    // SAFETY: We pass the REAL recipient. 
    // The 'sendGmail' helper will check 'isTestMode' and intercept it if necessary.
    const recipient = email;
    const finalSubject = subject;

    await sendGmail({
        to: { name: shareholderName, email: recipient, cabinNumber }, // ADDED cabinNumber
        subject: finalSubject,
        htmlContent: htmlContent
    });

    logger.info(`Reminder email (${timeRemaining}) sent to: ${recipient}`);
}

// Simple Formatters
function toDate(input) {
    if (!input) return null;
    if (input.toDate) return input.toDate(); // Firestore Timestamp
    if (typeof input === 'string') return new Date(input);
    return input; // Already a Date or something else
}

function formatDeadlineDate(input) {
    const date = toDate(input);
    if (!date || isNaN(date.getTime())) return "Unknown Date";

    return date.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: 'America/Vancouver'
    });
}

function formatDeadlineTime(input) {
    const date = toDate(input);
    if (!date || isNaN(date.getTime())) return "Unknown Time";

    return date.toLocaleString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/Vancouver'
    });
}
