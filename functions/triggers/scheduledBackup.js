const { onSchedule } = require("firebase-functions/v2/scheduler");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");

// Ensure admin is initialized
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();

/**
 * Weekly Automated Booking Backup
 * Runs every Sunday at 11:00 PM PST (02:00 in America/Los_Angeles when PST, but we specify timezone).
 * This explicitly creates a snapshot in the `_backups` collection just in case something happens during the season.
 */
exports.weeklyDatabaseBackup = onSchedule({
    schedule: "0 23 * * 0", // Every Sunday at 23:00 (11:00 PM)
    timeZone: "America/Los_Angeles",
    timeoutSeconds: 300, // 5 minutes max
    memory: "256MiB"
}, async (event) => {
    try {
        logger.info("Starting scheduled weekly booking backup...");

        // 1. Only run if we are actually in an active booking season (or we can just run it always to be safe).
        // It's safer and cheaper to just run it and take a snapshot if there are bookings.

        const bookingsRef = db.collection('bookings');
        const snapshot = await bookingsRef.get();

        if (snapshot.empty) {
            logger.info("No bookings found to backup. Skipping.");
            return;
        }

        // Format timestamp: YYYY-MM-DD_HH-mm-ss
        // Since we are server-side, we'll format it manually or use standard ISO-like
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const timestampId = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}_CRON`;

        const backupPath = `_backups/${timestampId}/bookings`;

        const chunks = [];
        let batch = db.batch();
        let count = 0;

        snapshot.docs.forEach((docSnap) => {
            const data = docSnap.data();
            const backupRef = db.doc(`${backupPath}/${docSnap.id}`);
            batch.set(backupRef, { ...data, _backupAt: admin.firestore.FieldValue.serverTimestamp() });

            count++;
            if (count >= 490) { // Safety margin
                chunks.push(batch);
                batch = db.batch();
                count = 0;
            }
        });

        if (count > 0) chunks.push(batch);

        // Save Metadata Doc so we can list backups easily in the Admin UI
        const metaBatch = db.batch();
        metaBatch.set(db.doc(`_backups/${timestampId}`), {
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            timestampId,
            count: snapshot.size,
            type: 'scheduled_weekly'
        });
        chunks.push(metaBatch);

        await Promise.all(chunks.map(b => b.commit()));

        logger.info(`Successfully completed weekly backup: ${timestampId} with ${snapshot.size} records.`);

    } catch (error) {
        logger.error("Failed to run scheduled weekly backup:", error);
    }
});
