import { functions } from '../lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { emailTemplates, wrapHtml } from './emailTemplates';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

// --- Constants ---
const SEASON_CONFIG = {
    season_year: "2026",
    season_start: "April 3",
    season_end: "Oct 12"
};

/**
 * Generic send function via Firebase Cloud Functions
 * Securely calls the backend to send email.
 */
/**
 * Helper: Replace {{variables}} in text
 */
const processTemplate = (text, data) => {
    if (!text) return "";
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return data[key] !== undefined ? data[key] : match;
    });
};

/**
 * Helper: Fetch Template from DB or use Fallback
 */
const getEffectiveTemplate = async (templateId, fallbackFn, data) => {
    try {
        const docRef = doc(db, "email_templates", templateId);
        const snapshot = await getDoc(docRef);

        if (snapshot.exists()) {
            const dbTmpl = snapshot.data();
            const subject = processTemplate(dbTmpl.subject, data);
            const body = processTemplate(dbTmpl.body, data);
            return {
                subject,
                htmlContent: wrapHtml(subject, body)
            };
        }
    } catch (err) {
        console.warn(`Failed to fetch dynamic template ${templateId}, using fallback.`, err);
    }
    // Fallback
    return fallbackFn(data);
};

export const sendEmail = async ({ to, subject, htmlContent, templateId, params }) => {
    try {
        const sendEmailFunction = httpsCallable(functions, 'sendEmail');

        // Note: We are now preferring pre-hydrated htmlContent over templateId
        // to support client-side dynamic templates.
        const result = await sendEmailFunction({
            to,
            subject,
            htmlContent,
            templateId: htmlContent ? null : templateId,
            params
        });

        console.log('Email sent successfully via backend:', result.data);
        return result.data;
    } catch (error) {
        console.error('Failed to send email via backend:', error);
        throw error;
    }
};

// --- Convenience Methods ---

export const emailService = {
    sendEmail,
    // ID 1: "Booking Started" (Notification to NEXT user)
    // Used for: Turn Started, Turn Passed (Next), Auto Pass (Next)
    sendTurnStarted: async (recipient, data) => {
        const { subject, htmlContent } = await getEffectiveTemplate('turnStarted', emailTemplates.turnStarted, data);
        return sendEmail({ to: recipient, subject, htmlContent });
    },

    sendDailyReminder: async (recipient, data) => {
        // ID 2: Morning, ID 3: Evening - Mapped to 'reminder' key in DB
        // We distinguish by checking data.type
        const effectiveKey = 'reminder';

        // Ensure status/urgency are in data for replacement
        const enrichedData = {
            ...SEASON_CONFIG,
            status_message: data.status_message || "Please check the dashboard to make your selection.",
            urgency_message: data.urgency_message || "The clock is ticking!",
            cabin_number: data.cabin_number || "?",
            booking_url: `${data.dashboard_url}#book`,
            ...data
        };

        const { subject, htmlContent } = await getEffectiveTemplate(effectiveKey, emailTemplates.reminder, enrichedData);

        return sendEmail({
            to: recipient,
            subject,
            htmlContent
        });
    },

    // ID 4: "Final Reminder (6hr)"
    // ID 4: "Final Reminder (6hr)"
    sendFinalWarning: async (recipient, data) => {
        const enrichedData = {
            ...SEASON_CONFIG,
            status_message: data.status_message || "Your turn is ending soon.",
            next_shareholder: data.next_shareholder || "the next shareholder",
            cabin_number: data.cabin_number || "?",
            booking_url: `${data.dashboard_url}#book`,
            ...data
        };
        const { subject, htmlContent } = await getEffectiveTemplate('finalWarning', emailTemplates.finalWarning, enrichedData);
        return sendEmail({ to: recipient, subject, htmlContent });
    },

    // ID 5: "Booking Finalized Confirmation"
    // ID 5: "Booking Finalized Confirmation"
    sendBookingConfirmed: async (recipient, data) => {
        const enrichedData = {
            ...SEASON_CONFIG,
            guests: data.guests || "1",
            nights: data.nights || "0",
            ...data
        };
        const { subject, htmlContent } = await getEffectiveTemplate('bookingConfirmed', emailTemplates.bookingConfirmed, enrichedData);
        return sendEmail({ to: recipient, subject, htmlContent });
    },

    // --- Legacy / Missing Templates (Reuse ID 1 or Fallback) ---

    sendTurnPassedCurrent: async (recipient, data) => {
        const { subject, htmlContent } = await getEffectiveTemplate('turnPassedCurrent', emailTemplates.turnPassedCurrent, data);
        return sendEmail({ to: recipient, subject, htmlContent });
    },

    sendTurnPassedNext: async (recipient, data) => {
        const { subject, htmlContent } = await getEffectiveTemplate('turnPassedNext', emailTemplates.turnPassedNext, data);
        return sendEmail({ to: recipient, subject, htmlContent });
    },

    sendAutoPassCurrent: async (recipient, data) => {
        // No template for "You missed your turn" yet? 
        // Fallback to text for now.
        const { subject, htmlContent } = await getEffectiveTemplate('autoPassCurrent', emailTemplates.autoPassCurrent, data);
        return sendEmail({ to: recipient, subject, htmlContent });
    },

    sendAutoPassNext: async (recipient, data) => {
        const { subject, htmlContent } = await getEffectiveTemplate('autoPassNext', emailTemplates.autoPassNext, data);
        return sendEmail({ to: recipient, subject, htmlContent });
    },

    sendBookingCancelled: async (recipient, data) => {
        const { subject, htmlContent } = await getEffectiveTemplate('bookingCancelled', emailTemplates.bookingCancelled, data);
        return sendEmail({ to: recipient, subject, htmlContent });
    },

    sendPaymentReminder: async (recipient, data) => {
        const { subject, htmlContent } = await getEffectiveTemplate('paymentReminder', emailTemplates.paymentReminder, data);
        return sendEmail({ to: recipient, subject, htmlContent });
    },

    sendPaymentReceived: async (recipient, data) => {
        const { subject, htmlContent } = await getEffectiveTemplate('paymentReceived', emailTemplates.paymentReceived, data);
        return sendEmail({ to: recipient, subject, htmlContent });
    },

    /**
     * Send Guest Guide Email
     * Callable function directly invokable from frontend
     */
    sendGuestGuideEmail: async (guestEmail, guestName, bookingDetails = {}, shareholderName = "A HHR Shareholder") => {
        try {
            const sendFn = httpsCallable(functions, 'sendGuestGuideEmail');

            const result = await sendFn({ guestEmail, guestName, bookingDetails, shareholderName });
            return result.data;
        } catch (error) {
            console.error('Failed to send Guest Guide:', error);
            throw error;
        }
    }
};
