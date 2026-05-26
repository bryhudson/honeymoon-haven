// Off-season hibernation: the weekly backup goes season-aware and the
// scheduled jobs gate on getSeasonState. These cover the server-side
// (Cloud Functions) season helpers that drive that behavior.
import { describe, it, expect } from 'vitest';
import {
    getSeasonState as cloudSeasonState,
    decideWeeklyBackup,
} from '../functions/helpers/shareholders.js';
import { getSeasonState as clientSeasonState } from '../src/lib/shareholders.ts';

describe('hibernation: cloud getSeasonState parity', () => {
    const dates = [
        new Date(2026, 4, 15),  // May -> OPEN
        new Date(2026, 8, 20),  // Sun before 3rd-Mon cutoff -> OPEN
        new Date(2026, 8, 25),  // after cutoff -> CLOSED
        new Date(2026, 9, 1),   // Oct 1 -> OFF_SEASON
        new Date(2027, 1, 1),   // Feb -> OFF_SEASON (pre-draft)
    ];
    it('matches the client getSeasonState for each sample date', () => {
        for (const d of dates) {
            expect(cloudSeasonState(d)).toBe(clientSeasonState(d));
        }
    });
});

describe('hibernation: decideWeeklyBackup', () => {
    it('takes the regular weekly snapshot during the season (OPEN or CLOSED)', () => {
        expect(decideWeeklyBackup(new Date(2026, 4, 15), false)).toBe('weekly'); // May (OPEN)
        expect(decideWeeklyBackup(new Date(2026, 8, 25), false)).toBe('weekly'); // Sep 25 (CLOSED)
    });

    it('takes a one-time season-end snapshot on the first off-season run', () => {
        expect(decideWeeklyBackup(new Date(2026, 9, 1), false)).toBe('season_end'); // Oct 1, none yet
    });

    it('skips off-season once the season-end snapshot already exists', () => {
        expect(decideWeeklyBackup(new Date(2026, 9, 1), true)).toBe('skip');  // Oct 1, already taken
        expect(decideWeeklyBackup(new Date(2027, 1, 1), true)).toBe('skip');  // Feb, already taken
    });

    it('still takes the season-end snapshot later in the off-season if it was missed', () => {
        expect(decideWeeklyBackup(new Date(2027, 1, 1), false)).toBe('season_end'); // Feb, never taken
    });
});
