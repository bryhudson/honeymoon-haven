// Locks in the cloud-side overlap math in functions/helpers/availability.js.
// Mirrors the client's src/lib/availability.ts nightsOverlap semantics (half-open
// [from, to): a checkout day is the next guest's check-in day), but normalizes to
// Pacific calendar days explicitly because Cloud Functions run in UTC.
//
// Regression context: the onBookingChangeTrigger overlap check compared raw
// timestamps, so a booking stored with a non-midnight time-of-day (e.g. checkout
// 2026-08-26T19:00Z, noon PDT) falsely "overlapped" the next guest's check-in at
// 2026-08-26T07:00Z (midnight PDT) and auto-cancelled their booking.

import { describe, it, expect } from 'vitest';
import { nightsOverlap, pacificDayKey } from '../functions/helpers/availability.js';

describe('pacificDayKey', () => {
    it('maps a midnight-PDT timestamp to its Pacific calendar day', () => {
        expect(pacificDayKey(new Date('2026-08-26T07:00:00Z'))).toBe('2026-08-26');
    });

    it('maps a noon-PDT timestamp to the SAME Pacific calendar day', () => {
        expect(pacificDayKey(new Date('2026-08-26T19:00:00Z'))).toBe('2026-08-26');
    });

    it('maps a late-evening-PDT timestamp (early UTC next day) to the Pacific day', () => {
        // 2026-08-27T05:00Z = Aug 26, 10 PM PDT -> Pacific day is Aug 26
        expect(pacificDayKey(new Date('2026-08-27T05:00:00Z'))).toBe('2026-08-26');
    });

    it('handles Firestore Timestamp-like objects and ISO strings', () => {
        const ts = { toDate: () => new Date('2026-08-26T19:00:00Z') };
        expect(pacificDayKey(ts)).toBe('2026-08-26');
        expect(pacificDayKey('2026-08-26T07:00:00Z')).toBe('2026-08-26');
    });

    it('returns null for missing or unparseable input', () => {
        expect(pacificDayKey(null)).toBe(null);
        expect(pacificDayKey(undefined)).toBe(null);
        expect(pacificDayKey('not-a-date')).toBe(null);
    });
});

describe('nightsOverlap (cloud)', () => {
    it('REGRESSION: checkout day with a time-of-day does NOT overlap the next check-in (Janelle repro)', () => {
        // Sam & Brian: Aug 24 -> Aug 26 (checkout stored at 19:00Z / noon PDT)
        // Janelle:     Aug 26 -> Aug 30 (check-in stored at 07:00Z / midnight PDT)
        // Sam & Brian's last night is Aug 25; Janelle arrives Aug 26. No conflict.
        const result = nightsOverlap(
            new Date('2026-08-26T07:00:00Z'), new Date('2026-08-30T07:00:00Z'),
            new Date('2026-08-24T19:00:00Z'), new Date('2026-08-26T19:00:00Z')
        );
        expect(result).toBe(false);
    });

    it('detects a genuine shared night', () => {
        // Aug 25 -> Aug 27 vs Aug 26 -> Aug 30 share the night of Aug 26.
        const result = nightsOverlap(
            new Date('2026-08-26T07:00:00Z'), new Date('2026-08-30T07:00:00Z'),
            new Date('2026-08-25T07:00:00Z'), new Date('2026-08-27T07:00:00Z')
        );
        expect(result).toBe(true);
    });

    it('checkout day equals check-in day at identical times: no overlap (half-open)', () => {
        const result = nightsOverlap(
            new Date('2026-08-26T07:00:00Z'), new Date('2026-08-28T07:00:00Z'),
            new Date('2026-08-24T07:00:00Z'), new Date('2026-08-26T07:00:00Z')
        );
        expect(result).toBe(false);
    });

    it('full containment overlaps', () => {
        const result = nightsOverlap(
            new Date('2026-08-26T07:00:00Z'), new Date('2026-08-30T07:00:00Z'),
            new Date('2026-08-20T07:00:00Z'), new Date('2026-09-05T07:00:00Z')
        );
        expect(result).toBe(true);
    });

    it('accepts Firestore Timestamp-like values', () => {
        const ts = (iso) => ({ toDate: () => new Date(iso) });
        const result = nightsOverlap(
            ts('2026-08-26T07:00:00Z'), ts('2026-08-30T07:00:00Z'),
            ts('2026-08-24T19:00:00Z'), ts('2026-08-26T19:00:00Z')
        );
        expect(result).toBe(false);
    });

    it('returns false (no overlap claim) when any date is unparseable', () => {
        const result = nightsOverlap(
            'garbage', new Date('2026-08-30T07:00:00Z'),
            new Date('2026-08-24T07:00:00Z'), new Date('2026-08-26T07:00:00Z')
        );
        expect(result).toBe(false);
    });
});
