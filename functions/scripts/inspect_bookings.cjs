
const admin = require("firebase-admin");

// Initialize existing app or create new one
if (admin.apps.length === 0) {
    try {
        var serviceAccount = require("../serviceAccountKey.json");
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch (e) {
        // Fallback or assume default creds
        admin.initializeApp();
    }
}

const db = admin.firestore();

async function inspect() {
    console.log("🔍 Fetching last 10 bookings...");
    const snapshot = await db.collection("bookings").orderBy("createdAt", "desc").limit(10).get();

    if (snapshot.empty) {
        console.log("No bookings found.");
        return;
    }

    snapshot.docs.forEach(doc => {
        const d = doc.data();
        console.log("------------------------------------------------");
        console.log(`ID: ${doc.id}`);
        console.log(`Name: ${d.shareholderName}`);
        console.log(`Status: ${d.status}`);
        console.log(`Type: ${d.type}`);
        console.log(`Created: ${d.createdAt && d.createdAt.toDate ? d.createdAt.toDate().toISOString() : d.createdAt}`);
        console.log(`From: ${d.from && d.from.toDate ? d.from.toDate().toISOString() : d.from}`);
        console.log(`To: ${d.to && d.to.toDate ? d.to.toDate().toISOString() : d.to}`);
        console.log(`Finalized: ${d.isFinalized}`);
        console.log("------------------------------------------------");
    });
}

inspect();
