const { onSchedule } = require("firebase-functions/v2/scheduler");
const { logger } = require("firebase-functions");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const { sendGmail, gmailSecrets } = require("../helpers/email");
const { emailTemplates } = require("../helpers/emailTemplates");
const { normalizeName } = require("../helpers/shareholders");

if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();

// Define Secrets
const hhrAdminEmail = defineSecret("HHR_ADMIN_EMAIL");
const superAdminEmail = defineSecret("SUPER_ADMIN_EMAIL");

// --- PST TIMEZONE HELPER ---
// Same proven pattern as turnReminderScheduler.js
// Correctly handles DST transitions (PST = UTC-8, PDT = UTC-7)
function getTargetPstTime(baseDate, targetHour, daysOffset = 0) {
    const adjustedDate = new Date(baseDate);
    adjustedDate.setDate(adjustedDate.getDate() + daysOffset);

    const ptParts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
    }).formatToParts(adjustedDate);

    const year = parseInt(ptParts.find(p => p.type === 'year').value);
    const month = parseInt(ptParts.find(p => p.type === 'month').value);
    const day = parseInt(ptParts.find(p => p.type === 'day').value);

    // Start with PST guess (UTC-8), then refine for DST
    const guess = new Date(Date.UTC(year, month - 1, day, targetHour + 8, 0, 0, 0));

    const checkParts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        hour: 'numeric',
        hour12: false
    }).formatToParts(guess);
    const actualHour = parseInt(checkParts.find(p => p.type === 'hour').value);

    if (actualHour !== targetHour) {
        const correction = targetHour - actualHour;
        guess.setUTCHours(guess.getUTCHours() + correction);
    }

    return guess;
}

exports.paymentReminderScheduler = onSchedule(
    {
        schedule: "0 * * * *", // Every hour at :00
        secrets: [gmailSecrets[0], gmailSecrets[1], hhrAdminEmail, superAdminEmail],
        timeZone: "America/Vancouver"
    },
    async (event) => {
        logger.info("=== Payment Reminder Scheduler Started ===");

        try {
            const now = new Date();

            // FIX: Query without != operator and missing `isPaid` fields.
            // Query only finalized, then filter out paid/cancelled in JS.
            const bookingsSnapshot = await db.collection("bookings")
                .where("isFinalized", "==", true)
                .get();

            if (bookingsSnapshot.empty) {
                logger.info("No unpaid finalized bookings found.");
                return;
            }

            for (const doc of bookingsSnapshot.docs) {
                const booking = doc.data();
                const bookingId = doc.id;

                // Filter out cancelled/pass bookings in JS (avoids composite index requirement)
                if (booking.type === 'cancelled' || booking.type === 'pass' || booking.type === 'auto-pass') {
                    continue;
                }

                // Filter out paid bookings in JS (avoids missing index and missing field issues)
                if (booking.isPaid) {
                    continue;
                }

                if (!booking.createdAt) {
                    logger.warn(`Booking ${bookingId} has no createdAt, skipping`);
                    continue;
                }

                const createdAt = booking.createdAt.toDate();
                const remindersSent = booking.remindersSent || {};

                // Calculate milestone times using DST-aware helper:
                // Day 1 @ 9 AM PT = next calendar day after creation, 9 AM
                const day1At9am = getTargetPstTime(createdAt, 9, 1);
                // Day 2 @ 9 AM PT = 2 calendar days after creation, 9 AM
                const day2At9am = getTargetPstTime(createdAt, 9, 2);
                // T-6 Hours = createdAt + 42 hours (any time, not clock-anchored)
                const tMinus6h = new Date(createdAt.getTime() + 42 * 60 * 60 * 1000);
                // Overdue = createdAt + 48 hours
                const overdue48h = new Date(createdAt.getTime() + 48 * 60 * 60 * 1000);

                logger.info(`Booking ${bookingId} (${booking.shareholderName}): created=${createdAt.toISOString()}, day1@9am=${day1At9am.toISOString()}, day2@9am=${day2At9am.toISOString()}, t-6h=${tMinus6h.toISOString()}`);

                // --- OVERDUE ALERT: 48h+ (Admin Only, highest priority) ---
                if (now >= overdue48h && !remindersSent.overdueAdminAlert) {
                    const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60);
                    await sendOverdueAdminAlert(booking, bookingId, hoursSinceCreation);
                    await doc.ref.update({ "remindersSent.overdueAdminAlert": admin.firestore.Timestamp.now() });
                    logger.info(`Sent Overdue Admin Alert for booking ${bookingId}`);
                    // Don't continue - also check if we need to send user reminders
                }

                // --- FINAL WARNING: T-6 Hours (42h mark, before 48h deadline) ---
                if (now >= tMinus6h && now < overdue48h && !remindersSent.final) {
                    await sendFundingReminder(booking, "final");
                    await doc.ref.update({ "remindersSent.final": admin.firestore.Timestamp.now() });
                    logger.info(`Sent Final Urgent Reminder for booking ${bookingId}`);
                    continue;
                }

                // --- REMINDER 2: Day 2 @ 9 AM PT ---
                if (now >= day2At9am && !remindersSent.day2) {
                    await sendFundingReminder(booking, "day2");
                    await doc.ref.update({ "remindersSent.day2": admin.firestore.Timestamp.now() });
                    logger.info(`Sent Day 2 Reminder for booking ${bookingId}`);
                    continue;
                }

                // --- REMINDER 1: Day 1 @ 9 AM PT ---
                if (now >= day1At9am && !remindersSent.day1) {
                    await sendFundingReminder(booking, "day1");
                    await doc.ref.update({ "remindersSent.day1": admin.firestore.Timestamp.now() });
                    logger.info(`Sent Day 1 Reminder for booking ${bookingId}`);
                    continue;
                }
            }

        } catch (error) {
            logger.error("Error in Payment Reminder Scheduler:", error);
        }

        logger.info("=== Payment Reminder Scheduler Completed ===");
    }
);

