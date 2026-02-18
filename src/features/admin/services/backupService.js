import { collection, doc, writeBatch, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { format } from 'date-fns';

/**
 * Creates a backup of all current bookings to a separate Firestore collection.
 * Collection Path: _backups/{timestamp_id}/bookings/{bookingId}
 * @returns {Promise<string>} The backup ID (timestamp string)
 */
export const backupBookingsToFirestore = async () => {
    try {
        const bookingsRef = collection(db, 'bookings');
        const snapshot = await getDocs(bookingsRef);

        if (snapshot.empty) {
            console.log("No bookings to backup.");
            return null;
        }

        const timestampId = format(new Date(), "yyyy-MM-dd_HH-mm-ss");
        const backupPath = `_backups/${timestampId}/bookings`;

        // Firestore batches allow max 500 ops. We'll chunk them.
        const chunks = [];
        let batch = writeBatch(db);
        let count = 0;

        snapshot.docs.forEach((docSnap) => {
            const data = docSnap.data();
            const backupRef = doc(db, backupPath, docSnap.id);
            batch.set(backupRef, { ...data, _backupAt: serverTimestamp() });

            count++;
            if (count >= 490) { // Safety margin
                chunks.push(batch);
                batch = writeBatch(db);
                count = 0;
            }
        });

        if (count > 0) chunks.push(batch);

        // Save Metadata Doc so we can list backups easily
        const metaBatch = writeBatch(db);
        metaBatch.set(doc(db, '_backups', timestampId), {
            createdAt: serverTimestamp(),
            timestampId,
            count: snapshot.size,
            type: 'manual_wipe_safety'
        });
        chunks.push(metaBatch);

        await Promise.all(chunks.map(b => b.commit()));
        console.log(`Backup completed: ${timestampId} (${snapshot.size} records)`);
        return timestampId;

    } catch (error) {
        console.error("Backup failed:", error);
        throw new Error("Backup failed: " + error.message);
    }
};

/**
 * Returns a list of available backups ordered by date (newest first).
 */
export const getAvailableBackups = async () => {
    try {
        const snap = await getDocs(collection(db, '_backups'));
        return snap.docs
            .map(d => d.data())
            .sort((a, b) => (b.timestampId > a.timestampId ? 1 : -1)); // String sort works for ISO-like timestamps
    } catch (e) {
        console.error("Failed to list backups:", e);
        return [];
    }
};

/**
 * Restores a specific backup, OVERWRITING current bookings.
 * @param {string} timestampId 
 */
export const restoreBackup = async (timestampId) => {
    try {
        const backupPath = `_backups/${timestampId}/bookings`;
        const backupSnap = await getDocs(collection(db, backupPath));

        if (backupSnap.empty) throw new Error("Backup is empty or not found.");

        // 1. Wipe current bookings
        const currentSnap = await getDocs(collection(db, 'bookings'));
        const batch1 = writeBatch(db);
        currentSnap.docs.forEach(d => batch1.delete(d.ref));
        await batch1.commit();

        // 2. Restore from backup
        const chunks = [];
        let batch2 = writeBatch(db);
        let count = 0;

        backupSnap.docs.forEach(d => {
            const data = d.data();
            // Remove backup metadata if any
            delete data._backupAt;

            const ref = doc(db, 'bookings', d.id);
            batch2.set(ref, data);

            count++;
            if (count >= 490) {
                chunks.push(batch2);
                batch2 = writeBatch(db);
                count = 0;
            }
        });

        if (count > 0) chunks.push(batch2);
        await Promise.all(chunks.map(b => b.commit()));

        return backupSnap.size;
    } catch (e) {
        throw new Error("Restore failed: " + e.message);
    }
};

/**
 * Deletes a backup and its subcollections.
 * @param {string} timestampId 
 */
export const deleteBackup = async (timestampId) => {
    try {
        const backupPath = `_backups/${timestampId}/bookings`;
        const backupSnap = await getDocs(collection(db, backupPath));

        // 1. Delete all bookings in the backup
        const chunks = [];
        let batch = writeBatch(db);
        let count = 0;

        backupSnap.docs.forEach(d => {
            batch.delete(d.ref);
            count++;
            if (count >= 490) {
                chunks.push(batch);
                batch = writeBatch(db);
                count = 0;
            }
        });

        if (count > 0) chunks.push(batch);
        await Promise.all(chunks.map(b => b.commit()));

        // 2. Delete the metadata document
        await deleteDoc(doc(db, '_backups', timestampId));

        return true;
    } catch (e) {
        console.error("Delete backup failed:", e);
        throw new Error("Delete failed: " + e.message);
    }
};

/**
 * Generates and triggers a browser download of all bookings as a CSV file.
 * @param {Array} bookings - Array of booking objects
 */
export const exportBookingsToCSV = (bookings) => {
    if (!bookings || bookings.length === 0) return;

    try {
        const headers = [
            "ID", "Shareholder", "Cabin", "Check In", "Check Out",
            "Total Price", "Status", "Created At"
        ];

        const rows = bookings.map(b => [
            b.id,
            `"${b.shareholderName || ''}"`,
            b.cabinNumber || '?',
            b.from ? format(b.from instanceof Date ? b.from : b.from.toDate(), 'yyyy-MM-dd') : '',
            b.to ? format(b.to instanceof Date ? b.to : b.to.toDate(), 'yyyy-MM-dd') : '',
            b.totalPrice || 0,
            b.status || 'draft',
            b.createdAt ? format(b.createdAt instanceof Date ? b.createdAt : b.createdAt.toDate(), 'yyyy-MM-dd HH:mm') : ''
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        const timestamp = format(new Date(), "yyyy-MM-dd_HH-mm-ss");
        link.setAttribute('href', url);
        link.setAttribute('download', `bookings_backup_${timestamp}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (error) {
        console.error("CSV Export failed:", error);
        // Non-blocking error, we don't throw here to avoid stopping the main process if download fails locally
    }
};
