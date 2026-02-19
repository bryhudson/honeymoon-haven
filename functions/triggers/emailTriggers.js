const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentWritten, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");

const superAdminEmail = defineSecret("SUPER_ADMIN_EMAIL");
const { sendGmail, gmailSecrets } = require("../helpers/email");
const { emailTemplates } = require("../helpers/emailTemplates");

// Ensure admin is initialized
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();
const { calculateDraftSchedule, getShareholderOrder, normalizeName } = require("../helpers/shareholders");

// --- Constants ---
const SEASON_CONFIG = {
    season_year: "2026",
    season_start: "April 3",
    season_end: "Oct 12"
};

/**
 * 1. Database Trigger: Monitor Booking Changes
 * Listens for changes in the 'bookings' collection.
 */
exports.onBookingChangeTrigger = onDocumentWritten({ document: "bookings/{bookingId}", secrets: [gmailSecrets[0], gmailSecrets[1], superAdminEmail] }, async (event) => {
    logger.info("TRIGGER FIRED: onBookingChangeTrigger", { eventId: event.id });
    const snapshot = event.data;
    if (!snapshot) {
        return; // Deletion event, ignore for now or handle cancellations if needed
    }

    const beforeData = snapshot.before.data();
    const afterData = snapshot.after.data();
    const bookingId = event.params.bookingId;

    // --- SERVER-SIDE OVERLAP DETECTION ---
    // Prevent double-bookings by checking if a new/updated booking overlaps existing ones
    const isNewBooking = !beforeData && afterData;
    const isNewlyFinalized = !beforeData?.isFinalized && afterData?.isFinalized;
    if ((isNewBooking || isNewlyFinalized) && afterData?.from && afterData?.to && afterData?.type !== 'pass' && afterData?.type !== 'cancelled' && afterData?.type !== 'auto-pass') {
        try {
            const newFrom = toDate(afterData.from);
            const newTo = toDate(afterData.to);
            if (newFrom && newTo) {
                const allBookingsSnap = await db.collection("bookings").get();
                const overlap = allBookingsSnap.docs.find(d => {
                    if (d.id === bookingId) return false;
                    const b = d.data();
                    if (b.type === 'pass' || b.type === 'cancelled' || b.type === 'auto-pass') return false;
                    const bFrom = toDate(b.from);
                    const bTo = toDate(b.to);
                    if (!bFrom || !bTo) return false;
                    return newFrom < bTo && newTo > bFrom;
                });
                if (overlap) {
                    logger.warn(`OVERLAP DETECTED: Booking ${bookingId} overlaps with ${overlap.id}. Auto-cancelling.`);
                    await db.collection("bookings").doc(bookingId).update({
                        type: 'cancelled',
                        cancelledAt: admin.firestore.Timestamp.now(),
                        cancelReason: `Auto-cancelled: overlaps with booking ${overlap.id}`
                    });
                    return; // Stop processing — booking is cancelled
                }
            }
        } catch (overlapErr) {
            logger.error("Overlap check failed (non-blocking):", overlapErr);
        }
    }

    // Detect Status Changes
    const wasConfirmed = beforeData?.status === 'confirmed' || beforeData?.isFinalized === true;
    const isConfirmed = afterData?.status === 'confirmed' || afterData?.isFinalized === true;

    const wasCancelled = beforeData?.status === 'cancelled' || beforeData?.type === 'cancelled';
    const isCancelled = afterData?.status === 'cancelled' || afterData?.type === 'cancelled';

    // Allow 'pass' to be a status OR a booking type 'pass' logic? 
    // Usually 'Pass' is a document creation with type='pass'. 
    // Let's assume creating a doc with type='pass' OR changing status to 'passed' triggers it.
    const isPassType = afterData?.type === 'pass';
    const wasPassType = beforeData?.type === 'pass';
    const isNewPass = !wasPassType && isPassType;

    // Fetch Current Draft Status once for all emails
    const statusDoc = await db.collection("status").doc("draftStatus").get();
    const statusData = statusDoc.exists ? statusDoc.data() : { round: 1, phase: 'ROUND_1' };
    const currentRound = statusData.round || 1;

    // 1. Booking Confirmation Email (To Current User)
    if (!wasConfirmed && isConfirmed) {
        logger.info(`Sending Booking Confirmation for ${bookingId}`);
        const userProfile = await getUserProfile(afterData.uid, afterData.shareholderName);

        const templateData = {
            ...SEASON_CONFIG,
            name: afterData.shareholderName || userProfile.displayName || userProfile.name || "Shareholder",
            check_in: formatDate(afterData.from || afterData.checkInDate),
            check_out: formatDate(afterData.to || afterData.checkOutDate),
            cabin_number: afterData.cabinNumber || afterData.cabinId || "TBD",
            guests: afterData.guests || 1,
            nights: afterData.nights || calculateNights(afterData.from || afterData.checkInDate, afterData.to || afterData.checkOutDate),
            total_price: afterData.totalPrice,
            price_breakdown: afterData.priceBreakdown, // New field
            round: currentRound,
            phase: statusData.phase || 'ROUND_1',
            dashboard_url: "https://honeymoon-haven.web.app/dashboard"
        };

        const { subject, htmlContent } = emailTemplates.bookingConfirmed(templateData);

        try {
            await sendGmail({
                to: { name: afterData.shareholderName || userProfile.displayName || userProfile.name || "Shareholder", email: userProfile.email },
                subject: subject,
                htmlContent: htmlContent,
                templateId: 'bookingConfirmed'
            });
        } catch (error) {
            logger.error(`Failed to send confirmation for ${bookingId}`, error);
        }

        // LOGGING
        if (afterData.shareholderName) {
            const logId = `${afterData.shareholderName}-${currentRound}`;
            await db.collection("notification_log").doc(logId).set({
                bookingConfirmedSent: admin.firestore.Timestamp.now(),
                bookingId: bookingId
            }, { merge: true });
        }
    }

    // 2. Booking Cancellation Email (To Current User)
    if (!wasCancelled && isCancelled) {
        logger.info(`Sending Booking Cancellation for ${bookingId}`);
        const userProfile = await getUserProfile(afterData.uid, afterData.shareholderName);

        const templateData = {
            name: afterData.shareholderName || userProfile.displayName || userProfile.name || "Shareholder",
            check_in: formatDate(afterData.from || afterData.checkInDate),
            check_out: formatDate(afterData.to || afterData.checkOutDate),
            cabin_number: afterData.cabinNumber || afterData.cabinId || "TBD",
            cancelled_date: formatDate(new Date().toISOString()),
            round: currentRound,
            phase: statusData.phase || 'ROUND_1',
            within_turn_window: false,
            next_shareholder: "Next Shareholder",
            dashboard_url: "https://honeymoon-haven.web.app/dashboard"
        };

        const { subject, htmlContent } = emailTemplates.bookingCancelled(templateData);

        try {
            await sendGmail({
                to: { name: afterData.shareholderName || userProfile.displayName || "Shareholder", email: userProfile.email },
                subject: subject,
                htmlContent: htmlContent,
                templateId: 'bookingCancelled'
            });
        } catch (error) {
            logger.error(`Failed to send cancellation for ${bookingId}`, error);
        }

        // LOGGING
        if (afterData.shareholderName) {
            const logId = `${afterData.shareholderName}-${currentRound}`;
            await db.collection("notification_log").doc(logId).set({
                bookingCancelledSent: admin.firestore.Timestamp.now(),
                bookingId: bookingId
            }, { merge: true });
        }
    }

    // 2b. Pass Confirmation Email (To Current User)
    if (isNewPass) {
        logger.info(`Sending Pass Confirmation for ${bookingId}`);
        const userProfile = await getUserProfile(afterData.uid, afterData.shareholderName);

        // Logic for Next Opportunity Message
        const statusDoc = await db.collection("status").doc("draftStatus").get();
        const statusData = statusDoc.exists ? statusDoc.data() : { phase: 'ROUND_1', round: 1 };

        const isRound1 = statusData.phase === 'ROUND_1' || statusData.round === 1;
        const nextTitle = isRound1 ? "ROUND 2 (SNAKE DRAFT)" : "OPEN SEASON BOOKING";
        const nextText = isRound1
            ? "Your next opportunity to book will be in Round 2 (Snake Draft), which begins after Round 1 concludes. The order will be reversed for the second round."
            : "Don't worry - you can still book during our open season! Once all shareholders have had their turn, any remaining dates will be available on a first-come, first-served basis.";

        const { subject, htmlContent } = emailTemplates.turnPassedCurrent({
            name: afterData.shareholderName || userProfile.displayName || "Shareholder",
            next_opportunity_title: nextTitle,
            next_opportunity_text: nextText
        });

        try {
            await sendGmail({
                to: { name: afterData.shareholderName || userProfile.displayName || "Shareholder", email: userProfile.email },
                subject: subject,
                htmlContent: htmlContent,
                templateId: 'passConfirmed'
            });
        } catch (error) {
            logger.error(`Failed to send pass confirmation for ${bookingId}`, error);
        }

        // LOGGING
        if (afterData.shareholderName) {
            const round = statusData.round || 1;
            const logId = `${afterData.shareholderName}-${round}`;
            await db.collection("notification_log").doc(logId).set({
                passConfirmedSent: admin.firestore.Timestamp.now()
            }, { merge: true });
        }
    }

    // 2c. Payment Received Email (New Trigger)
    const wasPaid = beforeData?.isPaid === true;
    const isPaid = afterData?.isPaid === true;

    if (!wasPaid && isPaid) {
        logger.info(`Sending Payment Received Confirmation for ${bookingId}`);
        const userProfile = await getUserProfile(afterData.uid, afterData.shareholderName);

        const templateData = {
            name: afterData.shareholderName || userProfile.displayName || "Shareholder",
            booking_ref: bookingId,
            amount: afterData.totalPrice || "0",
            check_in: formatDate(afterData.from || afterData.checkInDate),
            check_out: formatDate(afterData.to || afterData.checkOutDate),
            cabin_number: afterData.cabinNumber || afterData.cabinId || "TBD",
            round: currentRound,
            phase: statusData.phase || 'ROUND_1',
            dashboard_url: "https://honeymoon-haven.web.app/dashboard"
        };

        const { subject, htmlContent } = emailTemplates.paymentReceived(templateData);

        try {
            await sendGmail({
                to: { name: afterData.shareholderName || userProfile.displayName || "Shareholder", email: userProfile.email },
                subject: subject,
                htmlContent: htmlContent,
                templateId: 'paymentReceived'
            });
            logger.info(`Payment confirmation sent to ${userProfile.email}`);
        } catch (error) {
            logger.error(`Failed to send payment confirmation for ${bookingId}`, error);
        }
    }

    // 3. Notify NEXT Shareholder (On Confirm, Cancel, or Pass)
    // Any of these actions ends the current turn, so we must notify the next person immediately.
    const turnEnded = (!wasConfirmed && isConfirmed) || (!wasCancelled && isCancelled) || isNewPass;

    if (turnEnded) {
        let reason = 'completed'; // Default: User made a booking
        if (isNewPass) reason = 'passed';
        // Note: Cancellation effectively acts as a 'pass' or 'completed' depending on context,
        // but since the template for cancellation implies 'turn passed', let's use 'passed' for now
        // or keep 'completed' which sends the robust "It's Your Turn" email. 
        // Given 'bookingCancelled' template handles the "Previous User Cancelled" context within ITSELF (sent to the canceller),
        // the NEXT user just wants to know "It's Your Turn". 
        // 'turnStarted' (completed) is the most generic/welcoming one.
        // 'turnPassedNext' explicitly says "Previous User Passed". 
        // If I cancel, I am effectively passing. Let's stick with 'completed' (standard welcome) 
        // UNLESS it's an explicit pass type.

        logger.info(`Turn Ended detected. Calling notifyNextShareholder with reason: ${reason}...`);
        await notifyNextShareholder(snapshot.after, reason);
    } else {
        logger.info(`Turn NOT ended. Flags: wasConfirmed=${wasConfirmed}, isConfirmed=${isConfirmed}, isNewPass=${isNewPass}`);
        logger.info(`Debug Values: BeforeStatus=${beforeData?.status}, AfterStatus=${afterData?.status}, BeforeType=${beforeData?.type}, AfterType=${afterData?.type}`);
    }
});

