// Living documentation of the season lifecycle: what state the app is in at
// every boundary instant from mid-season through the winter read-only window
// to the next season's reopen. Asserted on BOTH the client and cloud helpers
// so the two can never drift at a boundary.
//
// 2026-27 timeline this encodes:
//   ... -> Sep 21 2026 00:00 PT   booking CLOSES (3rd Monday of September)
//   Sep 21 -> Sep 30              CLOSED: app live (view/pay) but no new bookings
//   Oct 1 2026 -> Mar 31 2027     OFF_SEASON: read-only winter mode, season year
//                                 rolls to 2027, crons hibernate after one
//                                 season-end backup
//   Apr 1 2027                    2027 season OPENS (draft begins)

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import {
    getSeasonState as clientState,
    getCurrentSeasonYear as clientYear,
    getBookingCloseDate as clientClose,
} from '../src/lib/shareholders';

const require = createRequire(import.meta.url);
const {
    getSeasonState: cloudState,
    getCurrentSeasonYear: cloudYear,
    decideWeeklyBackup,
} = require('../functions/helpers/shareholders.js');

// Local-time instants (test runner and shareholders are both Pacific).
const at = (y: number, m: number, d: number, h = 12) => new Date(y, m, d, h, 0, 0);

describe('season lifecycle timeline (2026 -> 2027)', () => {
    const timeline: Array<[string, Date, string, number]> = [
        ['mid open season',          at(2026, 5, 10), 'OPEN',       2026],
        ['day before cutoff',        at(2026, 8, 20), 'OPEN',       2026],
        ['cutoff day (3rd Mon Sep)', at(2026, 8, 21), 'CLOSED',     2026],
        ['last bookable day',        at(2026, 8, 30), 'CLOSED',     2026],
        ['Oct 1: read-only begins',  at(2026, 9, 1),  'OFF_SEASON', 2027],
        ['mid winter',               at(2027, 0, 15), 'OFF_SEASON', 2027],
        ['day before reopen',        at(2027, 2, 31), 'OFF_SEASON', 2027],
        ['Apr 1: 2027 season opens', at(2027, 3, 1),  'OPEN',       2027],
    ];

    for (const [label, when, state, year] of timeline) {
        it(`${label}: state=${state}, seasonYear=${year} (client + cloud agree)`, () => {
            expect(clientState(when)).toBe(state);
            expect(cloudState(when)).toBe(state);
            expect(clientYear(when)).toBe(year);
            expect(cloudYear(when)).toBe(year);
        });
    }

    it('the 2026 cutoff is exactly Monday Sep 21 (3rd Monday)', () => {
        const close = clientClose(2026);
        expect(close.getFullYear()).toBe(2026);
        expect(close.getMonth()).toBe(8);
        expect(close.getDate()).toBe(21);
        expect(close.getDay()).toBe(1); // Monday
    });

    it('one minute before the cutoff is still OPEN; at the cutoff it is CLOSED', () => {
        const close = clientClose(2026);
        expect(clientState(new Date(close.getTime() - 60_000))).toBe('OPEN');
        expect(clientState(close)).toBe('CLOSED');
    });

    describe('weekly backup hibernation across the boundary', () => {
        it('in season (OPEN and CLOSED): regular weekly backup', () => {
            expect(decideWeeklyBackup(at(2026, 5, 10), false)).toBe('weekly');
            expect(decideWeeklyBackup(at(2026, 8, 25), false)).toBe('weekly');
        });

        it('first off-season run: one season-end snapshot', () => {
            expect(decideWeeklyBackup(at(2026, 9, 1), false)).toBe('season_end');
        });

        it('subsequent off-season runs: skip (hibernation)', () => {
            expect(decideWeeklyBackup(at(2026, 10, 15), true)).toBe('skip');
            expect(decideWeeklyBackup(at(2027, 1, 1), true)).toBe('skip');
        });

        it('next April: weekly backups resume', () => {
            expect(decideWeeklyBackup(at(2027, 3, 2), true)).toBe('weekly');
        });
    });
});
