// Locks in behavioral parity between src/lib/shareholders.ts (client)
// and functions/helpers/shareholders.js (cloud).
// Critical because autosyncTurnStatus + turnReminderScheduler rely on
// cloud-side calculation matching what the UI renders.

import { describe, it, expect } from 'vitest';
import {
    calculateDraftSchedule as cloudCalc,
    getShareholderOrder as cloudOrder,
    getOfficialStart as cloudOfficialStart,
    normalizeName as cloudNormalize
} from '../functions/helpers/shareholders.js';
import {
    calculateDraftSchedule as clientCalc,
    getShareholderOrder as clientOrder,
    getOfficialStart as clientOfficialStart,
    normalizeName as clientNormalize
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
