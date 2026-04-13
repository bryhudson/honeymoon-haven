#!/usr/bin/env node
/* eslint-disable */
// Copy prod shareholders + settings/general → dev. Safe: overwrites dev only.
// Usage: node scripts/seed-dev-from-prod.cjs

const admin = require('../functions/node_modules/firebase-admin');

async function run() {
  const prod = admin.initializeApp({ projectId: 'hhr-trailer-booking' }, 'prod');
  const dev = admin.initializeApp({ projectId: 'hhr-trailer-booking-dev' }, 'dev');

  const prodDb = prod.firestore();
  const devDb = dev.firestore();

  // Shareholders
  const snap = await prodDb.collection('shareholders').get();
  console.log(`Found ${snap.size} shareholders in prod.`);
  const batch = devDb.batch();
  snap.forEach(doc => {
    batch.set(devDb.collection('shareholders').doc(doc.id), doc.data(), { merge: true });
  });
  await batch.commit();
  console.log(`✓ Copied ${snap.size} shareholders to dev`);

  // Ensure current user stays super_admin
  const me = 'bryan.m.hudson@gmail.com';
  await devDb.collection('shareholders').doc(me).set({ role: 'super_admin' }, { merge: true });
  console.log(`✓ Preserved super_admin on ${me}`);

  // Settings: reset dev to TEST MODE so it's safe
  await devDb.collection('settings').doc('general').set({
    isTestMode: true,
    bypassTenAM: false,
    isSystemFrozen: false,
    draftStartDate: admin.firestore.Timestamp.fromDate(new Date()),
  }, { merge: true });
  console.log(`✓ Dev settings/general → test mode, draft start = now`);

  console.log('\n✓ Dev seeded. https://hhr-trailer-booking-dev.web.app');
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
