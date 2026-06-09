import { describe, it, expect } from 'vitest';
import { deriveOpenSeasonSlots } from '../src/lib/openSeason';

describe('deriveOpenSeasonSlots', () => {
    it('returns an empty array when there are no bookings', () => {
        expect(deriveOpenSeasonSlots([], [])).toEqual([]);
    });
});
