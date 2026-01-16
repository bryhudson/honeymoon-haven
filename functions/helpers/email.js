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
async function sendGmail({ to, subject, htmlContent }) {
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
    // Use provided senderName if available, otherwise default to "Honeymoon Haven"
    const senderName = data.senderName || "Honeymoon Haven";
    const from = `"${senderName}" <${user}>`;

    // Safely override recipient for testing if needed
    // const recipient = "bryan.m.hudson@gmail.com"; // Safety override
    const recipient = typeof to === 'string' ? to : to?.email; // Real recipient

    const mailOptions = {
        from: from,
        to: recipient,
        subject: subject,
        html: htmlContent,
    };

    // Add Reply-To if provided
    if (data.replyTo) {
        mailOptions.replyTo = data.replyTo;
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
