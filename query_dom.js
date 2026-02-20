const admin = require('firebase-admin');
const fs = require('fs');
const serviceAccount = JSON.parse(fs.readFileSync('./service-account-key.json', 'utf8'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function check() {
    const snapshot = await db.collection('bookings').get();
    snapshot.forEach(doc => {
        const data = doc.data();
        if (data.shareholderName && data.shareholderName.toLowerCase().includes('dom')) {
            console.log("Found:", data.shareholderName, data.type, data.isFinalized);
        }
    });
    console.log("Done checking all bookings.");
}

check().catch(console.error);