/**
 * Shared Logic: Identify and Notify Next Shareholder
 * Calculates the schedule based on ALL bookings and sends an email to the active picker.
 * @param {admin.firestore.DocumentSnapshot} [triggerSnapshot] - Optional: The latest booking doc that triggered this.
 */
async function notifyNextShareholder(triggerSnapshot = null, reason = 'completed') {
    try {
        logger.info(`Turn Ended (Reason: ${reason}). Calculating Next Shareholder for Notification...`);

        // 1. Fetch necessary data
        const settingsDoc = await db.collection("settings").doc("general").get();
        const settings = settingsDoc.exists ? settingsDoc.data() : {};
        const isTestMode = settings.isTestMode !== false; // Default true

        const bookingsSnapshot = await db.collection("bookings").get();
        let allBookings = bookingsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: toDate(doc.data().createdAt),
            from: toDate(doc.data().from),
            to: toDate(doc.data().to)
        }));

        // MERGE TRIGGER DATA (Critical for Latency/Consistency)
        // If the trigger snapshot exists, force it into the array to ensure
        // the calculation sees the NEW booking immediately.
        if (triggerSnapshot && triggerSnapshot.exists) {
            const triggerId = triggerSnapshot.id;
            const triggerData = triggerSnapshot.data();

            // Remove any stale version of this doc from the query result
            allBookings = allBookings.filter(b => b.id !== triggerId);

            // Add the fresh version
            allBookings.push({
                id: triggerId,
                ...triggerData,
                createdAt: toDate(triggerData.createdAt),
                from: toDate(triggerData.from),
                to: toDate(triggerData.to)
            });
            logger.info(`Injected trigger booking ${triggerId} into calculation to ensure consistency.`);
        }

        // 2. Calculate Schedule
        const year = 2026;
        const shareholders = getShareholderOrder(year);

        const schedule = calculateDraftSchedule(
            shareholders,               // 1. Shareholders
            allBookings,                // 2. Bookings
            new Date(),                 // 3. Now
            settings.draftStartDate?.toDate(), // 4. Start Date Override
            settings.fastTestingMode,   // 5. Fast Mode
            settings.fastTestingMode,   // 5. Fast Mode
            false,  // 6. Strict 10AM (Enforce 'Next Day 10 AM' rule even if settings say bypass)
        );

        const nextPickerName = schedule.activePicker;

        if (nextPickerName) {
            logger.info(`Next Picker Identified: ${nextPickerName}`);

            // 3. Get Next Shareholder Email
            const nextUserQuery = await db.collection("shareholders").get();
            const nextUserDoc = nextUserQuery.docs.find(d => normalizeName(d.data().name) === normalizeName(nextPickerName));

            if (nextUserDoc) {
                const nextUser = nextUserDoc.data();
                const nextEmail = nextUser.email;

                // 4. Send Email
                const emailParams = {
                    name: nextPickerName,
                    previous_shareholder: "Previous Shareholder",
                    deadline_date: formatDate(schedule.windowEnds),
                    deadline_time: formatTime(schedule.windowEnds),
                    official_start_date: formatDate(schedule.officialStart), // FIX: Pass Official Start Date
                    official_start_time: formatTime(schedule.officialStart),
                    round: schedule.round,
                    phase: schedule.phase
                };

                // Select Template based on Reason
                let subject, htmlContent;

                if (reason === 'passed') {
                    // Previous user explicitly passed
                    ({ subject, htmlContent } = emailTemplates.turnPassedNext(emailParams));
                } else if (reason === 'timed_out') {
                    // Previous user timed out
                    ({ subject, htmlContent } = emailTemplates.autoPassNext(emailParams));
                } else {
                    // Default: 'completed' (Previous user booked)
                    ({ subject, htmlContent } = emailTemplates.turnStarted(emailParams));
                }

                try {
                    // [DUPLICATE FIX] Disabling this immediate email. 
                    // We will rely on turnReminderScheduler.js to send the "Turn Started" email.
                    logger.info(`[DEBOUNCE] Identifying next picker ${nextPickerName}, but waiting for Scheduler to send email to avoid duplicates.`);
                } catch (e) {
                    logger.error("Error in duplicate fix logic", e);
                }

            } else {
                logger.warn(`Next picker ${nextPickerName} not found in shareholders collection.`);
            }
        } else if (schedule.phase === 'OPEN_SEASON') {
            // DETECTED OPEN SEASON
            const seasonLogDoc = await db.collection("notification_log").doc("open_season_blast_2026").get();

            if (!seasonLogDoc.exists) {
                logger.info("Draft Complete! Initiating Open Season Blast...");

                // Get All Shareholders emails
                const allShareholders = await db.collection("shareholders").get();
                const recipients = allShareholders.docs.map(d => ({ name: d.data().name, email: d.data().email })).filter(r => r.email);

                // Prepare Email
                const { subject, htmlContent } = emailTemplates.openSeasonStarted({});

                // Send to each shareholder (or use BCC if we had a bulk sender, but individual is safer for deliverability here)
                const sendPromises = recipients.map(recipient =>
                    sendGmail({
                        to: recipient,
                        subject: subject,
                        htmlContent: htmlContent,
                        templateId: 'openSeasonBlast'
                    })
                        .catch(e => logger.error(`Failed to send Open Season email to ${recipient.email}`, e))
                );

                await Promise.all(sendPromises);

                // Mark log
                await db.collection("notification_log").doc("open_season_blast_2026").set({
                    sentAt: admin.firestore.Timestamp.now(),
                    recipientCount: recipients.length
                });

                logger.info(`Open Season Blast sent to ${recipients.length} shareholders.`);
            } else {
                logger.info("Open Season Blast already sent. Skipping.");
            }
        } else {
            logger.info("No next picker found (Draft complete or paused).");
        }

    } catch (err) {
        logger.error("Failed to notify next shareholder", err);
    }
}



