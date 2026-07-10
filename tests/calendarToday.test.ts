import { describe, it, expect } from 'vitest';
import { getPacificDateParts, getPacificToday, isTodayPacific } from '../src/lib/calendarToday';

// All assertions inject a fixed `now` instant so the "today" logic is
// deterministic. The key cases are the ones where the UTC calendar date and
// the Pacific calendar date disagree (late-night Pacific), and a winter
// instant to prove the offset is DST-aware (PDT -7 in summer, PST -8 in winter).

describe('calendarToday - Pacific date logic', () => {
    describe('getPacificDateParts', () => {
        it('uses the Pacific calendar date when UTC has already rolled to the next day', () => {
            // 2026-07-11 05:30 UTC == 2026-07-10 22:30 PDT
            const parts = getPacificDateParts(new Date('2026-07-11T05:30:00Z'));
            expect(parts).toEqual({ year: 2026, month: 7, day: 10 });
        });

        it('rolls to the next Pacific day exactly at Pacific midnight, not UTC midnight', () => {
            // 06:59Z -> 23:59 PDT (still the 10th); 07:01Z -> 00:01 PDT (the 11th)
            expect(getPacificDateParts(new Date('2026-07-11T06:59:00Z')).day).toBe(10);
            expect(getPacificDateParts(new Date('2026-07-11T07:01:00Z')).day).toBe(11);
        });

        it('is DST-aware (PST is UTC-8 in winter)', () => {
            // 2026-01-15 06:30 UTC == 2026-01-14 22:30 PST
            expect(getPacificDateParts(new Date('2026-01-15T06:30:00Z'))).toEqual({ year: 2026, month: 1, day: 14 });
        });
    });

    describe('getPacificToday', () => {
        it('returns a local-midnight Date for the Pacific calendar day', () => {
            const t = getPacificToday(new Date('2026-07-11T05:30:00Z'));
            expect(t.getFullYear()).toBe(2026);
            expect(t.getMonth()).toBe(6); // July (0-indexed)
            expect(t.getDate()).toBe(10);
            expect(t.getHours()).toBe(0);
            expect(t.getMinutes()).toBe(0);
        });
    });

    describe('isTodayPacific', () => {
        const now = new Date('2026-07-11T05:30:00Z'); // Pacific: 2026-07-10

        it('is true for the matching Pacific day', () => {
            expect(isTodayPacific(new Date(2026, 6, 10), now)).toBe(true);
        });

        it('is false for the next day', () => {
            expect(isTodayPacific(new Date(2026, 6, 11), now)).toBe(false);
        });

        it('is false for the previous day', () => {
            expect(isTodayPacific(new Date(2026, 6, 9), now)).toBe(false);
        });

        it('ignores the time-of-day of the passed day', () => {
            expect(isTodayPacific(new Date(2026, 6, 10, 15, 30), now)).toBe(true);
        });
    });
});
