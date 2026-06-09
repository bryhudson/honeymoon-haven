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
});
