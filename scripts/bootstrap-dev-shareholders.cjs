#!/usr/bin/env node
/* eslint-disable */
// Create Firebase Auth users on DEV for every shareholder doc.
// Uses a shared password so you can log in as any of them for testing.
// Usage: node scripts/bootstrap-dev-shareholders.cjs <shared-password>

const admin = require('../functions/node_modules/firebase-admin');
const https = require('https');

const [,, sharedPassword] = process.argv;
if (!sharedPassword) {
  console.error('Usage: node scripts/bootstrap-dev-shareholders.cjs <shared-password>');
  process.exit(1);
}

const API_KEY = 'AIzaSyAQJMQU-WFpUUcNslW5OAET2WQE9Cg88TE';

function post(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
    }, res => {
      let chunks = '';
      res.on('data', c => chunks += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(chunks) }); }
        catch { resolve({ status: res.statusCode, body: chunks }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

(async () => {
  admin.initializeApp({ projectId: 'hhr-trailer-booking-dev' });
  const db = admin.firestore();

  const snap = await db.collection('shareholders').get();
  console.log(`Found ${snap.size} shareholders.`);

  let created = 0, skipped = 0, failed = 0;
  for (const doc of snap.docs) {
    const { email, name } = doc.data();
    if (!email) { console.warn(`Skipped ${doc.id}: no email field`); skipped++; continue; }

    const resp = await post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
      { email, password: sharedPassword, returnSecureToken: true }
    );

    if (resp.status === 200) {
      console.log(`  ✓ ${email} (${name})`);
      created++;
    } else if (resp.body?.error?.message === 'EMAIL_EXISTS') {
      console.log(`  → ${email} already exists, skipping`);
      skipped++;
    } else {
      console.error(`  ✗ ${email}: ${resp.body?.error?.message || JSON.stringify(resp.body)}`);
      failed++;
    }
  }

  console.log(`\nCreated: ${created}, Skipped: ${skipped}, Failed: ${failed}`);
  console.log(`\nShared password for all dev accounts: ${sharedPassword}`);
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
