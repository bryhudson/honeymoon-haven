const { onSchedule } = require("firebase-functions/v2/scheduler");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");

// Ensure admin is initialized
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();

// Import shared logic
const { calculateDraftSchedule, getShareholderOrder } = require("../helpers/shareholders");

/**
 * Auto-Sync Draft Status Scheduler
 * Runs every 5 minutes to keep draftStatus in sync with calculated state
 * This enables Cloud Function email schedulers to send reminders to active shareholders
 */
exports.autosyncDraftStatus = onSchedule(
    {
        schedule: "*/5 * * * *", // Every 5 minutes
        timeZone: "America/Los_Angeles"
    },
    async (event) => {
        logger.info("=== Auto-Sync Draft Status Started ===");

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
                settings.fastTestingMode,
                settings.bypassTenAM
            );

            // 4. Write to Firestore
            await db.collection("status").doc("draftStatus").set({
                activePicker: calculatedStatus.activePicker,
                nextPicker: calculatedStatus.nextPicker,
                phase: calculatedStatus.phase,
                round: calculatedStatus.round,
                windowStarts: calculatedStatus.windowStarts ? admin.firestore.Timestamp.fromDate(calculatedStatus.windowStarts) : null,
                windowEnds: calculatedStatus.windowEnds ? admin.firestore.Timestamp.fromDate(calculatedStatus.windowEnds) : null,
                lastSynced: admin.firestore.Timestamp.now()
            });

            logger.info(`Draft status synced - Active: ${calculatedStatus.activePicker || 'None'}, Phase: ${calculatedStatus.phase}, Round: ${calculatedStatus.round}`);

        } catch (error) {
            logger.error("Auto-sync failed:", error);
        }

        logger.info("=== Auto-Sync Draft Status Completed ===");
    }
);
