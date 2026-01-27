const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const nodemailer = require("nodemailer");

// Define access to Gmail secrets
// Note: You must set these using `firebase functions:secrets:set GMAIL_EMAIL` etc.
const gmailEmail = defineSecret("GMAIL_EMAIL");
const gmailAppPassword = defineSecret("GMAIL_APP_PASSWORD");

/**
 * Sends an email via Gmail SMTP using Nodemailer.
 * 
 * @param {object} data
 * @param {object} data.to - { name: string, email: string }
 * @param {string} data.subject - Subject line
 * @param {string} data.htmlContent - HTML body
 * @returns {Promise<{success: boolean, messageId: string}>}
 */
async function sendGmail({ to, subject, htmlContent, senderName = "Honeymoon Haven", replyTo, bypassTestMode = false }) {
    const user = gmailEmail.value();
    const pass = gmailAppPassword.value();

    if (!user || !pass) {
        logger.error("Gmail secrets are missing.");
        throw new Error('Email service configuration error: Missing Credentials');
    }

    // Create Transporter
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: user,
            pass: pass,
        },
    });

    // Sender Info
    const from = `"${senderName}" <${user}>`;

    // Check Firestore for Test Mode and Override Email
    let isTestMode = true; // Default to TRUE (Safety First)
    let dynamicOverride = "bryan.m.hudson@gmail.com"; // Default fallback

    if (bypassTestMode) {
        isTestMode = false; // TRUST THE CALLER
        logger.warn(`[SAFETY OVERRIDE] Bypassing Test Mode for email to: ${JSON.stringify(to)}`);
    } else {
        try {
            const admin = require("firebase-admin");
            if (admin.apps.length === 0) {
                admin.initializeApp();
            }
            const db = admin.firestore();
            const settingsDoc = await db.collection("settings").doc("general").get();
            if (settingsDoc.exists) {
                const data = settingsDoc.data();
                isTestMode = data.isTestMode !== false; // Default true if undefined
                if (data.testEmailReceiver) {
                    dynamicOverride = data.testEmailReceiver;
                }
            }
        } catch (err) {
            logger.warn("Failed to fetch settings for email safety check, defaulting to TEST MODE", err);
            isTestMode = true;
        }
    }

    // --- DYNAMIC SAFETY OVERRIDE ---
    const DEV_EMAIL_OVERRIDE = dynamicOverride;

    let recipient;
    if (isTestMode) {
        logger.info(`[TEST MODE ACTIVE] Intercepting email intended for: ${JSON.stringify(to)}. Redirecting to: ${DEV_EMAIL_OVERRIDE}`);
        recipient = DEV_EMAIL_OVERRIDE;
    } else {
        recipient = typeof to === 'string' ? to : to?.email;
    }

    const mailOptions = {
        from: from,
        to: recipient,
        // REMOVED [TEST] prefix per user request (Production Readiness)
        subject: subject,
        html: htmlContent,
    };

    // Add Reply-To if provided
    if (replyTo) {
        mailOptions.replyTo = replyTo;
    }

    try {
        const info = await transporter.sendMail(mailOptions);
        logger.info("Email sent successfully", { messageId: info.messageId });

        // --- CENTRALIZED LOGGING TO FIRESTORE ---
        try {
            const admin = require("firebase-admin");
            if (admin.apps.length === 0) {
                admin.initializeApp();
            }
            const db = admin.firestore();

            await db.collection("email_logs").add({
                to: recipient,
                original_to: typeof to === 'object' ? JSON.stringify(to) : to, // Capture original intent
                subject: subject,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                status: 'sent',
                messageId: info.messageId,
                isTestMode: isTestMode,
                templateId: null, // Basic logging doesn't know template ID unless passed. 
                // We rely on 'subject' to identify type for now, or could pass metadata later.
                cabinNumber: to?.cabinNumber || null // Capture cabin number if available
            });
        } catch (logErr) {
            // Non-blocking error - don't fail the email if logging fails
            logger.error("Failed to write to email_logs", logErr);
        }

        return { success: true, messageId: info.messageId };

    } catch (error) {
        logger.error("Gmail send failed", error);

        // Log failure if possible
        try {
            const admin = require("firebase-admin");
            if (admin.apps.length === 0) admin.initializeApp();
            const db = admin.firestore();
            await db.collection("email_logs").add({
                to: recipient,
                subject: subject,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                status: 'failed',
                error: error.message,
                isTestMode: isTestMode
            });
        } catch (e) { /* ignore */ }

        throw error;
    }
}

module.exports = {
    sendGmail,
    gmailSecrets: [gmailEmail, gmailAppPassword] // Export secrets for consumers
};
