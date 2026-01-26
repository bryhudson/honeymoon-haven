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

/**
 * Force Send Notification
 * DANGER: This bypasses Test Mode and sends real emails to shareholders.
 * Used by Admin to recover from failed/skipped notifications.
 */
exports.forceSendNotification = onCall({ secrets: gmailSecrets }, async (request) => {
    // 1. Security: Only Super Admin (Strict)
    if (!request.auth || request.auth.token.email !== 'bryan.m.hudson@gmail.com') {
        throw new HttpsError('permission-denied', 'Only the Super Admin can force send notifications.');
    }

    const { targetShareholder, notificationType, round } = request.data;

    if (!targetShareholder || !notificationType) {
        throw new HttpsError('invalid-argument', 'Target Shareholder and Notification Type are required.');
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

        const emailData = {
            name: targetShareholder,
            round: round || statusData.round || 1, // Allow override or fetch
            phase: statusData.phase || 'ROUND_1',
            type: ['day2', 'final'].includes(notificationType) ? 'morning' : 'evening', // Infer type
            hours_remaining: Math.round((deadlineDateObj - Date.now()) / (1000 * 60 * 60)),
            deadline_date: deadlineDateObj.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
            deadline_time: deadlineDateObj.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
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
            case 'final':
                templateFn = emailTemplates.reminder;
                break;
            case 'urgent': templateFn = emailTemplates.finalWarning; break;
            default:
                throw new HttpsError('invalid-argument', `Unknown notification type: ${notificationType}`);
        }

        const { subject, htmlContent } = templateFn(emailData);

        // 5. SEND TO REAL EMAIL (No Test Mode Check)
        await sendGmail({
            to: { name: targetShareholder, email: realEmail },
            subject: subject,
            htmlContent: htmlContent,
            bypassTestMode: true // Force Real Send
        });

        // 6. Log the Force Action
        const logId = `${targetShareholder}-${emailData.round}`;
        const logUpdate = {};

        // Map type to log key
        if (notificationType === 'turnStarted') logUpdate.lastTurnStartSent = admin.firestore.Timestamp.now();
        if (notificationType === 'evening') logUpdate.sameDayEveningSent = admin.firestore.Timestamp.now();
        if (notificationType === 'day2') logUpdate.nextDayMorningSent = admin.firestore.Timestamp.now();
        if (notificationType === 'final') logUpdate.lastDayMorningSent = admin.firestore.Timestamp.now();
        if (notificationType === 'urgent') logUpdate.twoHourWarningSent = admin.firestore.Timestamp.now();

        logUpdate.forceSentBy = request.auth.token.email;
        logUpdate.forceSentAt = admin.firestore.Timestamp.now();

        await db.collection("notification_log").doc(logId).set(logUpdate, { merge: true });

        return { success: true, message: `Force sent ${notificationType} to ${realEmail}` };

    } catch (error) {
        logger.error("Force Send Failed", error);
        throw new HttpsError('internal', error.message);
    }
});
