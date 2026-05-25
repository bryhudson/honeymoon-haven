import { describe, it, expect } from 'vitest';
import { nightsOverlap, isNightBooked, getDayOccupancy } from '../src/lib/availability';

// July 2026, local time (month is 0-indexed -> 6 = July)
const jul = (d: number) => new Date(2026, 6, d);
const booking = (from: Date, to: Date, extra: Record<string, unknown> = {}) => ({ from, to, type: 'booking', ...extra });

describe('nightsOverlap - half-open [from, to)', () => {
    it('allows a turnover day: one stay checks out as another checks in', () => {
        // A occupies the night of Jul 16 (checks out Jul 17).
        // B wants the nights of Jul 17 + 18 (checks in Jul 17, out Jul 19).
        // The shared Jul 17 is A's checkout and B's check-in -> NOT a conflict.
        expect(nightsOverlap(jul(16), jul(17), jul(17), jul(19))).toBe(false);
    });

    it('is symmetric for the turnover-day case', () => {
        expect(nightsOverlap(jul(17), jul(19), jul(16), jul(17))).toBe(false);
    });

    it('detects a shared night', () => {
        // A: nights 16,17 (out 18). B: nights 17,18 (out 19). Night 17 is shared.
        expect(nightsOverlap(jul(16), jul(18), jul(17), jul(19))).toBe(true);
    });

    it('detects identical ranges', () => {
        expect(nightsOverlap(jul(16), jul(18), jul(16), jul(18))).toBe(true);
    });

    it('detects a fully contained range', () => {
        expect(nightsOverlap(jul(15), jul(20), jul(17), jul(18))).toBe(true);
    });

    it('returns false for ranges separated by a gap', () => {
        expect(nightsOverlap(jul(10), jul(12), jul(14), jul(16))).toBe(false);
    });

    it('ignores time-of-day by normalizing to the start of the day', () => {
        const aCheckout = new Date(2026, 6, 17, 11, 0); // 11:00 AM Jul 17
        const bCheckin = new Date(2026, 6, 17, 15, 0);   //  3:00 PM Jul 17
        expect(nightsOverlap(jul(16), aCheckout, bCheckin, jul(19))).toBe(false);
    });
});

describe('isNightBooked - checkout day stays free', () => {
    it('marks the check-in night as booked', () => {
        expect(isNightBooked(jul(16), jul(16), jul(17))).toBe(true);
    });

    it('leaves the checkout day available', () => {
        expect(isNightBooked(jul(17), jul(16), jul(17))).toBe(false);
    });

    it('marks a middle night as booked', () => {
        expect(isNightBooked(jul(17), jul(16), jul(19))).toBe(true);
    });

    it('leaves the day before check-in available', () => {
        expect(isNightBooked(jul(15), jul(16), jul(19))).toBe(false);
    });
});

describe('getDayOccupancy - nights + turnover', () => {
    // A occupies the night of Jul 16 (out Jul 17). B occupies nights Jul 17 + 18 (out Jul 19).
    const A = booking(jul(16), jul(17), { id: 'A', shareholderName: 'Anna' });
    const B = booking(jul(17), jul(19), { id: 'B', shareholderName: 'Ben' });
    const all = [A, B];

    it('reports the occupant of a booked night with no departure', () => {
        const { occupant, departing } = getDayOccupancy(jul(16), all);
        expect(occupant?.id).toBe('A');
        expect(departing).toBeNull();
    });

    it('detects a turnover day: A checks out, B checks in', () => {
        const { occupant, departing } = getDayOccupancy(jul(17), all);
        expect(departing?.id).toBe('A');
        expect(occupant?.id).toBe('B');
    });

    it('treats a lone check-out day as free apart from the departure', () => {
        const { occupant, departing } = getDayOccupancy(jul(19), all);
        expect(occupant).toBeNull();
        expect(departing?.id).toBe('B');
    });

    it('returns nothing for a fully free day', () => {
        const { occupant, departing } = getDayOccupancy(jul(25), all);
        expect(occupant).toBeNull();
        expect(departing).toBeNull();
    });

    it('ignores pass / auto-pass / cancelled records', () => {
        const noisy = [
            ...all,
            booking(jul(17), jul(18), { id: 'P', type: 'pass' }),
            booking(jul(16), jul(20), { id: 'C', type: 'cancelled' }),
        ];
        const { occupant, departing } = getDayOccupancy(jul(17), noisy);
        expect(departing?.id).toBe('A');
        expect(occupant?.id).toBe('B');
    });

    it('accepts Firestore Timestamp-like { toDate } values', () => {
        const ts = (d: Date) => ({ toDate: () => d });
        const { occupant, departing } = getDayOccupancy(jul(17), [
            { from: ts(jul(16)), to: ts(jul(17)), type: 'booking', id: 'A' },
            { from: ts(jul(17)), to: ts(jul(19)), type: 'booking', id: 'B' },
        ]);
        expect(departing?.id).toBe('A');
        expect(occupant?.id).toBe('B');
    });
});
