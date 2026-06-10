// Locks in the open-season 48h cooldown rule, extracted from BookingSection
// into a pure helper after the audit found three defects in the inline version:
//   1. it counted CANCELLED bookings (blocking cancel-and-rebook),
//   2. it compared shareholderName with === (legacy docs store variants like
//      "Mike & Janelle" vs canonical "Janelle and Mike", so the cooldown
//      silently never applied to those shareholders),
//   3. it counted rotation (Round 1/2) bookings, wrongly delaying a
//      shareholder's first open-season booking right after Round 2.
//
// Rule: a shareholder must wait 48 hours after their last FINALIZED,
// non-cancelled OPEN_SEASON booking before booking again.

import { describe, it, expect } from 'vitest';
import { getOpenSeasonCooldown } from '../src/lib/openSeasonCooldown';

const NOW = new Date('2026-06-10T12:00:00-07:00');
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 60 * 60 * 1000);

const osBooking = (over: Record<string, unknown> = {}) => ({
    shareholderName: 'Janelle and Mike',
    type: 'booking',
    isFinalized: true,
    phase: 'OPEN_SEASON',
    createdAt: hoursAgo(10),
    ...over,
});

describe('getOpenSeasonCooldown', () => {
    it('no bookings: not blocked', () => {
        expect(getOpenSeasonCooldown([], 'Janelle and Mike', NOW).blocked).toBe(false);
    });

    it('open-season booking 10h ago: blocked with ~38h remaining', () => {
        const res = getOpenSeasonCooldown([osBooking()], 'Janelle and Mike', NOW);
        expect(res.blocked).toBe(true);
        expect(res.hoursRemaining).toBeGreaterThan(37);
        expect(res.hoursRemaining).toBeLessThanOrEqual(38);
    });

    it('open-season booking 49h ago: not blocked', () => {
        const res = getOpenSeasonCooldown([osBooking({ createdAt: hoursAgo(49) })], 'Janelle and Mike', NOW);
        expect(res.blocked).toBe(false);
    });

    it('cancelled open-season booking does NOT block (cancel-and-rebook allowed)', () => {
        const res = getOpenSeasonCooldown([osBooking({ type: 'cancelled' })], 'Janelle and Mike', NOW);
        expect(res.blocked).toBe(false);
    });

    it('pass and auto-pass records do NOT block', () => {
        const recs = [osBooking({ type: 'pass' }), osBooking({ type: 'auto-pass' })];
        expect(getOpenSeasonCooldown(recs, 'Janelle and Mike', NOW).blocked).toBe(false);
    });

    it('rotation bookings (phase ROUND_1/ROUND_2) do NOT block', () => {
        const recs = [osBooking({ phase: 'ROUND_1' }), osBooking({ phase: 'ROUND_2' })];
        expect(getOpenSeasonCooldown(recs, 'Janelle and Mike', NOW).blocked).toBe(false);
    });

    it('drafts (isFinalized false) do NOT block', () => {
        const res = getOpenSeasonCooldown([osBooking({ isFinalized: false })], 'Janelle and Mike', NOW);
        expect(res.blocked).toBe(false);
    });

    it('matches legacy name variants via normalizeName ("Mike & Janelle" doc vs canonical lookup)', () => {
        const res = getOpenSeasonCooldown([osBooking({ shareholderName: 'Mike & Janelle' })], 'Janelle and Mike', NOW);
        expect(res.blocked).toBe(true);
    });

    it('does not block a DIFFERENT shareholder', () => {
        const res = getOpenSeasonCooldown([osBooking()], 'Lori and Jeff', NOW);
        expect(res.blocked).toBe(false);
    });

    it('handles Firestore Timestamp-like createdAt', () => {
        const ts = { toDate: () => hoursAgo(5) };
        const res = getOpenSeasonCooldown([osBooking({ createdAt: ts })], 'Janelle and Mike', NOW);
        expect(res.blocked).toBe(true);
    });

    it('uses the MOST RECENT qualifying booking when several exist', () => {
        const recs = [osBooking({ createdAt: hoursAgo(100) }), osBooking({ createdAt: hoursAgo(2) })];
        const res = getOpenSeasonCooldown(recs, 'Janelle and Mike', NOW);
        expect(res.blocked).toBe(true);
        expect(res.hoursRemaining).toBeGreaterThan(45);
    });
});
