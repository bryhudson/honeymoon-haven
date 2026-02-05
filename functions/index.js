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
const { onBookingChangeTrigger, sendGuestGuideEmail, onDraftStatusChange } = require("./triggers/emailTriggers");
const { createAccount, deleteAccount } = require("./triggers/userManagement");
const { turnReminderScheduler } = require("./triggers/turnReminderScheduler");
const { paymentReminderScheduler } = require("./triggers/paymentReminderScheduler");
const { autosyncTurnStatus } = require("./triggers/autosyncTurnStatus");
const { sendTestEmail, sendTestReminder } = require("./triggers/manualTestEmail");
const { forceSendNotification } = require("./triggers/adminForceSend");
const { debugShareholder } = require("./triggers/debugTools");

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

    // Debug logging - CRITICAL
    logger.warn("=== sendEmail RAW INPUT ===", {
        hasTo: !!to,
        to: JSON.stringify(to),
        subject: subject ? subject.substring(0, 50) : "MISSING",
        htmlContentLength: htmlContent?.length || 0,
        templateId: templateId || "none",
        paramsKeys: params ? Object.keys(params) : []
    });

    // Note: gmail helper expects { to: {name, email}, subject, htmlContent }
    let finalSubject = subject;
    let finalHtml = htmlContent;

    // Handle Template Hydration if templateId is provided
    if (templateId) {
        try {
            let templateFn;
            switch (templateId) {
                case 1: templateFn = emailTemplates.turnStarted; break;
                case 2: templateFn = emailTemplates.reminder; if (params) params.type = 'morning'; break;
                case 3: templateFn = emailTemplates.reminder; if (params) params.type = 'evening'; break;
                case 4: templateFn = emailTemplates.finalWarning; break;
                case 5: templateFn = emailTemplates.bookingConfirmed; break;
                case 'paymentReceived': templateFn = emailTemplates.paymentReceived; break;
                case 'paymentReminder': templateFn = emailTemplates.paymentReminder; break;
                case 'bookingCancelled': templateFn = emailTemplates.bookingCancelled; break;
                case 'feedback': templateFn = emailTemplates.feedback; break;
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
            if (!finalHtml) throw new HttpsError('invalid-argument', 'Failed to generate email content');
        }
    }

    // VALIDATION: Reject if no subject or content
    if (!finalSubject || !finalHtml) {
        logger.error("=== MISSING EMAIL CONTENT ===", {
            finalSubject: finalSubject ? "PRESENT" : "MISSING",
            finalHtml: finalHtml ? "PRESENT (length: " + finalHtml.length + ")" : "MISSING"
        });
        throw new HttpsError('invalid-argument', 'Email subject and HTML content are required.');
    }

    logger.info("=== sendEmail FINAL OUTPUT ===", {
        finalSubject: finalSubject.substring(0, 50),
        finalHtmlLength: finalHtml.length
    });

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

exports.sendGuestGuideEmail = sendGuestGuideEmail;
exports.onDraftStatusChange = onDraftStatusChange;
exports.turnReminderScheduler = turnReminderScheduler;
exports.paymentReminderScheduler = paymentReminderScheduler;
exports.autosyncTurnStatus = autosyncTurnStatus;
exports.sendTestEmail = sendTestEmail;
exports.sendTestReminder = sendTestReminder;
exports.forceSendNotification = forceSendNotification;
exports.debugShareholder = debugShareholder;

// User Management
exports.createAccount = createAccount;
exports.deleteAccount = deleteAccount;

/**
 * Admin: Update user password
 * Can only be called by the Super Admin.
 */
exports.adminUpdatePassword = onCall(async (request) => {
    // 1. Authenticate that the caller is the Super Admin
    if (!request.auth || request.auth.token.email !== 'bryan.m.hudson@gmail.com') {
        throw new HttpsError('permission-denied', 'Only the Super Admin can perform this action.');
    }

    const { targetEmail, newPassword } = request.data;

    if (!targetEmail || !newPassword) {
        throw new HttpsError('invalid-argument', 'Email and new password are required.');
    }

    try {
        let userRecord;
        try {
            userRecord = await admin.auth().getUserByEmail(targetEmail);
            await admin.auth().updateUser(userRecord.uid, {
                password: newPassword
            });
            logger.info(`Password updated for user: ${targetEmail}`);
            return { success: true, message: `Password updated for ${targetEmail}` };
        } catch (getErr) {
            if (getErr.code === "auth/user-not-found") {
                userRecord = await admin.auth().createUser({
                    email: targetEmail,
                    password: newPassword,
                    emailVerified: true
                });
                logger.info(`Created new user: ${targetEmail}`);
                return { success: true, message: `Account CREATED for ${targetEmail} with new password.` };
            }
            throw getErr;
        }
    } catch (error) {
        logger.error("Failed to update/create password:", error);
        throw new HttpsError("internal", error.message || "Failed to process password update.");
    }
});

/**
 * Admin: Update shareholder email (Sync Auth)
 */
exports.adminUpdateShareholderEmail = onCall(async (request) => {
    // 1. Authenticate that the caller is the Super Admin
    if (!request.auth || request.auth.token.email !== 'bryan.m.hudson@gmail.com') {
        throw new HttpsError('permission-denied', 'Only the Super Admin can perform this action.');
    }

    const { oldEmail, newEmail } = request.data;
    if (!oldEmail || !newEmail) {
        throw new HttpsError('invalid-argument', 'Old and New emails are required.');
    }

    let result = {
        authUpdated: false,
        message: ""
    };

    try {
        // 2. Find by OLD email
        const userRecord = await admin.auth().getUserByEmail(oldEmail);

        // 3. Update to NEW email
        await admin.auth().updateUser(userRecord.uid, {
            email: newEmail,
            emailVerified: true // Auto-verify since admin set it
        });

        result.authUpdated = true;
        result.message = `Login account updated from ${oldEmail} to ${newEmail}`;

    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            // This is "okay" - means they didn't have an account yet.
            result.authUpdated = false;
            result.message = `No existing login account found for ${oldEmail}. User will need to register as ${newEmail}.`;
        } else if (error.code === 'auth/email-already-exists') {
            result.authUpdated = false;
            result.message = `Cannot update login: Account with email ${newEmail} already exists!`;
            // In this case, we might want to throw error or just warn? 
            // Throwing error might obscure the fact that DB is updated. 
            // We return success=true (function executed) but info in message.
        } else {
            logger.error("Failed to update email:", error);
            throw new HttpsError('internal', "Failed to update Auth user: " + error.message);
        }
    }

    return result;
});
