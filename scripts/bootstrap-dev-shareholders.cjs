#!/usr/bin/env node
/* eslint-disable */
// Create or reset Firebase Auth passwords on DEV for every shareholder doc.
// Each shareholder doc with a numeric id N gets password `cabin<N>` (e.g. doc id "7" → cabin7).
// Non-numeric ids (admins, super_admin) are skipped.
//
// Usage: node scripts/bootstrap-dev-shareholders.cjs
// Requires: `gcloud auth application-default login` + identitytoolkit.googleapis.com enabled on the project.
// Uses the Identity Toolkit admin REST API with an ADC access token and explicit X-Goog-User-Project
// header (firebase-admin's SDK does not forward the quota project for user creds).

const admin = require('../functions/node_modules/firebase-admin');
const https = require('https');
const { execSync } = require('child_process');

const PROJECT_ID = 'hhr-trailer-booking-dev';

function getAccessToken() {
  return execSync('gcloud auth application-default print-access-token', { encoding: 'utf8' }).trim();
}

function request(method, url, { token, body }) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'X-Goog-User-Project': PROJECT_ID,
      'Content-Type': 'application/json',
    };
    if (data) headers['Content-Length'] = Buffer.byteLength(data);
    const req = https.request(url, { method, headers }, res => {
      let chunks = '';
      res.on('data', c => chunks += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: chunks ? JSON.parse(chunks) : {} }); }
        catch { resolve({ status: res.statusCode, body: chunks }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function lookupByEmail(token, email) {
  const url = `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:lookup`;
  const resp = await request('POST', url, { token, body: { email: [email] } });
  if (resp.status !== 200) throw new Error(`lookup ${email}: ${JSON.stringify(resp.body)}`);
  return resp.body.users?.[0] || null;
}

async function updatePassword(token, localId, password) {
  const url = `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:update`;
  const resp = await request('POST', url, { token, body: { localId, password } });
  if (resp.status !== 200) throw new Error(`update ${localId}: ${JSON.stringify(resp.body)}`);
  return resp.body;
}

async function createUser(token, email, password) {
  const url = `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts`;
  const resp = await request('POST', url, { token, body: { email, password, emailVerified: true } });
  if (resp.status !== 200) throw new Error(`create ${email}: ${JSON.stringify(resp.body)}`);
  return resp.body;
}

(async () => {
  const token = getAccessToken();

  admin.initializeApp({ projectId: PROJECT_ID });
  const db = admin.firestore();

  const snap = await db.collection('shareholders').get();
  const rows = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(r => /^\d+$/.test(r.id) && r.email)
    .sort((a, b) => Number(a.id) - Number(b.id));

  console.log(`Found ${rows.length} numbered shareholders.\n`);

  let created = 0, updated = 0, failed = 0;
  const results = [];

  for (const r of rows) {
    const password = `cabin${r.id}`;
    const email = r.email.toLowerCase();
    try {
      const user = await lookupByEmail(token, email);
      if (user) {
        await updatePassword(token, user.localId, password);
        console.log(`  ↻ cabin${r.id} → ${email}  (${r.name}) — password reset`);
        updated++;
      } else {
        await createUser(token, email, password);
        console.log(`  ✓ cabin${r.id} → ${email}  (${r.name}) — created`);
        created++;
      }
      results.push({ cabin: `cabin${r.id}`, email, name: r.name });
    } catch (e) {
      console.error(`  ✗ cabin${r.id} ${email}: ${e.message}`);
      failed++;
    }
  }

  console.log(`\nCreated: ${created}, Updated: ${updated}, Failed: ${failed}\n`);
  console.log('Dev shareholder credentials:');
  console.log('─'.repeat(78));
  for (const row of results) {
    console.log(`  ${row.cabin.padEnd(8)} ${row.email.padEnd(38)} ${row.name || ''}`);
  }
  console.log('─'.repeat(78));
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
