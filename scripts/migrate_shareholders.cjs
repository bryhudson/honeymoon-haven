
const admin = require("firebase-admin");

// Initialize HHR Firebase
if (admin.apps.length === 0) {
    // Note: User must have serviceAccountKey.json in the root to run this locally,
    // or run it via Firebase Functions shell / environment where it's already initialized.
    try {
        const serviceAccount = require("../serviceAccountKey.json");
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch (e) {
        console.log("No serviceAccountKey.json found. Attempting default initialization...");
        admin.initializeApp();
    }
}

const db = admin.firestore();

const NAME_MAP = {
    "Gerry & Georgina": "Georgina and Jerry",
    "Gerry and Georgina": "Georgina and Jerry",
    "Mike & Janelle": "Janelle and Mike",
    "Mike and Janelle": "Janelle and Mike",
    "Brian & Monique": "Monique and Brian",
    "Brian and Monique": "Monique and Brian",
    "Brian & Sam": "Sam and Brian",
    "Brian and Sam": "Sam and Brian",
    "Ernest & Sandy": "Sandy and Ernest",
    "Ernest and Sandy": "Sandy and Ernest",
    "Jeff & Lori": "Lori and Jeff",
    "Jeff and Lori": "Lori and Jeff",
    "David & Gayla": "Gayla and David",
    "David and Gayla": "Gayla and David",
    "Saurabh & Jessica": "Jessica and Saurabh",
    "Saurabh and Jessica": "Jessica and Saurabh",
    "Dom & Melanie": "Melanie and Dom",
    "Dom and Melanie": "Melanie and Dom",
    "Julia, Mandy & Bryan": "Julia, Mandy and Bryan"
};

async function migrate() {
    console.log("🚀 Starting HHR Shareholder Name Migration...");

    // 1. Update 'shareholders' collection
    console.log("\n📈 [1/4] Updating 'shareholders' collection...");
    const shareholdersSnap = await db.collection("shareholders").get();
    let shCount = 0;
    for (const doc of shareholdersSnap.docs) {
        const data = doc.data();
        if (NAME_MAP[data.name]) {
            await doc.ref.update({ name: NAME_MAP[data.name] });
            console.log(`   ✅ Updated ${data.name} -> ${NAME_MAP[data.name]}`);
            shCount++;
        }
    }
    console.log(`   Done. Updated ${shCount} shareholders.`);

    // 2. Update 'bookings' collection
    console.log("\n📅 [2/4] Updating 'bookings' collection...");
    const bookingsSnap = await db.collection("bookings").get();
    let bCount = 0;
    for (const doc of bookingsSnap.docs) {
        const data = doc.data();
        if (NAME_MAP[data.shareholderName]) {
            await doc.ref.update({ shareholderName: NAME_MAP[data.shareholderName] });
            console.log(`   ✅ Updated Booking ${doc.id}: ${data.shareholderName} -> ${NAME_MAP[data.shareholderName]}`);
            bCount++;
        }
    }
    console.log(`   Done. Updated ${bCount} bookings.`);

    // 3. Update 'status/draftStatus'
    console.log("\n🚦 [3/4] Updating 'status/draftStatus'...");
    const statusRef = db.collection("status").doc("draftStatus");
    const statusDoc = await statusRef.get();
    if (statusDoc.exists) {
        const data = statusDoc.data();
        const updates = {};
        if (NAME_MAP[data.activePicker]) {
            updates.activePicker = NAME_MAP[data.activePicker];
            console.log(`   ✅ Updated activePicker: ${data.activePicker} -> ${updates.activePicker}`);
        }
        if (NAME_MAP[data.nextPicker]) {
            updates.nextPicker = NAME_MAP[data.nextPicker];
            console.log(`   ✅ Updated nextPicker: ${data.nextPicker} -> ${updates.nextPicker}`);
        }
        if (Object.keys(updates).length > 0) {
            await statusRef.update(updates);
        }
    }
    console.log("   Done.");

    // 4. Notification Log Migration (Rekeying)
    console.log("\n🔔 [4/4] Rekeying 'notification_log' documents...");
    const logSnap = await db.collection("notification_log").get();
    let lCount = 0;
    for (const doc of logSnap.docs) {
        const id = doc.id; // e.g., "Gerry & Georgina-1"
        const data = doc.data();

        let newId = id;
        for (const [oldName, newName] of Object.entries(NAME_MAP)) {
            if (id.startsWith(oldName)) {
                newId = id.replace(oldName, newName);
                break;
            }
        }

        if (newId !== id) {
            console.log(`   🔄 Moving log ${id} -> ${newId}`);
            // Firestore doesn't support rekeying, so we copy and delete
            await db.collection("notification_log").doc(newId).set(data);
            await doc.ref.delete();
            lCount++;
        }
    }
    console.log(`   Done. Rekeyed ${lCount} log entries.`);

    console.log("\n✨ MIGRATION COMPLETE!");
}

migrate().catch(err => {
    console.error("❌ Migration failed:", err);
    process.exit(1);
});
