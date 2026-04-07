const { onSchedule } = require("firebase-functions/v2/scheduler");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
const { sendGmail, gmailSecrets } = require("../helpers/email");
const { emailTemplates } = require("../helpers/emailTemplates");

// Ensure admin is initialized
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();

// Import shared logic
const { calculateDraftSchedule, getShareholderOrder } = require("../helpers/shareholders");

/**
 * Auto-Sync Turn Status Scheduler
 * Runs every 1 minute to keep systemStatus in sync with calculated state.
 * Also acts as a safety net for the Open Season email blast - ensures it fires
 * even when the last shareholder times out (auto-skip path), which bypasses
 * the event-driven notifyNextShareholder() in emailTriggers.js.
 */
exports.autosyncTurnStatus = onSchedule(
    {
        schedule: "* * * * *", // Every 1 minute for precise turn windows
        timeZone: "America/Los_Angeles",
        secrets: gmailSecrets
    },
    async (event) => {
        logger.info("=== Auto-Sync Turn Status Started ===");

        try {
            // 1. Fetch all bookings
            const bookingsSnapshot = await db.collection("bookings").get();
            const bookings = bookingsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                from: doc.data().from?.toDate(),
                to: doc.data().to?.toDate()
            }));

            // 2. Fetch settings
            const settingsDoc = await db.collection("settings").doc("general").get();
            const settings = settingsDoc.exists ? settingsDoc.data() : {};

            // 3. Calculate current draft status
            const calculatedStatus = calculateDraftSchedule(
                getShareholderOrder(2026), // shareholders
                bookings,
                new Date(), // now
                settings.draftStartDate?.toDate(),
                settings.bypassTenAM // bypassTenAM for test simulation
            );

            // 4. Write to Firestore
            await db.collection("status").doc("draftStatus").set({
                activePicker: calculatedStatus.activePicker,
                nextPicker: calculatedStatus.nextPicker,
                phase: calculatedStatus.phase,
                round: calculatedStatus.round,
                isGracePeriod: calculatedStatus.isGracePeriod || false,
                windowStarts: calculatedStatus.windowStarts ? admin.firestore.Timestamp.fromDate(calculatedStatus.windowStarts) : null,
                windowEnds: calculatedStatus.windowEnds ? admin.firestore.Timestamp.fromDate(calculatedStatus.windowEnds) : null,
                lastSynced: admin.firestore.Timestamp.now()
            });

            logger.info(`Draft status synced - Active: ${calculatedStatus.activePicker || 'None'}, Phase: ${calculatedStatus.phase}, Round: ${calculatedStatus.round}`);

            // 5. Open Season Blast Safety Net
            // If the phase just transitioned to OPEN_SEASON (e.g. last user timed out),
            // the event-driven blast in emailTriggers.js may NOT have fired.
            // This idempotent check ensures the blast always goes out.
            if (calculatedStatus.phase === 'OPEN_SEASON') {
                const seasonLogDoc = await db.collection("notification_log").doc("open_season_blast_2026").get();

                if (!seasonLogDoc.exists) {
                    logger.info("[AutoSync] Open Season detected and blast not yet sent. Sending now...");

                    const allShareholders = await db.collection("shareholders").get();
                    const recipients = allShareholders.docs
                        .map(d => ({ name: d.data().name, email: d.data().email }))
                        .filter(r => r.email);

                    const sendPromises = recipients.map(recipient => {
                        const { subject, htmlContent } = emailTemplates.openSeasonStarted({ name: recipient.name });
                        return sendGmail({
                            to: recipient,
                            subject: subject,
                            htmlContent: htmlContent,
                            templateId: 'openSeasonBlast'
                        }).catch(e => logger.error(`Failed to send Open Season email to ${recipient.email}`, e));
                    });

                    await Promise.all(sendPromises);

                    await db.collection("notification_log").doc("open_season_blast_2026").set({
                        sentAt: admin.firestore.Timestamp.now(),
                        recipientCount: recipients.length,
                        triggeredBy: 'autosyncTurnStatus' // Audit trail
                    });

                    logger.info(`[AutoSync] Open Season Blast sent to ${recipients.length} shareholders.`);
                }
            }

        } catch (error) {
            logger.error("Auto-sync failed:", error);
        }

        logger.info("=== Auto-Sync Turn Status Completed ===");
    }
);
