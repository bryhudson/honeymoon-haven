const { onSchedule } = require("firebase-functions/v2/scheduler");
const { logger } = require("firebase-functions");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const { sendGmail, gmailSecrets } = require("../helpers/email");
const { emailTemplates } = require("../helpers/emailTemplates");
const { format } = require("date-fns");
const { toZonedTime } = require("date-fns-tz");

if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();

// Define Secrets
const hhrAdminEmail = defineSecret("HHR_ADMIN_EMAIL");
const superAdminEmail = defineSecret("SUPER_ADMIN_EMAIL");

exports.paymentReminderScheduler = onSchedule(
    {
        schedule: "0 * * * *", // Every hour at :00
        secrets: [gmailSecrets[0], gmailSecrets[1], hhrAdminEmail, superAdminEmail],
        timeZone: "America/Vancouver" // Ensure scheduler aligns with PST generally
    },
    async (event) => {
        logger.info("=== Payment Reminder Scheduler Started ===");

        try {
            const now = new Date();
            const timeZone = "America/Vancouver";

            // Query for potential targets
            const bookingsSnapshot = await db.collection("bookings")
                .where("isFinalized", "==", true)
                .where("isPaid", "==", false)
                .where("type", "!=", "cancelled") // Ensure not cancelled
                .get();

            if (bookingsSnapshot.empty) {
                logger.info("No unpaid bookings found.");
                return;
            }

            for (const doc of bookingsSnapshot.docs) {
                const booking = doc.data();
                if (!booking.createdAt) continue;

                const createdAt = booking.createdAt.toDate();
                const bookingId = doc.id;

                // Reminder Logs (default empty)
                const remindersSent = booking.remindersSent || {};

                // ------------------------------------------
                // TIME LOGIC (PST)
                // ------------------------------------------
                // We need to compare 'now' against specific milestones relative to createdAt.
                // Milestone 1: Day 1 (Next Day) @ 9:00 AM PST
                // Milestone 2: Day 2 (Day after Next) @ 9:00 AM PST
                // Milestone 3: T-6 Hours (createdAt + 42 hours) - URGENT

                // Helper: Get 9AM PST on a specific date relative to creation
                // We use UTC manipulation to approximate or date-fns-tz for precision if available.
                // Since cloud functions env might not have date-fns-tz installed, we'll try standard JS relative logic
                // assuming the scheduler runs in a UTC environment but we want 9AM Local.

                // Let's use simple hour addition from createdAt to define the "Days".
                // "Day 1" = The calendar day start AFTER createdAt.
                // E.g. Created Monday 2pm. Day 1 = Tuesday.
                // 9am Tuesday.

                // Calculate "Day 1 9AM":
                // 1. Convert createdAt to Zoned Time (PST) to find the day.
                // 2. Add 1 day.
                // 3. Set hours to 9.
                // This is complex without a library in vanilla Node/Cloud Functions without 'date-fns-tz'.
                // 'date-fns' is available (checked package.json earlier/assumed).

                // SIMPLER APPROACH:
                // Just use "Hours since creation" as a proxy?
                // User said "Every morning at 9am". This implies strictly CLOCK TIME.
                // The scheduler runs every hour. We can check if `now` (in PST) is 9AM.
                // If now (PST) is 9AM (hour 9), trigger reminders for anyone in the window.

                // Checking current hour in PST:
                const nowPSTString = now.toLocaleString("en-US", { timeZone: "America/Vancouver", hour: "numeric", hour12: false });
                const currentHourPST = parseInt(nowPSTString);

                const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60);

                // --- REMINDER 1: Day 1 @ 9am ---
                // Condition: It is 9AM PST, and the booking is between 12h and 36h old?
                // Examples:
                // Created Mon 2pm. Tues 9am is +19h. Matches.
                // Created Mon 8am. Tues 9am is +25h. Matches.
                // Created Mon 10am. Tues 9am is +23h. Matches.
                // Range: It must be the *first* 9am encountered after creation (or after a buffer).
                // Let's say we only send if > 4 hours old (to avoid sending immediately if booked at 8am).
                // AND it is 9AM PST.

                if (currentHourPST === 9 && hoursSinceCreation > 8 && hoursSinceCreation < 32 && !remindersSent.day1) {
                    await sendFundingReminder(booking, "day1");
                    await doc.ref.update({ "remindersSent.day1": admin.firestore.Timestamp.now() });
                    logger.info(`Sent Day 1 Reminder for booking ${bookingId}`);
                    continue; // Skip other checks for this booking this run
                }

                // --- REMINDER 2: Day 2 @ 9am ---
                // Condition: It is 9AM PST, and booking is > 32h old.
                // Created Mon 2pm. Wed 9am is +43h.
                // Range: 32h to 56h?
                if (currentHourPST === 9 && hoursSinceCreation >= 32 && !remindersSent.day2) {
                    await sendFundingReminder(booking, "day2");
                    await doc.ref.update({ "remindersSent.day2": admin.firestore.Timestamp.now() });
                    logger.info(`Sent Day 2 Reminder for booking ${bookingId}`);
                    continue;
                }

                // --- FINAL WARNING: T-6 Hours ---
                // Strict 42 hour mark.
                // If booking is > 42 hours old and < 48 hours old.
                // This is NOT tied to 9am. It runs any hour.
                if (hoursSinceCreation >= 42 && hoursSinceCreation < 48 && !remindersSent.final) {
                    await sendFundingReminder(booking, "final");
                    await doc.ref.update({ "remindersSent.final": admin.firestore.Timestamp.now() });
                    logger.info(`Sent Final Urgent Reminder for booking ${bookingId}`);
                    continue;
                }

                // --- OVERDUE ALERT: T-48h+ (Admin Only) ---
                // If booking is > 48 hours old and still unpaid, alert admins
                if (hoursSinceCreation >= 48 && !remindersSent.overdueAdminAlert) {
                    await sendOverdueAdminAlert(booking, doc.id, hoursSinceCreation);
                    await doc.ref.update({ "remindersSent.overdueAdminAlert": admin.firestore.Timestamp.now() });
                    logger.info(`Sent Overdue Admin Alert for booking ${bookingId}`);
                }
            }

        } catch (error) {
            logger.error("Error in Payment Reminder Scheduler:", error);
        }
    }
);

