import { functions } from '../lib/firebase';
import { httpsCallable } from 'firebase/functions';

export interface EmailRecipient {
    name: string;
    email: string;
}

export interface EmailOptions {
    to: string | EmailRecipient;
    templateId?: string;
    params?: Record<string, any>;
    subject?: string;
    htmlContent?: string;
}

export interface GuestGuideParams {
    guestEmail: string;
    guestName?: string;
    bookingDetails: {
        checkIn: string;
        checkOut: string;
        cabinNumber: string | number;
    };
    shareholderName: string;
}

/**
 * Frontend Email Service
 */
export const emailService = {
    // 1. Generic Send Email (Calls Backend)
    sendEmail: async ({ to, templateId, params, subject, htmlContent }: EmailOptions) => {
        try {
            const sendEmailFn = httpsCallable<EmailOptions, any>(functions, 'sendEmail');
            const result = await sendEmailFn({
                to,
                templateId,
                params,
                subject,
                htmlContent
            });
            return result.data;
        } catch (error) {
            console.error("Email Service Error:", error);
            throw error;
        }
    },

    // 2. Send Guest Guide (Specialized Callable)
    sendGuestGuideEmail: async ({ guestEmail, guestName, bookingDetails, shareholderName }: GuestGuideParams) => {
        try {
            const wrapper = httpsCallable<GuestGuideParams, boolean>(functions, 'sendGuestGuideEmail');
            await wrapper({ guestEmail, guestName, bookingDetails, shareholderName });
            return true;
        } catch (error) {
            console.error("Failed to send guest guide:", error);
            throw error;
        }
    }
};
