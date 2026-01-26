
const admin = require("firebase-admin");

// Initialize existing app or create new one
if (admin.apps.length === 0) {
    var serviceAccount = require("../serviceAccountKey.json");
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function simulateBookingLifecycle() {
    console.log("🎬 Starting Booking Lifecycle Simulation...");
    const bookingId = "SIMULATION_" + Date.now();
    const docRef = db.collection("bookings").doc(bookingId);

    // 1. Create as Pending
    console.log(`[1/2] Creating Booking ${bookingId} as PENDING...`);
    await docRef.set({
        createdAt: new Date(),
        uid: "user_123",
        cabinId: "7",
        checkInDate: new Date("2026-06-01"),
        checkOutDate: new Date("2026-06-08"),
        status: "pending",
        test: true
    });
    console.log("   -> Done. Wait 5s for trigger...");
    await new Promise(r => setTimeout(r, 5000));

    // 2. Update to Confirmed
    console.log(`[2/2] Updating Booking ${bookingId} to CONFIRMED...`);
    await docRef.update({
        status: "confirmed"
    });
    console.log("   -> Done. This SHOULD fire the 'Turn Ended' logic.");
}

simulateBookingLifecycle();
