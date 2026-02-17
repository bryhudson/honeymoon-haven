const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
const { sendGmail, gmailSecrets } = require("../helpers/email");
const { emailTemplates } = require("../helpers/emailTemplates");
const { defineSecret } = require("firebase-functions/params");

const superAdminEmail = defineSecret("SUPER_ADMIN_EMAIL");

// Ensure admin is initialized
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();

/**
 * Manual Test Email Trigger
 * Allows admins to send test emails from Notifications tab
 */
exports.sendTestEmail = onCall({ secrets: [gmailSecrets[0], gmailSecrets[1], superAdminEmail] }, async (request) => {
    // 1. Security: Check for Admin Role (Any Admin)
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Must be logged in to send test emails.');
    }

    const callerEmail = request.auth.token.email;

    // Verify role in database
    const callerDoc = await db.collection("shareholders").doc(callerEmail).get();
    if (!callerDoc.exists) {
        throw new HttpsError('permission-denied', 'Caller not found in database.');
    }

    const callerRole = callerDoc.data().role;
    if (callerRole !== 'admin' && callerRole !== 'super_admin') {
        throw new HttpsError('permission-denied', 'Only Admins can send test emails.');
    }

    const { emailType, targetShareholder, testEmail } = request.data;

    if (!emailType || typeof emailType !== 'string') {
        throw new HttpsError('invalid-argument', 'Email type is required.');
    }
    if (targetShareholder && (typeof targetShareholder !== 'string' || targetShareholder.length > 100)) {
        throw new HttpsError('invalid-argument', 'Invalid shareholder name.');
    }
    if (testEmail && (typeof testEmail !== 'string' || testEmail.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail))) {
        throw new HttpsError('invalid-argument', 'Invalid email format.');
    }

    try {
        // 2. Use default test target (Super Admin) if no specific target provided
        let shareholderName = targetShareholder;
        let shareholderEmail;

        if (!shareholderName) {
            // Use Super Admin as default test target
            shareholderName = "Bryan Hudson";
            shareholderEmail = testEmail || superAdminEmail.value();
        } else {
            // 3. Get shareholder email from database
            const shareholderQuery = await db.collection("shareholders")
                .where("name", "==", shareholderName)
                .limit(1)
                .get();

            if (shareholderQuery.empty) {
                throw new HttpsError('not-found', `Shareholder not found: ${shareholderName}`);
            }

            shareholderEmail = shareholderQuery.docs[0].data().email;
            // Try to get cabin number from various possible fields
            const sData = shareholderQuery.docs[0].data();
            var cabinNumber = sData.cabin || sData.cabinNumber || sData.defaultCabin;
        }

        // 4. Get test mode setting
        const settingsDoc = await db.collection("settings").doc("general").get();
        const isTestMode = settingsDoc.exists ? (settingsDoc.data().isTestMode !== false) : true;

        // 5. Prepare test email data
        const testDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h from now

        const statusDoc = await db.collection("status").doc("draftStatus").get();
        const currentRound = statusDoc.exists ? (statusDoc.data().round || 1) : 1;
        const currentPhase = statusDoc.exists ? (statusDoc.data().phase || 'ROUND_1') : 'ROUND_1';

        const testData = {
            name: shareholderName,
            round: currentRound,
            phase: currentPhase,
            deadline_date: testDeadline.toLocaleString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                timeZone: 'America/Vancouver'
            }),
            deadline_time: testDeadline.toLocaleString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
                timeZone: 'America/Vancouver'
            }),
            status_message: "This is a test email.",
            urgency_message: "Testing the email notification system.",
            dashboard_url: "https://hhr-trailer-booking.web.app/dashboard"
        };

        // 6. Select appropriate template and send
        let subject, htmlContent;

        switch (emailType) {
            case 'turnStarted':
                ({ subject, htmlContent } = emailTemplates.turnStarted(testData));
                break;
            case 'reminder':
                ({ subject, htmlContent } = emailTemplates.reminder(testData));
                break;
            case 'finalWarning':
                ({ subject, htmlContent } = emailTemplates.finalWarning(testData));
                break;
            case 'bookingConfirmed':
                ({ subject, htmlContent } = emailTemplates.bookingConfirmed({
                    ...testData,
                    check_in: "June 15, 2026",
                    check_out: "June 22, 2026",
                    nights: 7,
                    cabin_number: 3,
                    guests: 4,
                    total_price: 875
                }));
                break;
            case 'bookingCancelled':
                ({ subject, htmlContent } = emailTemplates.bookingCancelled({
                    ...testData,
                    check_in: "June 15, 2026",
                    check_out: "June 22, 2026",
                    cabin_number: 3,
                    within_turn_window: false,
                    next_shareholder: "Next Person"
                }));
                break;
            case 'turnPassedNext':
                ({ subject, htmlContent } = emailTemplates.turnPassedNext({
                    ...testData,
                    previous_shareholder: "Previous Person",
                    deadline_date: "Jan 25",
                    deadline_time: "10:00 AM"
                }));
                break;
            case 'autoPassNext':
                ({ subject, htmlContent } = emailTemplates.autoPassNext({
                    ...testData,
                    previous_shareholder: "Previous Person",
                    deadline_date: "Jan 25",
                    deadline_time: "10:00 AM"
                }));
                break;
            case 'paymentReminder':
                ({ subject, htmlContent } = emailTemplates.paymentReminder({
                    ...testData,
                    total_price: 875,
                    cabin_number: 3,
                    check_in: "June 15, 2026",
                    price_breakdown: { weeknights: 5, weeknightTotal: 500, weekends: 2, weekendTotal: 250, discount: 0 }
                }));
                break;
            case 'paymentReminder_urgent':
                // Simulates the T-6h warning from paymentReminderScheduler
                ({ subject, htmlContent } = emailTemplates.finalWarning({
                    ...testData,
                    status_message: "Your booking is confirmed but unpaid. Please settle immediately.",
                    urgency_message: "⚠️ URGENT: Your 48-hour payment window is causing a hold.",
                    hours_remaining: 6,
                    type: 'morning'
                }));
                break;
            case 'paymentReceived':
                ({ subject, htmlContent } = emailTemplates.paymentReceived({
                    ...testData,
                    amount: 875,
                    check_in: "June 15, 2026",
                    check_out: "June 22, 2026",
                    cabin_number: 3
                }));
                break;
            case 'bonusTime':
                // Bonus time is effectively "Turn Passed Next" (Early Access)
                ({ subject, htmlContent } = emailTemplates.turnPassedNext({
                    ...testData,
                    round: 1,
                    phase: 'ROUND_1',
                    deadline_date: "Tomorrow",
                    deadline_time: "10:00 AM"
                }));
                break;
            case 'openSeasonStarted':
                ({ subject, htmlContent } = emailTemplates.openSeasonStarted({}));
                break;
            case 'paymentOverdueAdmin':
                ({ subject, htmlContent } = emailTemplates.paymentOverdueAdmin({
                    name: shareholderName,
                    cabin_number: 3,
                    check_in: "June 15, 2026",
                    check_out: "June 22, 2026",
                    guests: 4,
                    total_price: 650,
                    price_breakdown: { weeknights: 5, weeknightTotal: 500, weekends: 2, weekendTotal: 250, discount: 100 },
                    created_at: "Wed, Feb 3, 10:30 AM",
                    deadline: "Fri, Feb 5, 10:30 AM",
                    hours_overdue: 12
                }));
                break;
            default:
                throw new HttpsError('invalid-argument', `Unknown email type: ${emailType}`);
        }

        // 7. Use testEmail if provided, otherwise apply test mode override
        const recipient = testEmail || (isTestMode ? superAdminEmail.value() : shareholderEmail);
        const finalSubject = subject;

        await sendGmail({
            to: { name: shareholderName, email: recipient, cabinNumber: cabinNumber },
            subject: finalSubject,
            htmlContent: htmlContent
        });

        logger.info(`Test email sent: ${emailType} to ${recipient}`);

        return {
            success: true,
            message: `Test email "${emailType}" sent to ${recipient}`,
            recipient: recipient,
            emailType: emailType
        };

    } catch (error) {
        logger.error("Failed to send test email:", error);
        throw new HttpsError('internal', `Failed to send test email: ${error.message}`);
    }
});

