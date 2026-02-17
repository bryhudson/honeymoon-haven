const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
const { sendGmail, gmailSecrets } = require("../helpers/email");
const { emailTemplates } = require("../helpers/emailTemplates");
const { defineSecret } = require("firebase-functions/params");

const superAdminEmail = defineSecret("SUPER_ADMIN_EMAIL");

// Ensure admin is initialized
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();

/**
 * Force Send Notification
 * DANGER: This bypasses Test Mode and sends real emails to shareholders.
 * Used by Admin to recover from failed/skipped notifications.
 */
exports.forceSendNotification = onCall({ secrets: [gmailSecrets[0], gmailSecrets[1], superAdminEmail] }, async (request) => {
    // 1. Security: Only Super Admin (Strict)
    if (!request.auth || request.auth.token.email !== superAdminEmail.value()) {
        throw new HttpsError('permission-denied', 'Only the Super Admin can force send notifications.');
    }

    const { targetShareholder, notificationType, round } = request.data;

    if (!targetShareholder || typeof targetShareholder !== 'string' || targetShareholder.length > 100) {
        throw new HttpsError('invalid-argument', 'Valid target shareholder name is required.');
    }
    if (!notificationType || typeof notificationType !== 'string') {
        throw new HttpsError('invalid-argument', 'Notification type is required.');
    }

    logger.warn(`FORCE SEND INITIATED: ${notificationType} to ${targetShareholder} by ${request.auth.token.email}`);

    try {
        // 2. Fetch Shareholder Email (Real)
        const shareholderQuery = await db.collection("shareholders")
            .where("name", "==", targetShareholder)
            .limit(1)
            .get();

        if (shareholderQuery.empty) {
            throw new HttpsError('not-found', `Shareholder not found: ${targetShareholder}`);
        }

        const shareholder = shareholderQuery.docs[0].data();
        const realEmail = shareholder.email;

        // 3. Construct Data (Best Effort based on Current State)
        const statusDoc = await db.collection("status").doc("draftStatus").get();
        const statusData = statusDoc.exists ? statusDoc.data() : { windowEnds: null };

        // Calculate deadline (fallback to +48h if missing, though risky for force send?)
        // If we force send, we probably want to match the *actual* deadline in DB.
        const deadlineDateObj = statusData.windowEnds ? statusData.windowEnds.toDate() : new Date(Date.now() + 48 * 60 * 60 * 1000);

        // MAP Frontend Types -> Template Types
        let templateType = 'morning'; // Default fallback
        if (notificationType === 'evening') templateType = 'evening';
        if (notificationType === 'day2') templateType = 'day2';
        if (notificationType === 'evening2') templateType = 'day2evening';
        if (notificationType === 'final6am') templateType = '4 hours';
        if (notificationType === 'final9am') templateType = '1 hour';

        const emailData = {
            name: targetShareholder,
            round: round || statusData.round || 1, // Allow override or fetch
            phase: statusData.phase || 'ROUND_1',
            type: templateType,
            hours_remaining: Math.round((deadlineDateObj - Date.now()) / (1000 * 60 * 60)),
            deadline_date: deadlineDateObj.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/Vancouver' }),
            deadline_time: '10:00 AM', // HHR anchor: Always 10 AM PT
            status_message: "Admin manually triggered this notification.",
            urgency_message: notificationType === 'urgent' ? "⚠️ URGENT REMINDER" : "Friendly Reminder",
            dashboard_url: "https://hhr-trailer-booking.web.app/"
        };

        // 4. Select Template
        let templateFn;
        switch (notificationType) {
            case 'turnStarted': templateFn = emailTemplates.turnStarted; break;
            case 'evening':
            case 'day2':
            case 'evening2':
            case 'final6am':
                templateFn = emailTemplates.reminder;
                break;
            case 'urgent':
            case 'final9am':
                templateFn = emailTemplates.finalWarning;
                break;
            case 'autoPassCurrent':
                templateFn = emailTemplates.autoPassCurrent;
                break;
            default:
                throw new HttpsError('invalid-argument', `Unknown notification type: ${notificationType}`);
        }

        const { subject, htmlContent } = templateFn(emailData);

        // 5. SEND TO REAL EMAIL (Respects Test Mode)
        await sendGmail({
            to: { name: targetShareholder, email: realEmail },
            subject: subject,
            htmlContent: htmlContent
            // bypassTestMode removed: let sendGmail check DB settings for safety
        });

        // 6. Log the Force Action
        const logId = `${targetShareholder}-${emailData.round}`;
        const logUpdate = {};

        // Map type to log key
        if (notificationType === 'turnStarted') logUpdate.lastTurnStartSent = admin.firestore.Timestamp.now();
        if (notificationType === 'evening') logUpdate.sameDayEveningSent = admin.firestore.Timestamp.now();
        if (notificationType === 'day2') logUpdate.nextDayMorningSent = admin.firestore.Timestamp.now();
        if (notificationType === 'evening2') logUpdate.nextDayEveningSent = admin.firestore.Timestamp.now();
        if (notificationType === 'final6am') logUpdate.finalMorning6amSent = admin.firestore.Timestamp.now();
        if (notificationType === 'final9am') logUpdate.finalMorning9amSent = admin.firestore.Timestamp.now();

        logUpdate.forceSentBy = request.auth.token.email;
        logUpdate.forceSentAt = admin.firestore.Timestamp.now();

        await db.collection("notification_log").doc(logId).set(logUpdate, { merge: true });

        return { success: true, message: `Force sent ${notificationType} to ${realEmail}` };

    } catch (error) {
        logger.error("Force Send Failed", error);
        throw new HttpsError('internal', error.message);
    }
});
