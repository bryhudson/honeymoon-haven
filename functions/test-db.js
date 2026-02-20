const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../../service-account-key.json');
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
async function run() {
  const snapshot = await db.collection('bookings').where('shareholderName', '==', 'Melanie and Dom').get();
  console.log("Melanie and Dom bookings:", snapshot.size);
  snapshot.forEach(doc => console.log(doc.data().type, doc.data().isFinalized));
}
run();
