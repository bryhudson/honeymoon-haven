const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../../service-account-key.json');
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function checkBookings() {
    const snapshot = await db.collection("bookings")
        .where("isFinalized", "==", true)
        .where("isPaid", "==", false)
        .limit(10)
        .get();

    console.log(`Found ${snapshot.size} finalized unpaid bookings.`);
    snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`\nBooking ${doc.id}:`);
        console.log(`- type/status: ${data.type} / ${data.status}`);
        console.log(`- createdAt: ${data.createdAt ? data.createdAt.toDate().toISOString() : 'MISSING'}`);
        console.log(`- remindersSent:`, data.remindersSent || 'None');
    });

    const allBookings = await db.collection("bookings").where("status", "==", "confirmed").where("isPaid", "==", false).limit(10).get();
    console.log(`\nFound ${allBookings.size} 'confirmed' unpaid bookings.`);
    allBookings.forEach(doc => {
        const data = doc.data();
        console.log(`Booking ${doc.id}: isFinalized=${data.isFinalized}, createdAt=${data.createdAt ? 'EXISTS' : 'MISSING'}`);
    });
}

checkBookings().catch(console.error);