/**
 * Send Test Reminder Email
 * Instantly sends a reminder email for testing purposes
 */
exports.sendTestReminder = onCall({ secrets: gmailSecrets }, async (request) => {
    // Security: Any Admin
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Must be logged in to send test reminders.');
    }

    const callerEmail = request.auth.token.email;
    const callerDoc = await db.collection("shareholders").doc(callerEmail).get();

    if (!callerDoc.exists) {
        throw new HttpsError('permission-denied', 'Caller not found.');
    }

    const callerRole = callerDoc.data().role;
    if (callerRole !== 'admin' && callerRole !== 'super_admin') {
        throw new HttpsError('permission-denied', 'Only Admins can send test reminders.');
    }

    const { reminderType } = request.data; // 'evening', 'day2', 'final', 'urgent'

    if (!reminderType) {
        throw new HttpsError('invalid-argument', 'Reminder type is required.');
    }

    try {
        // Get active picker from draftStatus
        const statusDoc = await db.collection("status").doc("draftStatus").get();

        if (!statusDoc.exists) {
            throw new HttpsError('failed-precondition', 'Draft status not found. Run sync first.');
        }

        const { activePicker, round, phase, windowEnds } = statusDoc.data();

        if (!activePicker) {
            throw new HttpsError('failed-precondition', 'No active picker. Draft may not have started.');
        }

        // Get shareholder email
        const shareholderQuery = await db.collection("shareholders")
            .where("name", "==", activePicker)
            .limit(1)
            .get();

        if (shareholderQuery.empty) {
            throw new HttpsError('not-found', `Shareholder not found: ${activePicker}`);
        }

        const sData = shareholderQuery.docs[0].data();
        const shareholderEmail = sData.email;
        const cabinNumber = sData.cabin || sData.cabinNumber || sData.defaultCabin;
        const deadline = windowEnds ? windowEnds.toDate() : new Date(Date.now() + 48 * 60 * 60 * 1000);

        // Define reminder messages
        const reminderMessages = {
            evening: { type: 'evening', hoursRemaining: 41, isUrgent: false }, // Day 1 7 PM (7h in)
            day2: { type: 'morning', hoursRemaining: 25, isUrgent: false }, // Day 2 9 AM
            evening2: { type: 'evening', hoursRemaining: 15, isUrgent: false }, // Day 2 7 PM
            final6am: { type: 'morning', hoursRemaining: 4, isUrgent: false }, // Day 3 6 AM
            final9am: { type: 'morning', hoursRemaining: 1, isUrgent: true } // Day 3 9 AM (Urgent)
        };

        const config = reminderMessages[reminderType];
        if (!config) {
            throw new HttpsError('invalid-argument', `Unknown reminder type: ${reminderType}`);
        }

        // Format deadline parts
        const deadlineDate = deadline.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/Vancouver' });
        const deadlineTime = deadline.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Vancouver' });

        // Prepare email data
        const testData = {
            name: activePicker,
            round: round || 1,
            phase: phase || 'ROUND_1',
            type: config.type, // Critical for Morning/Evening greeting
            hours_remaining: config.hoursRemaining, // Critical for "Time Remaining"
            deadline_date: deadlineDate, // Critical for template
            deadline_time: deadlineTime, // Critical for template
            status_message: `You have ${config.hoursRemaining} hours remaining to make your selection.`,
            urgency_message: config.isUrgent ? '⚠️ URGENT: Your booking window is about to expire!' : 'Friendly reminder to complete your booking.',
            dashboard_url: "https://hhr-trailer-booking.web.app/"
        };

        // Select appropriate template
        const emailFunction = config.isUrgent ? emailTemplates.finalWarning : emailTemplates.reminder;
        const { subject, htmlContent } = emailFunction(testData);

        // Use provided test email or default to Super Admin
        const recipient = request.data.testEmail || superAdminEmail.value();
        const finalSubject = subject;

        await sendGmail({
            to: { activePicker, email: recipient, cabinNumber: cabinNumber },
            subject: finalSubject,
            htmlContent: htmlContent
        });

        logger.info(`Test reminder sent: ${reminderType} for ${activePicker} to ${recipient}`);

        return {
            success: true,
            message: `Test ${reminderType} reminder sent for ${activePicker}`,
            recipient: recipient,
            reminderType: reminderType
        };

    } catch (error) {
        logger.error("Failed to send test reminder:", error);
        throw new HttpsError('internal', `Failed to send test reminder: ${error.message}`);
    }
});
