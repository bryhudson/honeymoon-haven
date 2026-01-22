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
 * Manual Test Email Trigger
 * Allows admins to send test emails from Notifications tab
 */
exports.sendTestEmail = onCall({ secrets: gmailSecrets }, async (request) => {
    // 1. Security: Only Super Admin
    if (!request.auth || request.auth.token.email !== 'bryan.m.hudson@gmail.com') {
        throw new HttpsError('permission-denied', 'Only the Super Admin can send test emails.');
    }

    const { emailType, targetShareholder } = request.data;

    if (!emailType) {
        throw new HttpsError('invalid-argument', 'Email type is required.');
    }

    try {
        // 2. Get target shareholder or use current active picker
        let shareholderName = targetShareholder;
        let shareholderEmail;

        if (!shareholderName) {
            // Get current active picker
            const statusDoc = await db.collection("status").doc("draftStatus").get();
            if (!statusDoc.exists || !statusDoc.data().activePicker) {
                throw new HttpsError('failed-precondition', 'No active picker and no target specified.');
            }
            shareholderName = statusDoc.data().activePicker;
        }

        // 3. Get shareholder email
        const shareholderQuery = await db.collection("shareholders")
            .where("name", "==", shareholderName)
            .limit(1)
            .get();

        if (shareholderQuery.empty) {
            throw new HttpsError('not-found', `Shareholder not found: ${shareholderName}`);
        }

        shareholderEmail = shareholderQuery.docs[0].data().email;

        // 4. Get test mode setting
        const settingsDoc = await db.collection("settings").doc("general").get();
        const isTestMode = settingsDoc.exists ? (settingsDoc.data().isTestMode !== false) : true;

        // 5. Prepare test email data
        const testData = {
            name: shareholderName,
            round: 1,
            phase: 'ROUND_1',
            deadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toLocaleString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            }),
            status_message: "This is a test email.",
            urgency_message: "Testing the email notification system.",
            dashboard_url: "https://hhr-trailer-booking.web.app/dashboard"
        };

        // 6. Select appropriate template and send
        let subject, htmlContent;

        switch (emailType) {
            case 'turnStarted':
                ({ subject, htmlContent } = emailTemplates.turnStarted(testData));
                break;
            case 'reminder':
                ({ subject, htmlContent } = emailTemplates.reminder(testData));
                break;
            case 'finalWarning':
                ({ subject, htmlContent } = emailTemplates.finalWarning(testData));
                break;
            case 'bonusTime':
                // Bonus time template (will create if needed)
                subject = "🎁 Bonus Time! Early Access to Your Turn";
                htmlContent = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2>Great News, ${shareholderName}!</h2>
                        <p>The previous shareholder finished early, so you get a head start!</p>
                        <p><strong>Bonus Time:</strong> You can book now</p>
                        <p><strong>Official 48-hour window starts:</strong> Tomorrow at 10:00 AM</p>
                        <p><a href="${testData.dashboard_url}" style="background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Book Now</a></p>
                    </div>
                `;
                break;
            default:
                throw new HttpsError('invalid-argument', `Unknown email type: ${emailType}`);
        }

        // 7. Apply test mode override
        const recipient = isTestMode ? "bryan.m.hudson@gmail.com" : shareholderEmail;
        const finalSubject = `[TEST EMAIL] ${subject}`;

        await sendGmail({
            to: { name: shareholderName, email: recipient },
            subject: finalSubject,
            htmlContent: htmlContent
        });

        logger.info(`Test email sent: ${emailType} to ${recipient}`);

        return {
            success: true,
            message: `Test email "${emailType}" sent to ${recipient}`,
            recipient: recipient,
            emailType: emailType
        };

    } catch (error) {
        logger.error("Failed to send test email:", error);
        throw new HttpsError('internal', `Failed to send test email: ${error.message}`);
    }
});
