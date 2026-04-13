#!/usr/bin/env node
/* eslint-disable */
// One-shot: create super_admin user + shareholder doc on dev Firebase.
// Usage: node scripts/bootstrap-dev-admin.cjs <email> <password> <name>

const admin = require('../functions/node_modules/firebase-admin');
const https = require('https');

const [,, email, password, name] = process.argv;
if (!email || !password || !name) {
  console.error('Usage: node scripts/bootstrap-dev-admin.cjs <email> <password> <name>');
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
  let resp = await post(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
    { email, password, returnSecureToken: true });

  if (resp.status !== 200 && resp.body?.error?.message === 'EMAIL_EXISTS') {
    console.log('✓ Auth user already exists, signing in for uid...');
    resp = await post(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
      { email, password, returnSecureToken: true });
  }
  if (resp.status !== 200) {
    console.error('Auth error:', resp.body);
    process.exit(1);
  }
  console.log(`✓ Auth user: ${resp.body.localId}`);

  admin.initializeApp({ projectId: 'hhr-trailer-booking-dev' });
  const db = admin.firestore();
  const docRef = db.collection('shareholders').doc(email.toLowerCase());
  await docRef.set({
    email: email.toLowerCase(),
    name,
    role: 'super_admin',
    order: 1,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  console.log(`✓ shareholders/${email.toLowerCase()} → role=super_admin`);

  console.log('\n✓ Done. Log in at https://hhr-trailer-booking-dev.web.app');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