async function sendFundingReminder(booking, type) {
    const isUrgent = type === 'final';
    const emailFunction = isUrgent ? emailTemplates.paymentUrgent : emailTemplates.paymentReminder;

    const templateData = {
        name: booking.shareholderName,
        cabin_number: booking.cabinNumber,
        total_price: booking.totalPrice,
        price_breakdown: booking.priceBreakdown || null, // FIX: was 'priceDetails', field is 'priceBreakdown'
        deadline_date: "Action Required",
        deadline_time: "48 Hours Total",
        admin_email: hhrAdminEmail.value()
    };

    // Refined Deadline Display
    if (booking.createdAt) {
        const deadline = new Date(booking.createdAt.toDate().getTime() + 48 * 60 * 60 * 1000);
        templateData.deadline_date = deadline.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/Vancouver' });
        templateData.deadline_time = deadline.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Vancouver' });
        templateData.hours_remaining = Math.max(0, Math.ceil((deadline - new Date()) / (1000 * 60 * 60)));
    }

    if (type === 'final') {
        templateData.urgency_message = "Your 48-hour payment window is causing a hold.";
        templateData.status_message = "Your booking is confirmed but unpaid. Please settle immediately.";
    }

    const { subject, htmlContent } = emailFunction(templateData);

    // Look up shareholder email
    let recipient = booking.shareholderEmail;

    if (!recipient) {
        const allShareholdersSnap = await db.collection("shareholders").get();
        const shareholderDoc = allShareholdersSnap.docs.find(d =>
            normalizeName(d.data().name) === normalizeName(booking.shareholderName)
        );
        if (shareholderDoc) {
            recipient = shareholderDoc.data().email;
        } else {
            logger.error(`Could not find email for ${booking.shareholderName} (Normalized: ${normalizeName(booking.shareholderName)})`);
            return;
        }
    }

    await sendGmail({
        to: { name: booking.shareholderName, email: recipient, cabinNumber: booking.cabinNumber },
        subject: subject,
        htmlContent: htmlContent,
        templateId: isUrgent ? 'paymentUrgent' : 'paymentReminder'
    });

    logger.info(`Payment ${type} email sent to ${recipient} for ${booking.shareholderName}`);
}

// --- ADMIN ALERT FOR OVERDUE PAYMENTS ---
async function sendOverdueAdminAlert(booking, bookingId, hoursSinceCreation) {
    const timeZone = "America/Vancouver";

    const createdAt = booking.createdAt.toDate();
    const deadline = new Date(createdAt.getTime() + 48 * 60 * 60 * 1000);

    const formatDate = (date) => date.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone
    });

    const templateData = {
        name: booking.shareholderName,
        cabin_number: booking.cabinNumber,
        check_in: booking.startDate || 'Not specified',
        check_out: booking.endDate || 'Not specified',
        guests: booking.guestCount || booking.guests || 'Not specified',
        total_price: booking.totalPrice || 0,
        price_breakdown: booking.priceBreakdown || null, // FIX: was 'priceDetails'
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

    for (const adminRecipient of adminEmails) {
        try {
            await sendGmail({
                to: adminRecipient,
                subject: subject,
                htmlContent: htmlContent,
            });
            logger.info(`Overdue admin alert sent to ${adminRecipient.email}`);
        } catch (error) {
            logger.error(`Failed to send overdue alert to ${adminRecipient.email}:`, error);
        }
    }
}