// Helper to get user profile
async function getUserProfile(uid, shareholderName) {
    if (uid) {
        const doc = await db.collection("users").doc(uid).get();
        if (doc.exists) return doc.data();
    }

    // Fallback: Lookup by Shareholder Name
    if (shareholderName) {
        const query = await db.collection("shareholders").get();
        const doc = query.docs.find(d => normalizeName(d.data().name) === normalizeName(shareholderName));
        if (doc) return doc.data();
    }

    return { displayName: shareholderName || "Shareholder", email: superAdminEmail.value() };
}

/**
 * 3. Callable: Send Guest Guide Email
 */
exports.sendGuestGuideEmail = onCall({ secrets: gmailSecrets }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'You must be logged in to send emails.');
    }

    const { guestEmail, guestName, bookingDetails, shareholderName } = request.data;
    if (!guestEmail) {
        throw new HttpsError('invalid-argument', 'Guest email is required.');
    }

    const senderName = shareholderName || request.auth.token.name || "A HHR Shareholder";

    logger.info(`Sending Guest Guide to ${guestEmail} from ${senderName}. Details: ${JSON.stringify(bookingDetails)}`);

    const { subject, htmlContent } = emailTemplates.guestGuide({
        shareholder_name: senderName,
        guest_name: guestName || "Guest",
        booking_details: bookingDetails || {}
    });

    try {
        await sendGmail({
            to: { name: guestName || "Guest", email: guestEmail },
            subject: subject,
            htmlContent: htmlContent,
            senderName: senderName,
            replyTo: request.auth.token.email,
            templateId: 'guestGuide'
        });
        return { success: true, message: `Guest Guide sent to ${guestEmail}` };
    } catch (error) {
        logger.error("Failed to send Guest Guide:", error);
        throw new HttpsError('internal', 'Failed to send email.');
    }
});

