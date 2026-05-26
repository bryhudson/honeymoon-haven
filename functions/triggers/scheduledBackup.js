const { onSchedule } = require("firebase-functions/v2/scheduler");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
const { getSeasonState, getCurrentSeasonYear, decideWeeklyBackup } = require("../helpers/shareholders");

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
        const now = new Date();

        // Off-season hibernation: in-season this is the regular weekly snapshot;
        // on the first off-season run it takes ONE "season-end" snapshot of the
        // season that just closed, then skips the rest of the winter. The
        // season-end snapshot uses a stable id so it's taken exactly once.
        const endedYear = getCurrentSeasonYear(now) - 1; // season that just closed (off-season)
        let seasonEndExists = false;
        if (getSeasonState(now) === 'OFF_SEASON') {
            seasonEndExists = (await db.doc(`_backups/season_end_${endedYear}`).get()).exists;
        }
        const action = decideWeeklyBackup(now, seasonEndExists);

        if (action === 'skip') {
            logger.info(`Off-season: season-end backup (season_end_${endedYear}) already exists. Skipping.`);
            return;
        }

        const bookingsRef = db.collection('bookings');
        const snapshot = await bookingsRef.get();

        if (snapshot.empty) {
            logger.info("No bookings found to backup. Skipping.");
            return;
        }

        // The backup id + type depend on the action.
        let backupId, backupType;
        if (action === 'season_end') {
            backupId = `season_end_${endedYear}`; // stable id -> idempotent one-time snapshot
            backupType = 'season_end';
        } else {
            // Weekly snapshot: timestamped id (YYYY-MM-DD_HH-mm-ss).
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            backupId = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}_CRON`;
            backupType = 'scheduled_weekly';
        }

        const backupPath = `_backups/${backupId}/bookings`;

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
        metaBatch.set(db.doc(`_backups/${backupId}`), {
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            timestampId: backupId,
            count: snapshot.size,
            type: backupType
        });
        chunks.push(metaBatch);

        await Promise.all(chunks.map(b => b.commit()));

        logger.info(`Successfully completed ${backupType} backup: ${backupId} with ${snapshot.size} records.`);

    } catch (error) {
        logger.error("Failed to run scheduled backup:", error);
    }
});
