const admin = require('firebase-admin');
const fs = require('fs');
const serviceAccount = JSON.parse(fs.readFileSync('../service-account-key.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function check() {
  const snapshot = await db.collection('bookings').where('shareholderName', 'in', ['Melanie and Dom', 'melanie and dom']).get();
  console.log("Found bookings for Melanie and Dom:", snapshot.size);
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log("- Action Type:", data.type, "| Passed/Finalized:", data.isFinalized);
  });
}

check().catch(console.error);