// Simple Formatters
function toDate(input) {
    if (!input) return null;
    if (input.toDate) return input.toDate(); // Firestore Timestamp
    if (typeof input === 'string') return new Date(input);
    return input; // Already a Date or something else
}

function formatDate(input) {
    const date = toDate(input);
    if (!date || isNaN(date.getTime())) return "Unknown Date";

    return date.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: 'America/Vancouver'
    });
}

function formatTime(input) {
    // HHR TIMING ANCHOR RULE: All deadlines are at 10:00 AM PT
    // See: .agent/rules/timezone_standard.md
    return "10:00 AM";
}

function calculateNights(start, end) {
    const s = toDate(start);
    const e = toDate(end);
    if (!s || !e) return 0;
    const diff = e.getTime() - s.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * 4. Status Trigger: Turn Skipped Notification
 * Listens for changes in Active Picker (Draft Status) to detect Timeouts.
 * If the user changes BUT they didn't make a booking/pass (checked via logs), they were SKIPPED.
 */
exports.onDraftStatusChange = onDocumentUpdated({ document: "status/draftStatus", secrets: [gmailSecrets[0], gmailSecrets[1], superAdminEmail] }, async (event) => {
    logger.info("TRIGGER FIRED: onDraftStatusChange");

    const before = event.data.before.data();
    const after = event.data.after.data();

    if (!before || !after) return;

    const previousPicker = before.activePicker;
    const currentPicker = after.activePicker;

    // Only run if the turn has actually moved to someone else (or finished)
    if (previousPicker && previousPicker !== currentPicker) {
        logger.info(`Turn detected moving from ${previousPicker} to ${currentPicker || 'End of Draft'}`);

        // Check if previousPicker effectively passed (Timed Out) or manually acted
        // We look at the notification log for that user's turn
        const round = before.round || 1;
        const logId = `${previousPicker}-${round}`;

        const logDoc = await db.collection("notification_log").doc(logId).get();
        const logData = logDoc.exists ? logDoc.data() : {};

        // Did they act?
        const hasBooked = !!logData.bookingConfirmedSent;
        const hasPassed = !!logData.passConfirmedSent;
        const hasBeenSkippedAlready = !!logData.autoPassSent; // Anti-duplicate

        if (!hasBooked && !hasPassed && !hasBeenSkippedAlready) {
            logger.info(`🚨 TIMEOUT DETECTED: ${previousPicker} did not book or pass manually. Sending Skip Notification.`);

            // Get Email
            const userProfile = await getUserProfile(null, previousPicker);
            const email = userProfile.email;

            if (!email) {
                logger.error(`No email found for skipped user ${previousPicker}`);
                return;
            }

            // Prepare Email Data
            const templateData = {
                name: previousPicker,
                round: round, // Pass round so template can show "Round 2" vs "Open Season"
                phase: after.phase || 'ROUND_1',
                next_shareholder: currentPicker || "Next Shareholder",
                dashboard_url: "https://hhr-trailer-booking.web.app/dashboard"
            };

            const { subject, htmlContent } = emailTemplates.autoPassCurrent(templateData);

            try {
                await sendGmail({
                    to: { name: previousPicker, email: email },
                    subject: subject,
                    htmlContent: htmlContent,
                    templateId: 'turnSkipped'
                });

                // Mark log
                await db.collection("notification_log").doc(logId).set({
                    autoPassSent: admin.firestore.Timestamp.now(),
                    skippedAt: admin.firestore.Timestamp.now()
                }, { merge: true });

                logger.info(`Skipped notification sent to ${previousPicker}`);

            } catch (error) {
                logger.error(`Failed to send skipped notification to ${previousPicker}`, error);
            }

        } else {
            logger.info(`Turn moved naturally. Booked: ${hasBooked}, Passed: ${hasPassed}, AlreadySkipped: ${hasBeenSkippedAlready}`);
        }
    }
});
