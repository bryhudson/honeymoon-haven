/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");

// Initialize Admin SDK once here
if (admin.apps.length === 0) {
    admin.initializeApp();
}

const { sendGmail, gmailSecrets } = require("./helpers/email");
const { emailTemplates } = require("./helpers/emailTemplates");
const { onBookingChangeTrigger, checkDailyReminders } = require("./triggers/emailTriggers");

/**
 * Sends an email via Gmail SMTP.
 * This function is callable securely from the client.
 */
exports.sendEmail = onCall({ secrets: gmailSecrets }, async (request) => {
    // 1. Authentication Check (Optional: enforce valid user)
    // if (!request.auth) {
    //     throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    // }

    const { to, subject, htmlContent, templateId, params } = request.data;

    // Note: gmail helper expects { to: {name, email}, subject, htmlContent }
    let finalSubject = subject;
    let finalHtml = htmlContent;

    // Handle Template Hydration if templateId is provided
    if (templateId) {
        try {
            let templateFn;
            switch (templateId) {
                case 1: templateFn = emailTemplates.turnStarted; break;
                // Reminder needs logic to distinguish morning/evening if mapped strictly by ID?
                // emailService.js passes params... let's see. 
                // Ah, emailService.js ID 2/3 both map to `reminder` but likely distinct params.
                // Wait, emailService.js: "ID 2: Morning, ID 3: Evening". 
                // emailTemplates.reminder takes `data` and checks `data.type`. 
                // So we can map both to reminder, but we need to ensure `params` has the right data.
                case 2: templateFn = emailTemplates.reminder; if (params) params.type = 'morning'; break;
                case 3: templateFn = emailTemplates.reminder; if (params) params.type = 'evening'; break; // Assuming 'evening' default or explicit
                case 4: templateFn = emailTemplates.finalWarning; break;
                case 5: templateFn = emailTemplates.bookingConfirmed; break;
                default:
                    logger.warn(`Unknown Template ID: ${templateId}`);
            }

            if (templateFn) {
                const result = templateFn(params || {});
                finalSubject = result.subject;
                finalHtml = result.htmlContent;
            }
        } catch (err) {
            logger.error("Failed to hydrate template", err);
            // Fallback to sending what we have, or error out?
            if (!finalHtml) throw new HttpsError('invalid-argument', 'Failed to generate email content');
        }
    }

    try {
        const result = await sendGmail({
            to,
            subject: finalSubject,
            htmlContent: finalHtml
        });
        return result;

    } catch (error) {
        throw new HttpsError('internal', error.message || 'Failed to send email.');
    }
});

// Export triggers
exports.onBookingChangeTrigger = onBookingChangeTrigger;
exports.checkDailyReminders = checkDailyReminders;

