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
});
