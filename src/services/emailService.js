import { functions } from '../lib/firebase';
import { httpsCallable } from 'firebase/functions';

/**
 * Frontend Email Service
 * 
 * Responsibilities:
 * 1. Trigger Backend Email Functions (Secure, Reliable)
 * 2. NO LOCAL HTML GENERATION (Deprecated)
 */

export const emailService = {
    // 1. Generic Send Email (Calls Backend)
    // Uses backend templates defined in functions/helpers/emailTemplates.js
    // OR accepts raw subject/htmlContent for custom reports
    sendEmail: async ({ to, templateId, params, subject, htmlContent }) => {
        try {

            // 'to' can be string (email) or object { name, email }

            const sendEmailFn = httpsCallable(functions, 'sendEmail');
            const result = await sendEmailFn({
                to,
                templateId,
                params,
                subject,       // Pass raw subject for custom emails
                htmlContent    // Pass raw HTML for custom emails
            });
            return result.data;
        } catch (error) {
            console.error("Email Service Error:", error);
            throw error;
        }
    },

    // 2. Send Guest Guide (Specialized Callable)
    sendGuestGuideEmail: async ({ guestEmail, guestName, bookingDetails, shareholderName }) => {
        try {
            const wrapper = httpsCallable(functions, 'sendGuestGuideEmail');
            await wrapper({ guestEmail, guestName, bookingDetails, shareholderName });
            return true;
        } catch (error) {
            console.error("Failed to send guest guide:", error);
            throw error;
        }
    }
};
