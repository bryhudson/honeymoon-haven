#!/usr/bin/env node
/* eslint-disable */
// Seed two ADJACENT bookings on DEV to demo the turnover-day calendar visuals.
// Booking A (paid) checks out the same day Booking B (unpaid) checks in -> a turnover day.
// B's own check-out is a "lone check-out" (free night + corner accent).
// All docs are tagged { seededTest: true } so they are easy to find and remove.
//
// Usage:   node scripts/seed-turnover-dev.cjs
// Cleanup: node scripts/seed-turnover-dev.cjs --clean

const admin = require('../functions/node_modules/firebase-admin');

const PROJECT_ID = 'hhr-trailer-booking-dev';
const app = admin.initializeApp({ projectId: PROJECT_ID });
const db = app.firestore();
const T = admin.firestore.Timestamp;

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d, n) => { const x = startOfDay(d); x.setDate(x.getDate() + n); return x; };
const fmt = (d) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

async function clean() {
    const snap = await db.collection('bookings').where('seededTest', '==', true).get();
    if (snap.empty) { console.log('No seeded test bookings to remove.'); return; }
    const batch = db.batch();
    snap.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    console.log(`Removed ${snap.size} seeded test booking(s).`);
}

async function seed() {
    // Real shareholders (numeric doc id = cabin number) for realistic names/cabins.
    const shSnap = await db.collection('shareholders').get();
    const shareholders = shSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(s => /^\d+$/.test(s.id))
        .sort((a, b) => Number(a.id) - Number(b.id));
    const A = shareholders[0] || { id: '1', name: 'Test Shareholder A' };
    const B = shareholders[1] || { id: '2', name: 'Test Shareholder B' };

    // Occupied nights from existing (non-cancelled/pass) bookings.
    const bSnap = await db.collection('bookings').get();
    const occupied = new Set();
    bSnap.docs.map(d => d.data()).forEach(b => {
        if (!b || ['pass', 'auto-pass', 'cancelled'].includes(b.type) || !b.from || !b.to) return;
        const from = b.from.toDate ? b.from.toDate() : new Date(b.from);
        const to = b.to.toDate ? b.to.toDate() : new Date(b.to);
        for (let d = startOfDay(from); d < startOfDay(to); d = addDays(d, 1)) occupied.add(d.getTime());
    });

    // First free 7-night window from a few days out, within the 2026 season.
    const seasonStart = new Date(2026, 4, 1);   // May 1, 2026
    const seasonEnd = new Date(2026, 8, 30);    // Sep 30, 2026
    let search = addDays(new Date(Math.max(Date.now(), seasonStart.getTime())), 3);
    let chosen = null;
    for (let d = startOfDay(search); d <= addDays(seasonEnd, -7); d = addDays(d, 1)) {
        let free = true;
        for (let k = 0; k < 7; k++) if (occupied.has(addDays(d, k).getTime())) { free = false; break; }
        if (free) { chosen = new Date(d); break; }
    }
    if (!chosen) { console.error('No free 7-night window found in the season.'); process.exit(1); }

    const aFrom = chosen, aTo = addDays(chosen, 4);          // A: 4 nights, checks out aTo
    const bFrom = addDays(chosen, 4), bTo = addDays(chosen, 7); // B: 3 nights, checks in bFrom (== aTo = turnover)

    const mk = (sh, from, to, isPaid) => ({
        shareholderName: sh.name,
        cabinNumber: sh.cabin ?? sh.id,
        partyName: sh.name,
        email: sh.email || '',
        type: 'booking',
        from: T.fromDate(from),
        to: T.fromDate(to),
        guests: 2,
        isFinalized: true,
        isPaid,
        totalPrice: 0,
        phase: 'OPEN_SEASON',
        createdAt: T.now(),
        updatedAt: T.now(),
        seededTest: true,
    });

    const aRef = await db.collection('bookings').add(mk(A, aFrom, aTo, true));
    const bRef = await db.collection('bookings').add(mk(B, bFrom, bTo, false));

    console.log('Seeded turnover demo on DEV:');
    console.log(`  A (paid)   ${A.name} #${A.cabin ?? A.id}: ${fmt(aFrom)} -> ${fmt(aTo)}   [${aRef.id}]`);
    console.log(`  B (unpaid) ${B.name} #${B.cabin ?? B.id}: ${fmt(bFrom)} -> ${fmt(bTo)}   [${bRef.id}]`);
    console.log('');
    console.log(`  >> TURNOVER day (diagonal split):  ${fmt(bFrom)}`);
    console.log(`  >> LONE check-out (corner accent): ${fmt(bTo)}`);
}

(async () => {
    if (process.argv.includes('--clean')) await clean();
    else await seed();
    process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
