import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('/Users/bryanhudson/dev/hhr/honeymoon-haven/service-account-key.json', 'utf8'));

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function check() {
  const snapshot = await db.collection('bookings').get();

  let count = 0;
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.shareholderName && data.shareholderName.toLowerCase() === 'melanie and dom') {
      console.log(`- Type: ${data.type}, Status: ${data.status}, isFinalized: ${data.isFinalized}`);
      count++;
    }
  });
  console.log("Total matched bookings:", count);
}

check().catch(console.error);