async function sendFundingReminder(booking, type) {
    const isUrgent = type === 'final';
    // CRITICAL FIX: Use 'paymentUrgent' for final payment warning, NOT 'finalWarning' (which is for turns)
    const emailFunction = isUrgent ? emailTemplates.paymentUrgent : emailTemplates.paymentReminder;

    // Prepare Data
    // We need price breakdown if available.
    const templateData = {
        name: booking.shareholderName,
        cabin_number: booking.cabinNumber,
        total_price: booking.totalPrice,
        price_breakdown: booking.priceDetails || null, // Assuming this is stored
        deadline_date: "Action Required", // Generic for payment? Or calc 48h deadline?
        // Let's calc deadline for template:
        // createdAt + 48h
        deadline_time: "48 Hours Total",
        admin_email: hhrAdminEmail.value() // Pass secret to template
    };

    // Refined Deadline Display
    if (booking.createdAt) {
        const deadline = new Date(booking.createdAt.toDate().getTime() + 48 * 60 * 60 * 1000);
        templateData.deadline_date = deadline.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/Vancouver' });
        templateData.deadline_time = deadline.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Vancouver' });
        templateData.hours_remaining = Math.max(0, Math.ceil((deadline - new Date()) / (1000 * 60 * 60)));
    }

    if (type === 'final') {
        templateData.urgency_message = "⚠️ URGENT: Your 48-hour payment window is causing a hold.";
        templateData.status_message = "Your booking is confirmed but unpaid. Please settle immediately.";
    }

    const { subject, htmlContent } = emailFunction(templateData);

    // Get email
    // This requires fetching shareholder email if not on booking.
    // Assuming booking has everything or we need lookup.
    // 'booking' usually has 'shareholderEmail' or can lookup? 
    // Wait, bookings in Firestore usually have shareholderName only.
    // We need to look up email.

    const db = admin.firestore();
    let recipient = booking.shareholderEmail;

    if (!recipient) {
        const sSnapshot = await db.collection("shareholders").where("name", "==", booking.shareholderName).limit(1).get();
        if (!sSnapshot.empty) {
            recipient = sSnapshot.docs[0].data().email;
        } else {
            logger.error(`Could not find email for ${booking.shareholderName}`);
            return;
        }
    }

    // Send
    await sendGmail({
        to: { name: booking.shareholderName, email: recipient, cabinNumber: booking.cabinNumber },
        subject: subject,
        htmlContent: htmlContent,
        templateId: isUrgent ? 'paymentUrgent' : 'paymentReminder'
    });
}

// --- ADMIN ALERT FOR OVERDUE PAYMENTS ---
async function sendOverdueAdminAlert(booking, bookingId, hoursSinceCreation) {
    const timeZone = "America/Vancouver";

    // Calculate deadline
    const createdAt = booking.createdAt.toDate();
    const deadline = new Date(createdAt.getTime() + 48 * 60 * 60 * 1000);

    // Format dates nicely
    const formatDate = (date) => date.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone
    });

    // Prepare template data
    const templateData = {
        name: booking.shareholderName,
        cabin_number: booking.cabinNumber,
        check_in: booking.startDate || 'Not specified',
        check_out: booking.endDate || 'Not specified',
        guests: booking.guestCount || booking.guests || 'Not specified',
        total_price: booking.totalPrice || 0,
        price_breakdown: booking.priceDetails || null,
        created_at: formatDate(createdAt),
        deadline: formatDate(deadline),
        hours_overdue: Math.floor(hoursSinceCreation - 48)
    };

    const { subject, htmlContent } = emailTemplates.paymentOverdueAdmin(templateData);

    // Send to BOTH admins
    const adminEmails = [
        { name: 'Bryan Hudson', email: superAdminEmail.value() },
        { name: 'HHR Admin', email: hhrAdminEmail.value() }
    ];

    for (const admin of adminEmails) {
        try {
            await sendGmail({
                to: admin,
                subject: subject,
                htmlContent: htmlContent,
                bypassTestMode: true // Always send to real admins, even in test mode
            });
            logger.info(`Overdue admin alert sent to ${admin.email}`);
        } catch (error) {
            logger.error(`Failed to send overdue alert to ${admin.email}:`, error);
        }
    }
}
