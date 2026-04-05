import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';

let testEnv: RulesTestEnvironment;

describe('Firestore Security Rules', () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'hhr-test',
      firestore: {
        host: '127.0.0.1',
        port: 8080,
        rules: readFileSync('firestore.rules', 'utf8'),
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  describe('Out-of-turn Booking Protection', () => {
    it(`allows booking when it is the user's turn`, async () => {
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
      const aliceContext = testEnv.authenticatedContext('alice-uid', { email: 'alice@example.com' });
      const aliceDb = aliceContext.firestore();

      await assertFails(
        aliceDb.doc('shareholder_status/alice-uid').set({
          completed: true,
        })
      );
    });

    it('allows admin to write to shareholder_status', async () => {
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
});
