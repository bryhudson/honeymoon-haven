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
async function sendGmail({ to, subject, htmlContent, senderName = "Honeymoon Haven", replyTo }) {
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
    // Gmail always overwrites the "From" address with the authenticated user, but we can set a custom name.
    const from = `"${senderName}" <${user}>`;

    // --- DYNAMIC SAFETY OVERRIDE ---
    const DEV_EMAIL_OVERRIDE = "bryan.m.hudson@gmail.com";

    // Check Firestore for Test Mode
    let isTestMode = true; // Default to safety
    try {
        const admin = require("firebase-admin");
        if (admin.apps.length === 0) {
            admin.initializeApp();
        }
        const db = admin.firestore();
        const settingsDoc = await db.collection("settings").doc("general").get();
        if (settingsDoc.exists) {
            isTestMode = settingsDoc.data().isTestMode !== false; // Default true if undefined
        }
    } catch (err) {
        logger.warn("Failed to fetch settings for email safety check, defaulting to TEST MODE", err);
        isTestMode = true;
    }

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
        // Only add [TEST] prefix if not already prefixed with [TEST EMAIL]
        subject: (isTestMode && !subject.startsWith('[TEST EMAIL]')) ? `[TEST] ${subject}` : subject,
        html: htmlContent,
    };

    // Add Reply-To if provided
    if (replyTo) {
        mailOptions.replyTo = replyTo;
    }

    try {
        const info = await transporter.sendMail(mailOptions);
        logger.info("Email sent successfully", { messageId: info.messageId });
        return { success: true, messageId: info.messageId };

    } catch (error) {
        logger.error("Gmail send failed", error);
        throw error;
    }
}

module.exports = {
    sendGmail,
    gmailSecrets: [gmailEmail, gmailAppPassword] // Export secrets for consumers
};
