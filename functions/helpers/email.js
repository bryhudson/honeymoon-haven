const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const nodemailer = require("nodemailer");

const gmailEmail = defineSecret("GMAIL_EMAIL");
const gmailAppPassword = defineSecret("GMAIL_APP_PASSWORD");
const superAdminEmail = defineSecret("SUPER_ADMIN_EMAIL");

// Environment detection — single source of truth for email routing.
// Production project emails real shareholders; any other project (dev, etc.)
// redirects ALL mail to SUPER_ADMIN_EMAIL. Fail-closed: unknown env = redirect.
const PROD_PROJECT_ID = "hhr-trailer-booking";
function isProduction() {
    const pid = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || "";
    return pid === PROD_PROJECT_ID;
}

/**
 * Sends an email via Gmail SMTP. In non-prod environments (dev, staging, local),
 * all emails are redirected to SUPER_ADMIN_EMAIL for safety.
 */
async function sendGmail({ to, cc, subject, htmlContent, senderName = "Honeymoon Haven Resort", replyTo, templateId = null }) {
    const user = gmailEmail.value();
    const pass = gmailAppPassword.value();

    if (!user || !pass) {
        logger.error("Gmail secrets are missing.");
        throw new Error("Email service configuration error: Missing Credentials");
    }

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user, pass },
    });

    const from = `"${senderName}" <${user}>`;
    const IS_PROD = isProduction();
    const REDIRECT_TO = superAdminEmail.value();

    const intendedTo = typeof to === "string" ? to : to?.email;

    if (!IS_PROD) {
        logger.info(`[NON-PROD ENV] Skipping email send to ${JSON.stringify(to)} (project: ${process.env.GCLOUD_PROJECT || "unknown"})`);
        try {
            const admin = require("firebase-admin");
            if (admin.apps.length === 0) admin.initializeApp();
            const db = admin.firestore();
            await db.collection("email_logs").add({
                to: intendedTo,
                cc: (typeof cc === "string" ? cc : cc?.email) || null,
                original_to: typeof to === "object" ? JSON.stringify(to) : to,
                subject,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                status: "skipped_non_prod",
                isTestMode: true,
                templateId: templateId || null,
                cabinNumber: to?.cabinNumber || null,
            });
        } catch (logErr) {
            logger.error("Failed to write skipped email to email_logs", logErr);
        }
        return { success: true, skipped: true };
    }

    const recipient = intendedTo;

    const mailOptions = {
        from,
        to: recipient,
        subject,
        html: htmlContent,
    };

    if (cc) {
        const ccEmail = typeof cc === "string" ? cc : cc?.email;
        if (ccEmail) {
            mailOptions.cc = ccEmail;
        }
    }

    if (replyTo) {
        mailOptions.replyTo = replyTo;
    }

    try {
        const info = await transporter.sendMail(mailOptions);
        logger.info("Email sent successfully", { messageId: info.messageId, isProd: IS_PROD });

        try {
            const admin = require("firebase-admin");
            if (admin.apps.length === 0) admin.initializeApp();
            const db = admin.firestore();
            await db.collection("email_logs").add({
                to: recipient,
                cc: mailOptions.cc || null,
                original_to: typeof to === "object" ? JSON.stringify(to) : to,
                subject,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                status: "sent",
                messageId: info.messageId,
                isTestMode: !IS_PROD,
                templateId: templateId || null,
                cabinNumber: to?.cabinNumber || null,
            });
        } catch (logErr) {
            logger.error("Failed to write to email_logs", logErr);
        }

        return { success: true, messageId: info.messageId };
    } catch (error) {
        logger.error("Gmail send failed", error);
        try {
            const admin = require("firebase-admin");
            if (admin.apps.length === 0) admin.initializeApp();
            const db = admin.firestore();
            await db.collection("email_logs").add({
                to: recipient,
                subject,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                status: "failed",
                error: error.message,
                isTestMode: !IS_PROD,
            });
        } catch (e) { /* ignore */ }
        throw error;
    }
}

module.exports = {
    sendGmail,
    isProduction,
    gmailSecrets: [gmailEmail, gmailAppPassword, superAdminEmail],
};
