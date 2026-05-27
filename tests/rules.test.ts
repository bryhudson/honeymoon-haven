import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';

let testEnv: RulesTestEnvironment;
let emulatorAvailable = true;

describe('Firestore Security Rules', () => {
  beforeAll(async () => {
    try {
      testEnv = await initializeTestEnvironment({
        projectId: 'hhr-test',
        firestore: {
          host: '127.0.0.1',
          port: 8080,
          rules: readFileSync('firestore.rules', 'utf8'),
        },
      });
    } catch (err) {
      emulatorAvailable = false;
      console.warn('Firestore emulator not running - skipping rules tests. Start with: firebase emulators:start');
    }
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async () => {
    if (!emulatorAvailable) return;
    await testEnv.clearFirestore();
  });

  describe('Out-of-turn Booking Protection', () => {
    it(`allows booking when it is the user's turn`, async () => {
      if (!emulatorAvailable) return;
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await db.doc('status/draftStatus').set({
          phase: 'ROUND_1',
          activePicker: 'Alice',
        });
      });

      const aliceContext = testEnv.authenticatedContext('alice-uid', { email: 'alice@example.com' });
      const aliceDb = aliceContext.firestore();

      await assertSucceeds(
        aliceDb.collection('bookings').add({
          shareholderName: 'Alice',
          uid: 'alice-uid',
          type: 'booking',
          from: new Date(),
          to: new Date(Date.now() + 86400000),
        })
      );
    });

    it(`denies booking when it is NOT the user's turn`, async () => {
      if (!emulatorAvailable) return;
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await db.doc('status/draftStatus').set({
          phase: 'ROUND_1',
          activePicker: 'Bob', // It's Bob's turn
        });
      });

      const aliceContext = testEnv.authenticatedContext('alice-uid', { email: 'alice@example.com' });
      const aliceDb = aliceContext.firestore();

      await assertFails(
        aliceDb.collection('bookings').add({
          shareholderName: 'Alice', // Alice is trying to book
          uid: 'alice-uid',
          type: 'booking',
          from: new Date(),
          to: new Date(Date.now() + 86400000),
        })
      );
    });

    it('allows booking when draft is in OPEN_SEASON', async () => {
      if (!emulatorAvailable) return;
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await db.doc('status/draftStatus').set({
          phase: 'OPEN_SEASON', // Open season
          activePicker: 'None',
        });
      });

      const aliceContext = testEnv.authenticatedContext('alice-uid', { email: 'alice@example.com' });
      const aliceDb = aliceContext.firestore();

      await assertSucceeds(
        aliceDb.collection('bookings').add({
          shareholderName: 'Alice',
          uid: 'alice-uid',
          type: 'booking',
          from: new Date(),
          to: new Date(Date.now() + 86400000),
        })
      );
    });

    it('allows cancelling a booking even if not their turn', async () => {
      if (!emulatorAvailable) return;
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await db.doc('status/draftStatus').set({
          phase: 'ROUND_1',
          activePicker: 'Bob', // Not Alice's turn
        });
      });

      const aliceContext = testEnv.authenticatedContext('alice-uid', { email: 'alice@example.com' });
      const aliceDb = aliceContext.firestore();

      // Alice cancels her own booking
      await assertSucceeds(
        aliceDb.collection('bookings').add({
          shareholderName: 'Alice',
          uid: 'alice-uid',
          type: 'cancelled', // type is cancelled
        })
      );
    });
  });

  describe('Shareholder Status Restrict Writes', () => {
    it('denies user writing to own shareholder_status', async () => {
      if (!emulatorAvailable) return;
      const aliceContext = testEnv.authenticatedContext('alice-uid', { email: 'alice@example.com' });
      const aliceDb = aliceContext.firestore();

      await assertFails(
        aliceDb.doc('shareholder_status/alice-uid').set({
          completed: true,
        })
      );
    });

    it('allows admin to write to shareholder_status', async () => {
      if (!emulatorAvailable) return;
      // First setup admin
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().doc('shareholders/admin@example.com').set({
          role: 'admin'
        });
      });

      const adminContext = testEnv.authenticatedContext('admin-uid', { email: 'admin@example.com' });
      const adminDb = adminContext.firestore();

      await assertSucceeds(
        adminDb.doc('shareholder_status/alice-uid').set({
          completed: true,
        })
      );
    });
  });

  describe('Booking update field protection', () => {
    async function seedBooking(overrides: Record<string, unknown> = {}) {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().doc('status/draftStatus').set({ phase: 'OPEN_SEASON', activePicker: 'None' });
        await context.firestore().doc('bookings/bk1').set({
          shareholderName: 'Alice', uid: 'alice-uid', type: 'booking',
          from: new Date(), to: new Date(Date.now() + 86400000),
          isPaid: false, isFinalized: false, totalPrice: 100,
          ...overrides,
        });
      });
    }
    const aliceDb = () => testEnv.authenticatedContext('alice-uid', { email: 'alice@example.com' }).firestore();
    async function asAdmin() {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().doc('shareholders/admin@example.com').set({ role: 'admin' });
      });
      return testEnv.authenticatedContext('admin-uid', { email: 'admin@example.com' }).firestore();
    }

    it('lets the owner finalize their booking (false -> true)', async () => {
      if (!emulatorAvailable) return;
      await seedBooking();
      await assertSucceeds(aliceDb().doc('bookings/bk1').update({ isFinalized: true }));
    });

    it('lets the owner edit dates and the recomputed totalPrice', async () => {
      if (!emulatorAvailable) return;
      await seedBooking();
      await assertSucceeds(aliceDb().doc('bookings/bk1').update({ to: new Date(Date.now() + 3 * 86400000), totalPrice: 300 }));
    });

    it('denies the owner self-marking the booking paid', async () => {
      if (!emulatorAvailable) return;
      await seedBooking();
      await assertFails(aliceDb().doc('bookings/bk1').update({ isPaid: true }));
    });

    it('denies the owner un-finalizing a finalized booking', async () => {
      if (!emulatorAvailable) return;
      await seedBooking({ isFinalized: true });
      await assertFails(aliceDb().doc('bookings/bk1').update({ isFinalized: false }));
    });

    it('denies the owner reassigning ownership (uid)', async () => {
      if (!emulatorAvailable) return;
      await seedBooking();
      await assertFails(aliceDb().doc('bookings/bk1').update({ uid: 'bob-uid' }));
    });

    it('lets an admin mark a booking paid', async () => {
      if (!emulatorAvailable) return;
      await seedBooking();
      const adminDb = await asAdmin();
      await assertSucceeds(adminDb.doc('bookings/bk1').update({ isPaid: true }));
    });
  });
});
