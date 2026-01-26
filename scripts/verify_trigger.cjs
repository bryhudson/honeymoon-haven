
const admin = require("firebase-admin");
const { getFirestore } = require("firebase-admin/firestore");

// Initialize existing app or create new one
if (admin.apps.length === 0) {
    var serviceAccount = require("../serviceAccountKey.json");
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = getFirestore();

async function pokeTrigger() {
    console.log("👉 Poking 'bookings' collection to wake up the trigger...");
    const testDocRef = db.collection("bookings").doc("TRIGGER_VITALITY_TEST");

    try {
        await testDocRef.set({
            createdAt: new Date(),
            test: true,
            status: 'test_ignore', // Should be ignored by logic but WILL fire the trigger
            note: "This is a smoke test to verify Cloud Functions are listening."
        });
        console.log("✅ Wrote test document. Check Cloud Function logs now.");
    } catch (error) {
        console.error("❌ Failed to write test doc:", error);
    }
}

pokeTrigger();
