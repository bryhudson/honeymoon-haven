const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
const { sendGmail, gmailSecrets } = require("../helpers/email");
const { emailTemplates } = require("../helpers/emailTemplates");

// Ensure admin is initialized
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();

/**
 * Manual Test Email Trigger
 * Allows admins to send test emails from Notifications tab
 */
exports.sendTestEmail = onCall({ secrets: gmailSecrets }, async (request) => {
    // 1. Security: Only Super Admin
    if (!request.auth || request.auth.token.email !== 'bryan.m.hudson@gmail.com') {
        throw new HttpsError('permission-denied', 'Only the Super Admin can send test emails.');
    }

    const { emailType, targetShareholder, testEmail } = request.data;

    if (!emailType) {
        throw new HttpsError('invalid-argument', 'Email type is required.');
    }

    try {
        // 2. Use default test target (Super Admin) if no specific target provided
        let shareholderName = targetShareholder;
        let shareholderEmail;

        if (!shareholderName) {
            // Use Super Admin as default test target
            shareholderName = "Bryan Hudson";
            shareholderEmail = testEmail || "bryan.m.hudson@gmail.com";
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

        const testData = {
            name: shareholderName,
            round: 1,
            phase: 'ROUND_1',
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
            case 'paymentReminder':
                ({ subject, htmlContent } = emailTemplates.paymentReminder({
                    ...testData,
                    total_price: 875,
                    cabin_number: 3,
                    check_in: "June 15, 2026"
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
                // Bonus time template (will create if needed)
                subject = "🎁 Bonus Time! Early Access to Your Turn";
                htmlContent = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2>Great News, ${shareholderName}!</h2>
                        <p>The previous shareholder finished early, so you get a head start!</p>
                        <p><strong>Bonus Time:</strong> You can book now</p>
                        <p><strong>Official 48-hour window starts:</strong> Tomorrow at 10:00 AM</p>
                        <p><a href="${testData.dashboard_url}" style="background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Book Now</a></p>
                    </div>
                `;
                break;
            default:
                throw new HttpsError('invalid-argument', `Unknown email type: ${emailType}`);
        }

        // 7. Use testEmail if provided, otherwise apply test mode override
        const recipient = testEmail || (isTestMode ? "bryan.m.hudson@gmail.com" : shareholderEmail);
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
    // Security: Only Super Admin
    if (!request.auth || request.auth.token.email !== 'bryan.m.hudson@gmail.com') {
        throw new HttpsError('permission-denied', 'Only the Super Admin can send test reminders.');
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
        const recipient = request.data.testEmail || "bryan.m.hudson@gmail.com";
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
