// Locks in behavioral parity between src/lib/shareholders.ts (client)
// and functions/helpers/shareholders.js (cloud).
// Critical because autosyncTurnStatus + turnReminderScheduler rely on
// cloud-side calculation matching what the UI renders.

import { describe, it, expect } from 'vitest';
import {
    calculateDraftSchedule as cloudCalc,
    getShareholderOrder as cloudOrder,
    getOfficialStart as cloudOfficialStart,
    normalizeName as cloudNormalize,
    getSeasonState as cloudSeasonState,
    getSeasonConfig as cloudSeasonConfig,
    getCurrentSeasonYear as cloudSeasonYear,
    getBookingCloseDate as cloudBookingClose,
    filterBookingsToSeason as cloudFilterSeason
} from '../functions/helpers/shareholders.js';
import {
    calculateDraftSchedule as clientCalc,
    getShareholderOrder as clientOrder,
    getOfficialStart as clientOfficialStart,
    normalizeName as clientNormalize,
    getSeasonState as clientSeasonState,
    getSeasonConfig as clientSeasonConfig,
    getCurrentSeasonYear as clientSeasonYear,
    getBookingCloseDate as clientBookingClose,
    filterBookingsToSeason as clientFilterSeason
} from '../src/lib/shareholders.ts';

const DRAFT_START = new Date('2026-04-13T10:00:00-07:00');
const shareholders2026 = clientOrder(2026);

describe('cloud/client parity', () => {
    it('shareholder order matches', () => {
        expect(cloudOrder(2026)).toEqual(clientOrder(2026));
    });

    it('normalizeName matches for tricky cases', () => {
        const inputs = [
            'Julia, Mandy & Bryan',
            'Julia, Mandy and Bryan',
            'Gerry & Georgina',
            '  Janelle and Mike  '
        ];
        for (const input of inputs) {
            expect(cloudNormalize(input)).toEqual(clientNormalize(input));
        }
    });

    it('getOfficialStart snaps to same 10 AM PT anchor', () => {
        const times = [
            new Date('2026-04-13T05:00:00-07:00'),
            new Date('2026-04-13T10:00:00-07:00'),
            new Date('2026-04-13T10:00:01-07:00'),
            new Date('2026-04-13T23:59:00-07:00')
        ];
        for (const t of times) {
            expect(cloudOfficialStart(t).getTime()).toEqual(clientOfficialStart(t).getTime());
        }
    });

    it('calculateDraftSchedule pre-draft (Apr 12): both pick shareholder #1 with Mon 10 AM window', () => {
        const now = new Date('2026-04-12T17:00:00-07:00'); // Sun 5 PM PT
        const cloud = cloudCalc(shareholders2026, [], now, DRAFT_START, false);
        const client = clientCalc(shareholders2026, [], now, DRAFT_START, false);
        expect(cloud.activePicker).toEqual(client.activePicker);
        expect(cloud.activePicker).toEqual(shareholders2026[0]);
        expect(cloud.phase).toEqual(client.phase);
        expect(cloud.phase).toEqual('ROUND_1');
        expect(cloud.windowStarts.getTime()).toEqual(client.windowStarts.getTime());
        expect(cloud.windowEnds.getTime()).toEqual(client.windowEnds.getTime());
    });

    it('calculateDraftSchedule at Mon 10:00 AM PT: first window opens', () => {
        const now = new Date('2026-04-13T10:00:00-07:00');
        const cloud = cloudCalc(shareholders2026, [], now, DRAFT_START, false);
        expect(cloud.activePicker).toEqual(shareholders2026[0]);
        expect(cloud.phase).toEqual('ROUND_1');
        expect(cloud.windowStarts.getTime()).toEqual(now.getTime());
    });

    it('draft bookings (isFinalized=false) are ignored by both', () => {
        const now = new Date('2026-04-13T11:00:00-07:00');
        const draftBooking = {
            shareholderName: shareholders2026[0],
            isFinalized: false,
            createdAt: new Date('2026-04-13T10:05:00-07:00')
        };
        const cloud = cloudCalc(shareholders2026, [draftBooking], now, DRAFT_START, false);
        const client = clientCalc(shareholders2026, [draftBooking], now, DRAFT_START, false);
        // Both should still show shareholder #1 as active (draft booking doesn't count as completed turn)
        expect(cloud.activePicker).toEqual(shareholders2026[0]);
        expect(client.activePicker).toEqual(shareholders2026[0]);
    });

    it('finalized booking advances turn on both', () => {
        const now = new Date('2026-04-13T11:00:00-07:00');
        const finalized = {
            shareholderName: shareholders2026[0],
            isFinalized: true,
            createdAt: new Date('2026-04-13T10:05:00-07:00')
        };
        const cloud = cloudCalc(shareholders2026, [finalized], now, DRAFT_START, false);
        const client = clientCalc(shareholders2026, [finalized], now, DRAFT_START, false);
        expect(cloud.activePicker).toEqual(shareholders2026[1]);
        expect(client.activePicker).toEqual(shareholders2026[1]);
    });

    it('Firestore-like Timestamp (.toDate()) objects handled on both', () => {
        const now = new Date('2026-04-13T11:00:00-07:00');
        const ts = new Date('2026-04-13T10:05:00-07:00');
        const tsLike = { toDate: () => ts };
        const finalized = {
            shareholderName: shareholders2026[0],
            isFinalized: true,
            createdAt: tsLike
        };
        const cloud = cloudCalc(shareholders2026, [finalized], now, DRAFT_START, false);
        const client = clientCalc(shareholders2026, [finalized], now, DRAFT_START, false);
        expect(cloud.activePicker).toEqual(shareholders2026[1]);
        expect(client.activePicker).toEqual(shareholders2026[1]);
    });
});

