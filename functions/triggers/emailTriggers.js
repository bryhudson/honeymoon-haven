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
    const snapshot = event.data;
    if (!snapshot) {
        return; // Deletion event, ignore for now or handle cancellations if needed
    }

    const beforeData = snapshot.before.data();
    const afterData = snapshot.after.data();
    const bookingId = event.params.bookingId;

    // 1. Booking Created or Status Changed to 'confirmed'
    // Logic: If status changed to 'confirmed' OR (created as 'confirmed'?)
    const wasConfirmed = beforeData?.status === 'confirmed';
    const isConfirmed = afterData?.status === 'confirmed';

    if (!wasConfirmed && isConfirmed) {
        logger.info(`Sending Booking Confirmation for ${bookingId}`);
        // Prepare data for Template 5: Booking Confirmed
        const userProfile = await getUserProfile(afterData.uid);

        // Construct payload
        // Generate content locally
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

        const emailData = {
            to: { name: userProfile.displayName || "Shareholder", email: userProfile.email },
            subject: subject,
            htmlContent: htmlContent
        };

        // Call internal email helper
        try {
            await sendGmail(emailData);
        } catch (error) {
            logger.error(`Failed to send confirmation for ${bookingId}`, error);
        }
    }

    // 2. Booking Cancelled
    const wasCancelled = beforeData?.status === 'cancelled';
    const isCancelled = afterData?.status === 'cancelled';

    if (!wasCancelled && isCancelled) {
        logger.info(`Sending Booking Cancellation for ${bookingId}`);
        const userProfile = await getUserProfile(afterData.uid);

        // Generate content locally using the helper
        const templateData = {
            name: userProfile.displayName,
            check_in: formatDate(afterData.checkInDate),
            check_out: formatDate(afterData.checkOutDate),
            cabin_number: afterData.cabinId,
            cancelled_date: formatDate(new Date().toISOString()),
            within_turn_window: false, // Logic needed to determine this
            next_shareholder: "Next Shareholder", // Logic needed
            dashboard_url: "https://honeymoon-haven.web.app/dashboard"
        };

        const { subject, htmlContent } = emailTemplates.bookingCancelled(templateData);

        const emailData = {
            to: { name: userProfile.displayName || "Shareholder", email: userProfile.email },
            subject: subject,
            htmlContent: htmlContent
        };

        try {
            await sendGmail(emailData);
        } catch (error) {
            logger.error(`Failed to send cancellation for ${bookingId}`, error);
        }
    }
});

/**
 * 2. Scheduled Trigger: Daily Reminders
 * Runs every day at 9am to check for deadlines.
 */
exports.checkDailyReminders = onSchedule({ schedule: "every day 09:00", secrets: gmailSecrets }, async (event) => {
    logger.info("Running Daily Reminder Check");

    // 1. Get all bookings that are 'confirmed' but check-in is soon? 
    // Actually, the main use case for 'Daily Reminder' in the strategy (Template 2) is for the CURRENT TURN holder who hasn't booked yet.
    // "Friendly reminder that your booking window is still active."

    // We need to know who has the current turn.
    // Assuming there is a 'settings' doc or 'turn' collection.
    // For this MVP, let's look for a fake implementation or just log.
    // Real implementation requires reading the 'turns' collection.

    /* 
    const currentTurnSnapshot = await db.collection('turns').where('status', '==', 'active').limit(1).get();
    if (!currentTurnSnapshot.empty) {
        const turn = currentTurnSnapshot.docs[0].data();
        // check time remaining
        // send email
    }
    */
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
 * Allows a shareholder to send the guide to a guest.
 */
exports.sendGuestGuideEmail = onCall({ secrets: gmailSecrets }, async (request) => {
    // 1. Auth Check
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'You must be logged in to send emails.');
    }

    const { guestEmail, guestName } = request.data;
    if (!guestEmail) {
        throw new HttpsError('invalid-argument', 'Guest email is required.');
    }

    // 2. Get Shareholder Name
    const senderName = request.auth.token.name || "A HHR Shareholder";

    logger.info(`Sending Guest Guide to ${guestEmail} from ${senderName}`);

    // 3. Generate Content
    const { subject, htmlContent } = emailTemplates.guestGuide({
        shareholder_name: senderName,
        guest_name: guestName || "Guest"
    });

    // 4. Send Email
    try {
        await sendGmail({
            to: { name: guestName || "Guest", email: guestEmail },
            subject: subject,
            htmlContent: htmlContent,
            senderName: senderName,
            replyTo: request.auth.token.email // Set Reply-To to the logged-in user's email
        });
        return { success: true, message: `Guest Guide sent to ${guestEmail}` };
    } catch (error) {
        logger.error("Failed to send Guest Guide:", error);
        throw new HttpsError('internal', 'Failed to send email.');
    }
});

function formatDate(dateString) {
    // Simple formatter, improve as needed
    return dateString;
}
