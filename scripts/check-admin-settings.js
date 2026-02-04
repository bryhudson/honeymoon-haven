const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function checkSettings() {
    console.log("Checking settings/general...");
    const doc = await db.collection('settings').doc('general').get();
    if (doc.exists) {
        console.log("Settings Found:", doc.data());
    } else {
        console.log("No settings/general doc found.");
    }
}

checkSettings().catch(console.error);