// Season rollover helpers must stay byte-identical between client and cloud:
// the off-season hibernation cron (decideWeeklyBackup -> getSeasonState) and the
// schedulers all depend on the cloud copy agreeing with what the UI renders.
describe('cloud/client season-helper parity', () => {
    it('getCurrentSeasonYear matches, incl. the Oct 1 rollover boundary', () => {
        const cases = [
            { now: new Date(2026, 0, 1), expected: 2026 },   // Jan 1
            { now: new Date(2026, 8, 30), expected: 2026 },  // Sep 30 (still this season)
            { now: new Date(2026, 9, 1), expected: 2027 },   // Oct 1 (rolls to next season)
            { now: new Date(2026, 11, 31), expected: 2027 }, // Dec 31
        ];
        for (const { now, expected } of cases) {
            expect(cloudSeasonYear(now)).toEqual(clientSeasonYear(now));
            expect(cloudSeasonYear(now)).toEqual(expected);
        }
    });

    it('getBookingCloseDate matches and lands on the 3rd Monday of September', () => {
        for (const year of [2025, 2026, 2027, 2028]) {
            const cloud = cloudBookingClose(year);
            const client = clientBookingClose(year);
            expect(cloud.getTime()).toEqual(client.getTime());
            expect(cloud.getMonth()).toEqual(8); // September
            expect(cloud.getDay()).toEqual(1);   // Monday
            expect(cloud.getDate()).toBeGreaterThanOrEqual(15); // 3rd Monday is the 15th-21st
            expect(cloud.getDate()).toBeLessThanOrEqual(21);
        }
    });

    it('getSeasonConfig anchors match for several years', () => {
        for (const year of [2026, 2027, 2028]) {
            const cloud = cloudSeasonConfig(year);
            const client = clientSeasonConfig(year);
            expect(cloud.START_DATE.getTime()).toEqual(client.START_DATE.getTime());
            expect(cloud.SEASON_START.getTime()).toEqual(client.SEASON_START.getTime());
            expect(cloud.SEASON_END.getTime()).toEqual(client.SEASON_END.getTime());
            expect(cloud.BOOKING_CLOSE.getTime()).toEqual(client.BOOKING_CLOSE.getTime());
        }
    });

    it('getSeasonState matches at every lifecycle boundary', () => {
        const close2026 = clientBookingClose(2026);
        const cases = [
            { now: new Date(2026, 0, 15), expected: 'OFF_SEASON' },                 // Jan: before the draft opens
            { now: new Date(2026, 2, 31), expected: 'OFF_SEASON' },                 // Mar 31: day before open
            { now: new Date(2026, 3, 1), expected: 'OPEN' },                        // Apr 1: draft opens
            { now: new Date(2026, 6, 15), expected: 'OPEN' },                       // Jul: mid-season
            { now: new Date(close2026.getTime() - 1), expected: 'OPEN' },           // 1ms before the cutoff
            { now: close2026, expected: 'CLOSED' },                                 // the cutoff itself
            { now: new Date(2026, 8, 30), expected: 'CLOSED' },                     // Sep 30: last bookable day
            { now: new Date(2026, 9, 1), expected: 'OFF_SEASON' },                  // Oct 1: rolls into next pre-season
        ];
        for (const { now, expected } of cases) {
            expect(cloudSeasonState(now)).toEqual(clientSeasonState(now));
            expect(cloudSeasonState(now)).toEqual(expected);
        }
    });

    it('filterBookingsToSeason matches across record shapes', () => {
        const records = [
            { id: 'a', from: new Date(2026, 5, 1) },                        // in-season (from)
            { id: 'b', from: new Date(2027, 5, 1) },                        // next season (excluded)
            { id: 'c', createdAt: new Date(2026, 2, 10) },                  // only createdAt, in-season
            { id: 'd', from: { toDate: () => new Date(2026, 7, 1) } },      // Firestore Timestamp-like
            { id: 'e' },                                                    // malformed: dropped
            { id: 'f', from: 'not-a-date' },                               // invalid: dropped
        ];
        const cloud = cloudFilterSeason(records, 2026);
        const client = clientFilterSeason(records, 2026);
        expect(cloud).toEqual(client);
        expect(cloud.map(r => r.id)).toEqual(['a', 'c', 'd']);
    });
});
