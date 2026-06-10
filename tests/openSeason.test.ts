import { describe, it, expect } from 'vitest';
import { deriveOpenSeasonSlots } from '../src/lib/openSeason';

describe('deriveOpenSeasonSlots', () => {
    it('returns an empty array when there are no bookings', () => {
        expect(deriveOpenSeasonSlots([], [])).toEqual([]);
    });

    it('filters out pass and auto-pass records while keeping real bookings', () => {
        const realBooking = {
            id: 'real',
            type: 'booking',
            isFinalized: true,
            shareholderName: 'Real',
            from: new Date(2026, 5, 1),
            to: new Date(2026, 5, 3),
        };
        const bookings = [
            realBooking,
            { id: 'a', type: 'pass', isFinalized: true, shareholderName: 'X', from: new Date(2026, 5, 1), to: new Date(2026, 5, 3) },
            { id: 'b', type: 'auto-pass', isFinalized: true, shareholderName: 'Y', from: new Date(2026, 5, 4), to: new Date(2026, 5, 6) },
        ];
        const result = deriveOpenSeasonSlots(bookings, []);
        expect(result).toHaveLength(1);
        expect(result[0].booking).toBe(realBooking);
    });

    it('filters out drafts (isFinalized === false)', () => {
        const draft = {
            id: 'draft',
            type: 'booking',
            isFinalized: false,
            shareholderName: 'Draftee',
            from: new Date(2026, 5, 1),
            to: new Date(2026, 5, 3),
        };
        expect(deriveOpenSeasonSlots([draft], [])).toEqual([]);
    });

    it('includes cancelled bookings with status CANCELLED', () => {
        const cancelled = {
            id: 'c',
            type: 'cancelled',
            isFinalized: true,
            shareholderName: 'Cancelled Co',
            from: new Date(2026, 5, 1),
            to: new Date(2026, 5, 3),
        };
        const result = deriveOpenSeasonSlots([cancelled], []);
        expect(result).toHaveLength(1);
        expect(result[0].status).toBe('CANCELLED');
        expect(result[0].name).toBe('Cancelled Co');
    });

    it('excludes bookings whose id is referenced by a schedule slot, includes others', () => {
        const inSchedule = {
            id: 'sched-1',
            type: 'booking',
            isFinalized: true,
            shareholderName: 'Rotation Picker',
            from: new Date(2026, 5, 1),
            to: new Date(2026, 5, 3),
        };
        const openSeason = {
            id: 'open-1',
            type: 'booking',
            isFinalized: true,
            shareholderName: 'Open Picker',
            from: new Date(2026, 6, 10),
            to: new Date(2026, 6, 13),
        };
        const schedule = [
            { name: 'Rotation Picker', round: 1, booking: inSchedule },
            { name: 'Other', round: 1, booking: null },
        ];
        const result = deriveOpenSeasonSlots([inSchedule, openSeason], schedule);
        expect(result).toHaveLength(1);
        expect(result[0].booking).toBe(openSeason);
    });

    it('sorts results ascending by stay start date (from)', () => {
        const later = {
            id: 'b',
            type: 'booking',
            isFinalized: true,
            shareholderName: 'Later',
            from: new Date(2026, 7, 5),
            to: new Date(2026, 7, 7),
        };
        const earlier = {
            id: 'a',
            type: 'booking',
            isFinalized: true,
            shareholderName: 'Earlier',
            from: new Date(2026, 5, 1),
            to: new Date(2026, 5, 3),
        };
        const result = deriveOpenSeasonSlots([later, earlier], []);
        expect(result.map(s => s.booking.id)).toEqual(['a', 'b']);
    });

    it('handles Firestore Timestamp-like `from` (.toDate())', () => {
        const ts = new Date(2026, 5, 1);
        const tsLike = { toDate: () => ts };
        const booking = {
            id: 'ts',
            type: 'booking',
            isFinalized: true,
            shareholderName: 'TS',
            from: tsLike,
            to: tsLike,
        };
        const result = deriveOpenSeasonSlots([booking], []);
        expect(result).toHaveLength(1);
        expect(result[0].start).toBeInstanceOf(Date);
        expect(result[0].start.getTime()).toBe(ts.getTime());
    });

    it('sets round: "OPEN" on every returned slot', () => {
        const bookings = [
            { id: '1', type: 'booking', isFinalized: true, shareholderName: 'A', from: new Date(2026, 5, 1), to: new Date(2026, 5, 3) },
            { id: '2', type: 'cancelled', isFinalized: true, shareholderName: 'B', from: new Date(2026, 5, 5), to: new Date(2026, 5, 7) },
        ];
        const result = deriveOpenSeasonSlots(bookings, []);
        expect(result.map(s => s.round)).toEqual(['OPEN', 'OPEN']);
    });

    it('drops malformed bookings without a parseable from date', () => {
        const malformed = [
            { id: 'no-from', type: 'booking', isFinalized: true, shareholderName: 'X' },
            { id: 'bad-from', type: 'booking', isFinalized: true, shareholderName: 'Y', from: 'not-a-date' },
        ];
        expect(deriveOpenSeasonSlots(malformed, [])).toEqual([]);
    });
});

    // Season scoping: without this, the Oct 1 rollover (season year -> 2027)
    // would list EVERY prior-season booking under OPEN SEASON, because none of
    // their ids appear in the fresh 2027 rotation schedule.
    it('excludes bookings from other season years when seasonYear is provided', () => {
        const b2026 = {
            id: 'last-season',
            type: 'booking',
            isFinalized: true,
            shareholderName: 'A',
            from: new Date(2026, 6, 10),
            to: new Date(2026, 6, 13),
        };
        const b2027 = {
            id: 'this-season',
            type: 'booking',
            isFinalized: true,
            shareholderName: 'B',
            from: new Date(2027, 6, 10),
            to: new Date(2027, 6, 13),
        };
        const result = deriveOpenSeasonSlots([b2026, b2027], [], 2027);
        expect(result).toHaveLength(1);
        expect(result[0].booking).toBe(b2027);
    });

    it('omitting seasonYear keeps the unscoped behavior (back-compat)', () => {
        const b2026 = {
            id: 'x',
            type: 'booking',
            isFinalized: true,
            shareholderName: 'A',
            from: new Date(2026, 6, 10),
            to: new Date(2026, 6, 13),
        };
        expect(deriveOpenSeasonSlots([b2026], [])).toHaveLength(1);
    });
