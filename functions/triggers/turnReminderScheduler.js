const { onSchedule } = require("firebase-functions/v2/scheduler");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
const { sendGmail, gmailSecrets } = require("../helpers/email");
const { emailTemplates } = require("../helpers/emailTemplates");
const { normalizeName } = require("../helpers/shareholders");

// Ensure admin is initialized
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();

// --- PST TIMEZONE HELPER ---
// CRITICAL: All reminder times must be calculated in Pacific Time (America/Los_Angeles)
// This helper correctly handles DST transitions (PST = UTC-8, PDT = UTC-7)

/**
 * Get a Date object representing a specific hour in Pacific Time.
 * @param {Date} baseDate - The reference date
 * @param {number} targetHour - The target hour in 24h format (e.g., 19 for 7 PM)
 * @param {number} daysOffset - Days to add/subtract from baseDate (0 = same day)
 * @returns {Date} - A Date object representing the target time in PT
 */
function getTargetPstTime(baseDate, targetHour, daysOffset = 0) {
    // 1. Get the date components in Pacific Time
    const adjustedDate = new Date(baseDate);
    adjustedDate.setDate(adjustedDate.getDate() + daysOffset);

    // 2. Get year/month/day in PT for the target date
    const ptParts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
    }).formatToParts(adjustedDate);

    const year = parseInt(ptParts.find(p => p.type === 'year').value);
    const month = parseInt(ptParts.find(p => p.type === 'month').value);
    const day = parseInt(ptParts.find(p => p.type === 'day').value);

    // 3. Start with a guess: targetHour + 8 hours (PST offset)
    // We'll refine this based on actual PT hour
    const guess = new Date(Date.UTC(year, month - 1, day, targetHour + 8, 0, 0, 0));

    // 4. Check what hour this actually is in PT
    const checkParts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        hour: 'numeric',
        hour12: false
    }).formatToParts(guess);
    const actualHour = parseInt(checkParts.find(p => p.type === 'hour').value);

    // 5. Adjust if needed (handles DST: PDT is UTC-7, PST is UTC-8)
    if (actualHour !== targetHour) {
        const correction = targetHour - actualHour;
        guess.setUTCHours(guess.getUTCHours() + correction);
    }

    return guess;
}

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
            const isTestMode = settings.isTestMode !== false; // Default to true for safety

            // 3. Get shareholder email (Robust Lookup)
            // Fetch all (only ~12) and find via normalized name to handle "&" vs "and" mismatch
            const allShareholdersSnap = await db.collection("shareholders").get();
            const shareholderDoc = allShareholdersSnap.docs.find(d =>
                normalizeName(d.data().name) === normalizeName(activePicker)
            );

            if (!shareholderDoc) {
                logger.error(`Shareholder not found: ${activePicker} (Normalized: ${normalizeName(activePicker)})`);
                return;
            }

            const shareholder = shareholderDoc.data();
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
                logger.info("New turn detected, checking for Early Access vs Official Start...");

                // CRITICAL: Determine which template to use based on isGracePeriod
                const isGrace = draftStatus.isGracePeriod === true;
                await sendTurnStartEmail(shareholderEmail, activePicker, turnEnd, round, phase, isTestMode, cabinNumber, isGrace);

                // Update notification log
                await notificationLogRef.set({
                    shareholderName: activePicker,
                    round: round,
                    phase: phase,
                    turnStartTime: admin.firestore.Timestamp.fromDate(turnStart),
                    lastTurnStartSent: admin.firestore.Timestamp.now(),
                    isEarlyAccess: isGrace // Log it for auditing
                }, { merge: true });

                return;
            }

            // 6. Send reminders based on 48-hour schedule
            await handleNormalModeReminders(
                now, turnStart, turnEnd, shareholderEmail, activePicker,
                notificationLog, notificationLogRef, round, phase, isTestMode, cabinNumber
            );

        } catch (error) {
            logger.error("Error in turn reminder scheduler:", error);
        }

        logger.info("=== Turn Reminder Scheduler Completed ===");
    }
);

/**
 * Handle Normal Mode Reminders (48-hour windows)
 * Send at: 7 PM Day 1, 9 AM Day 2, 7 PM Day 2, 6 AM Final Day, 9 AM Final Day
 * All times anchored to Pacific Time (America/Los_Angeles)
 */
async function handleNormalModeReminders(
    now, turnStart, turnEnd, email, shareholderName,
    notificationLog, notificationLogRef, round, phase, isTestMode, cabinNumber
) {
    // Calculate specific reminder times using PST-aware helper
    // This handles DST automatically (PST = UTC-8, PDT = UTC-7)

    // Day 1: 7 PM PST (same day as turn start)
    const sameDayEvening = getTargetPstTime(turnStart, 19, 0);

    // Day 2: 9 AM PST
    const nextDayMorning = getTargetPstTime(turnStart, 9, 1);

    // Day 2: 7 PM PST
    const nextDayEvening = getTargetPstTime(turnStart, 19, 1);

    // Final Day: 6 AM PST (4 hours before 10 AM deadline)
    const finalMorning6am = getTargetPstTime(turnEnd, 6, 0);

    // Final Day: 9 AM PST (1 hour before 10 AM deadline)
    const finalMorning9am = getTargetPstTime(turnEnd, 9, 0);

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
async function sendTurnStartEmail(email, shareholderName, deadline, round, phase, isTestMode, cabinNumber, isGrace = false) {
    const templateData = {
        name: shareholderName,
        round: round,
        phase: phase,
        deadline_date: formatDeadlineDate(deadline),
        deadline_time: formatDeadlineTime(deadline),
        dashboard_url: "https://hhr-trailer-booking.web.app/dashboard"
    };

    // CRITICAL: Use the Early Access (Bonus Time) template if in grace period
    const emailFunction = isGrace ? emailTemplates.turnPassedNext : emailTemplates.turnStarted;
    const { subject, htmlContent } = emailFunction(templateData);

    // SAFETY: We pass the REAL recipient. 
    // The 'sendGmail' helper will check 'isTestMode' and intercept it if necessary.
    const recipient = email;
    const finalSubject = subject;

    await sendGmail({
        to: { name: shareholderName, email: recipient, cabinNumber },
        subject: finalSubject,
        htmlContent: htmlContent
    });

    logger.info(`Turn start email (${isGrace ? 'EARLY ACCESS' : 'STANDARD'}) sent to: ${recipient}`);
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
    // HHR TIMING ANCHOR RULE: All deadlines are at 10:00 AM PT
    // Regardless of actual stored time, we display the official anchor
    // See: .agent/rules/timezone_standard.md
    return "10:00 AM";
}
