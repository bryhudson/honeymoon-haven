const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
const { sendGmail, gmailSecrets } = require("../helpers/email");
const { emailTemplates } = require("../helpers/emailTemplates");

// Ensure admin is initialized
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();
const { calculateDraftSchedule, getShareholderOrder } = require("../helpers/shareholders");

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
exports.onBookingChangeTrigger = onDocumentWritten({ document: "bookings/{bookingId}", secrets: gmailSecrets }, async (event) => {
    logger.info("TRIGGER FIRED: onBookingChangeTrigger", { eventId: event.id });
    const snapshot = event.data;
    if (!snapshot) {
        return; // Deletion event, ignore for now or handle cancellations if needed
    }

    const beforeData = snapshot.before.data();
    const afterData = snapshot.after.data();
    const bookingId = event.params.bookingId;

    // Detect Status Changes
    const wasConfirmed = beforeData?.status === 'confirmed';
    const isConfirmed = afterData?.status === 'confirmed';

    const wasCancelled = beforeData?.status === 'cancelled';
    const isCancelled = afterData?.status === 'cancelled';

    // Allow 'pass' to be a status OR a booking type 'pass' logic? 
    // Usually 'Pass' is a document creation with type='pass'. 
    // Let's assume creating a doc with type='pass' OR changing status to 'passed' triggers it.
    const isPassType = afterData?.type === 'pass';
    const wasPassType = beforeData?.type === 'pass';
    const isNewPass = !wasPassType && isPassType;

    // 1. Booking Confirmation Email (To Current User)
    if (!wasConfirmed && isConfirmed) {
        logger.info(`Sending Booking Confirmation for ${bookingId}`);
        const userProfile = await getUserProfile(afterData.uid);

        const templateData = {
            ...SEASON_CONFIG,
            name: userProfile.displayName,
            check_in: formatDate(afterData.checkInDate),
            check_out: formatDate(afterData.checkOutDate),
            cabin_number: afterData.cabinId,
            guests: afterData.guests || 1,
            nights: afterData.nights || 0,
            total_price: afterData.totalPrice,
            dashboard_url: "https://honeymoon-haven.web.app/dashboard"
        };

        const { subject, htmlContent } = emailTemplates.bookingConfirmed(templateData);

        try {
            await sendGmail({
                to: { name: userProfile.displayName || "Shareholder", email: userProfile.email },
                subject: subject,
                htmlContent: htmlContent
            });
        } catch (error) {
            logger.error(`Failed to send confirmation for ${bookingId}`, error);
        }
    }

    // 2. Booking Cancellation Email (To Current User)
    if (!wasCancelled && isCancelled) {
        logger.info(`Sending Booking Cancellation for ${bookingId}`);
        const userProfile = await getUserProfile(afterData.uid);

        const templateData = {
            name: userProfile.displayName,
            check_in: formatDate(afterData.checkInDate),
            check_out: formatDate(afterData.checkOutDate),
            cabin_number: afterData.cabinId,
            cancelled_date: formatDate(new Date().toISOString()),
            within_turn_window: false,
            next_shareholder: "Next Shareholder",
            dashboard_url: "https://honeymoon-haven.web.app/dashboard"
        };

        const { subject, htmlContent } = emailTemplates.bookingCancelled(templateData);

        try {
            await sendGmail({
                to: { name: userProfile.displayName || "Shareholder", email: userProfile.email },
                subject: subject,
                htmlContent: htmlContent
            });
        } catch (error) {
            logger.error(`Failed to send cancellation for ${bookingId}`, error);
        }
    }

    // 3. Notify NEXT Shareholder (On Confirm, Cancel, or Pass)
    // Any of these actions ends the current turn, so we must notify the next person immediately.
    const turnEnded = (!wasConfirmed && isConfirmed) || (!wasCancelled && isCancelled) || isNewPass;

    if (turnEnded) {
        logger.info(`Turn Ended detected. Calling notifyNextShareholder...`);
        // Pass the CURRENT snapshot to ensure we use the latest data, 
        // mitigating Firestore eventual consistency delays.
        await notifyNextShareholder(snapshot.after);
    } else {
        logger.info(`Turn NOT ended. Flags: wasConfirmed=${wasConfirmed}, isConfirmed=${isConfirmed}, isNewPass=${isNewPass}`);
    }
});

/**
 * Shared Logic: Identify and Notify Next Shareholder
 * Calculates the schedule based on ALL bookings and sends an email to the active picker.
 * @param {admin.firestore.DocumentSnapshot} [triggerSnapshot] - Optional: The latest booking doc that triggered this.
 */
async function notifyNextShareholder(triggerSnapshot = null) {
    try {
        logger.info("Turn Ended. Calculating Next Shareholder for Notification...");

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
        const schedule = calculateDraftSchedule(
            allBookings,
            settings.draftStartDate?.toDate(),
            settings.bypassTenAM,
            settings.fastTestingMode
        );

        const nextPickerName = schedule.activePicker;

        if (nextPickerName) {
            logger.info(`Next Picker Identified: ${nextPickerName}`);

            // 3. Get Next Shareholder Email
            const nextUserQuery = await db.collection("shareholders").where("name", "==", nextPickerName).limit(1).get();
            if (!nextUserQuery.empty) {
                const nextUser = nextUserQuery.docs[0].data();
                const nextEmail = nextUser.email;

                // 4. Send Email
                const emailParams = {
                    name: nextPickerName,
                    previous_shareholder: "Previous Shareholder", // Could infer, but keeping simple
                    deadline_date: formatDate(schedule.windowEnds),
                    deadline_time: formatTime(schedule.windowEnds),
                    round: schedule.round,
                    phase: schedule.phase
                };

                const { subject: nextSubject, htmlContent: nextHtml } = emailTemplates.turnPassedNext(emailParams);

                const recipient = isTestMode ? "bryan.m.hudson@gmail.com" : nextEmail;
                const finalSubject = isTestMode ? `[TEST] ${nextSubject}` : nextSubject;

                await sendGmail({
                    to: { name: nextPickerName, email: recipient },
                    subject: finalSubject,
                    htmlContent: nextHtml
                });
                logger.info(`Turn Passed Notification sent to ${nextPickerName} (${recipient})`);
            } else {
                logger.warn(`Next picker ${nextPickerName} not found in shareholders collection.`);
            }
        } else {
            logger.info("No next picker found (Draft complete or paused).");
        }

    } catch (err) {
        logger.error("Failed to notify next shareholder", err);
    }
}

/**
 * 2. Scheduled Trigger: Daily Reminders
 * Runs every day at 9am to check for deadlines.
 */
exports.checkDailyReminders = onSchedule({ schedule: "every day 09:00", secrets: gmailSecrets }, async (event) => {
    logger.info("Running Daily Reminder Check");
    logger.info("Daily reminder check completed (logic pending database schema confirmation)");
    return;
});

// Helper to get user profile
async function getUserProfile(uid) {
    if (!uid) return { displayName: "Shareholder", email: "bryan.m.hudson@gmail.com" };
    const doc = await db.collection("users").doc(uid).get();
    return doc.data() || {};
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
            replyTo: request.auth.token.email
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

    return date.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(input) {
    const date = toDate(input);
    if (!date || isNaN(date.getTime())) return "Unknown Time";

    return date.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}
