import { functions } from '../lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { emailTemplates } from './emailTemplates';

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
export const sendEmail = async ({ to, subject, htmlContent, templateId, params }) => {
    try {
        const sendEmailFunction = httpsCallable(functions, 'sendEmail');

        const result = await sendEmailFunction({
            to,
            subject,
            htmlContent,
            templateId,
            params
        });

        console.log('Email sent successfully via backend:', result.data);
        return result.data;
    } catch (error) {
        console.error('Failed to send email via backend:', error);
        // Fallback or Alert could be triggered here
        throw error;
    }
};

// --- Convenience Methods ---

export const emailService = {
    // ID 1: "Booking Started" (Notification to NEXT user)
    // Used for: Turn Started, Turn Passed (Next), Auto Pass (Next)
    sendTurnStarted: async (recipient, data) => {
        return sendEmail({
            to: recipient,
            templateId: 1,
            params: {
                ...SEASON_CONFIG,
                name: data.name,
                deadline_date: data.deadline_date,
                deadline_time: data.deadline_time,
                cabin_number: data.cabin_number || "?",
                dashboard_url: data.dashboard_url,
                booking_url: `${data.dashboard_url}#book`,
                pass_turn_url: `${data.dashboard_url}#pass`
            }
        });
    },

    sendDailyReminder: async (recipient, data) => {
        // ID 2: Morning, ID 3: Evening
        const id = data.type === 'evening' ? 3 : 2;

        // Construct status message if not provided
        const statusMsg = data.status_message || "Please check the dashboard to make your selection.";
        const urgencyMsg = data.urgency_message || "The clock is ticking!";

        return sendEmail({
            to: recipient,
            templateId: id,
            params: {
                ...SEASON_CONFIG,
                name: data.name,
                hours_remaining: data.hours_remaining,
                deadline_date: data.deadline_date,
                deadline_time: data.deadline_time,
                status_message: statusMsg,
                urgency_message: urgencyMsg,
                cabin_number: data.cabin_number || "?",
                dashboard_url: data.dashboard_url,
                booking_url: `${data.dashboard_url}#book`
            }
        });
    },

    // ID 4: "Final Reminder (6hr)"
    sendFinalWarning: async (recipient, data) => {
        return sendEmail({
            to: recipient,
            templateId: 4,
            params: {
                ...SEASON_CONFIG,
                name: data.name,
                hours_remaining: data.hours_remaining,
                deadline_date: data.deadline_date,
                deadline_time: data.deadline_time,
                status_message: data.status_message || "Your turn is ending soon.",
                next_shareholder: data.next_shareholder || "the next shareholder",
                cabin_number: data.cabin_number || "?",
                dashboard_url: data.dashboard_url,
                booking_url: `${data.dashboard_url}#book`
            }
        });
    },

    // ID 5: "Booking Finalized Confirmation"
    sendBookingConfirmed: async (recipient, data) => {
        return sendEmail({
            to: recipient,
            templateId: 5,
            params: {
                ...SEASON_CONFIG,
                name: data.name,
                check_in: data.check_in,
                check_out: data.check_out,
                cabin_number: data.cabin_number,
                guests: data.guests || "1",
                nights: data.nights || "0",
                total_price: data.total_price,
                dashboard_url: data.dashboard_url
            }
        });
    },

    // --- Legacy / Missing Templates (Reuse ID 1 or Fallback) ---

    sendTurnPassedCurrent: async (recipient, data) => {
        const { subject, htmlContent } = emailTemplates.turnPassedCurrent(data);
        return sendEmail({ to: recipient, subject, htmlContent });
    },

    sendTurnPassedNext: async (recipient, data) => {
        // Reuse ID 1
        return sendEmail({
            to: recipient,
            templateId: 1,
            params: {
                ...SEASON_CONFIG,
                name: data.name,
                deadline_date: data.deadline_date,
                deadline_time: data.deadline_time,
                cabin_number: data.cabin_number || "?",
                dashboard_url: data.dashboard_url,
                booking_url: `${data.dashboard_url}#book`,
                pass_turn_url: `${data.dashboard_url}#pass`
            }
        });
    },

    sendAutoPassCurrent: async (recipient, data) => {
        // No template for "You missed your turn" yet? 
        // Fallback to text for now.
        const { subject, htmlContent } = emailTemplates.autoPassCurrent(data);
        return sendEmail({ to: recipient, subject, htmlContent });
    },

    sendAutoPassNext: async (recipient, data) => {
        // Reuse ID 1
        return sendEmail({
            to: recipient,
            templateId: 1,
            params: {
                ...SEASON_CONFIG,
                name: data.name,
                deadline_date: data.deadline_date,
                deadline_time: data.deadline_time,
                cabin_number: data.cabin_number || "?",
                dashboard_url: data.dashboard_url,
                booking_url: `${data.dashboard_url}#book`,
                pass_turn_url: `${data.dashboard_url}#pass`
            }
        });
    },

    sendBookingCancelled: async (recipient, data) => {
        const { subject, htmlContent } = emailTemplates.bookingCancelled(data);
        return sendEmail({ to: recipient, subject, htmlContent });
    },

    sendPaymentReminder: async (recipient, data) => {
        const { subject, htmlContent } = emailTemplates.paymentReminder(data);
        return sendEmail({ to: recipient, subject, htmlContent });
    }
};
