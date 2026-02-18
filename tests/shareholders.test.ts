import { describe, it, expect } from 'vitest';
import {
    normalizeName,
    formatNameForDisplay,
    getShareholderOrder,
    getOfficialStart,
    getPickDurationMS,
    calculateDraftSchedule,
    mapOrderToSchedule,
    SHAREHOLDERS_2025,
    DRAFT_CONFIG,
    type Booking,
    type Shareholder,
} from '../src/lib/shareholders';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

// March 1, 2026 at exactly 10:00:00 AM PST.
// PST = UTC-8 (DST starts March 8, 2026, so March 1 is still standard time).
// 10 AM PST = 18:00 UTC.
const MARCH_1_10AM_PST = new Date('2026-03-01T18:00:00.000Z');

// Small shareholder list for deterministic draft tests.
const SHAREHOLDERS_3: Shareholder[] = ['Alice', 'Bob', 'Carol'];

/**
 * Build a minimal Booking fixture. isFinalized defaults to true so the
 * draft engine treats it as a completed action.
 */
function makeBooking(
    name: string,
    createdAt: Date,
    opts: { type?: Booking['type']; isFinalized?: boolean; cancelledAt?: Date } = {}
): Booking {
    return {
        id: `${name}-${createdAt.getTime()}`,
        shareholderName: name,
        from: createdAt,
        to: new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000),
        createdAt,
        type: opts.type,
        isFinalized: opts.isFinalized !== undefined ? opts.isFinalized : true,
        cancelledAt: opts.cancelledAt,
    };
}

// ---------------------------------------------------------------------------
// 1. normalizeName
// ---------------------------------------------------------------------------

describe('normalizeName', () => {
    it('returns empty string for null', () => {
        expect(normalizeName(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
        expect(normalizeName(undefined)).toBe('');
    });

    it('returns empty string for empty string', () => {
        expect(normalizeName('')).toBe('');
    });

    it('converts & to "and"', () => {
        expect(normalizeName('Mike & Janelle')).toBe('janelle and mike');
    });

    it('applies canonical NAME_MAP reversal (Gerry & Georgina)', () => {
        expect(normalizeName('Gerry & Georgina')).toBe('georgina and jerry');
    });

    it('applies canonical NAME_MAP reversal (Gerry and Georgina)', () => {
        expect(normalizeName('Gerry and Georgina')).toBe('georgina and jerry');
    });

    it('applies canonical NAME_MAP reversal (Brian & Sam)', () => {
        expect(normalizeName('Brian & Sam')).toBe('sam and brian');
    });

    it('lowercases the result', () => {
        expect(normalizeName('Barb')).toBe('barb');
    });

    it('trims surrounding whitespace', () => {
        expect(normalizeName('  Barb  ')).toBe('barb');
    });

    it('collapses internal whitespace', () => {
        expect(normalizeName('Steve  and  Kate')).toBe('steve and kate');
    });

    it('produces the same result for "& " and "and" variants', () => {
        const withAmpersand = normalizeName('Julia, Mandy & Bryan');
        const withAnd = normalizeName('Julia, Mandy and Bryan');
        expect(withAmpersand).toBe(withAnd);
    });

    it('canonical already-normalized name is idempotent', () => {
        const once = normalizeName('Janelle and Mike');
        const twice = normalizeName(once);
        expect(once).toBe(twice);
    });
});

// ---------------------------------------------------------------------------
// 2. formatNameForDisplay
// ---------------------------------------------------------------------------

describe('formatNameForDisplay', () => {
    it('returns empty string for null', () => {
        expect(formatNameForDisplay(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
        expect(formatNameForDisplay(undefined)).toBe('');
    });

    it('converts & to "and" and applies NAME_MAP (Gerry & Georgina)', () => {
        expect(formatNameForDisplay('Gerry & Georgina')).toBe('Georgina and Jerry');
    });

    it('converts & to "and" and applies NAME_MAP (Mike & Janelle)', () => {
        expect(formatNameForDisplay('Mike & Janelle')).toBe('Janelle and Mike');
    });

    it('returns canonical name unchanged when already correct', () => {
        expect(formatNameForDisplay('Janelle and Mike')).toBe('Janelle and Mike');
    });

    it('preserves original casing for non-mapped names', () => {
        expect(formatNameForDisplay('Barb')).toBe('Barb');
    });

    it('trims leading/trailing whitespace', () => {
        expect(formatNameForDisplay('  Steve and Kate  ')).toBe('Steve and Kate');
    });
});

// ---------------------------------------------------------------------------
// 3. getShareholderOrder
// ---------------------------------------------------------------------------

describe('getShareholderOrder', () => {
    it('returns SHAREHOLDERS_2025 for year 2025 (rotation 0)', () => {
        expect(getShareholderOrder(2025)).toEqual(SHAREHOLDERS_2025);
    });

    it('returns SHAREHOLDERS_2025 for year 2024 (past year, diff <= 0)', () => {
        expect(getShareholderOrder(2024)).toEqual(SHAREHOLDERS_2025);
    });

    it('returns hardcoded 2026 order (special override)', () => {
        const order = getShareholderOrder(2026);
        expect(order[0]).toBe('Julia, Mandy and Bryan');
        expect(order[order.length - 1]).toBe('Janelle and Mike');
        expect(order).toHaveLength(SHAREHOLDERS_2025.length);
    });

    it('applies rotation of 2 for year 2027', () => {
        const order = getShareholderOrder(2027);
        // rotation = (2027 - 2025) % 12 = 2
        // First element is SHAREHOLDERS_2025[2]
        expect(order[0]).toBe(SHAREHOLDERS_2025[2]);
        expect(order).toHaveLength(SHAREHOLDERS_2025.length);
    });

    it('full-cycle rotation returns original order (year 2025 + 12 = 2037)', () => {
        const order2037 = getShareholderOrder(2037);
        // 2037 is not 2026 so uses rotation: (2037-2025) % 12 = 0 → same as 2025
        expect(order2037).toEqual(SHAREHOLDERS_2025);
    });

    it('all shareholders are present in 2026 order', () => {
        const order = getShareholderOrder(2026);
        const sorted2026 = [...order].sort();
        const sorted2025 = [...SHAREHOLDERS_2025].sort();
        expect(sorted2026).toEqual(sorted2025);
    });
});

// ---------------------------------------------------------------------------
// 4. getPickDurationMS
// ---------------------------------------------------------------------------

describe('getPickDurationMS', () => {
    it('returns 2 days in milliseconds', () => {
        expect(getPickDurationMS()).toBe(2 * 24 * 60 * 60 * 1000);
    });

    it('matches DRAFT_CONFIG.PICK_DURATION_DAYS', () => {
        expect(getPickDurationMS()).toBe(DRAFT_CONFIG.PICK_DURATION_DAYS * 24 * 60 * 60 * 1000);
    });
});

// ---------------------------------------------------------------------------
// 5. getOfficialStart  (10 AM PST rule)
// ---------------------------------------------------------------------------

describe('getOfficialStart', () => {
    it('returns null for null input', () => {
        expect(getOfficialStart(null)).toBeNull();
    });

    it('returns null for undefined input', () => {
        expect(getOfficialStart(undefined)).toBeNull();
    });

    it('at exactly 10:00:00 AM PST → returns same day 10 AM PST', () => {
        // Input: March 1, 2026 18:00:00 UTC = exactly 10 AM PST
        const result = getOfficialStart(MARCH_1_10AM_PST);
        expect(result?.getTime()).toBe(MARCH_1_10AM_PST.getTime());
    });

    it('1 minute past 10 AM PST → rolls to NEXT day 10 AM PST', () => {
        // March 1, 2026 18:01 UTC = 10:01 AM PST
        const justPastTen = new Date('2026-03-01T18:01:00.000Z');
        const result = getOfficialStart(justPastTen);
        // Expected: March 2, 2026 10 AM PST = 18:00 UTC
        const expected = new Date('2026-03-02T18:00:00.000Z');
        expect(result?.getTime()).toBe(expected.getTime());
    });

    it('9 AM PST (before 10 AM) → returns same day 10 AM PST', () => {
        // March 1, 2026 17:00 UTC = 9 AM PST
        const beforeTen = new Date('2026-03-01T17:00:00.000Z');
        const result = getOfficialStart(beforeTen);
        expect(result?.getTime()).toBe(MARCH_1_10AM_PST.getTime());
    });

    it('handles Firestore Timestamp-like objects (.toDate method)', () => {
        const firestoreTimestamp = { toDate: () => MARCH_1_10AM_PST };
        const result = getOfficialStart(firestoreTimestamp);
        expect(result?.getTime()).toBe(MARCH_1_10AM_PST.getTime());
    });

    it('handles PDT period (after March 8 DST change) correctly', () => {
        // April 1, 2026 is in PDT (UTC-7)
        // 10 AM PDT = 17:00 UTC
        const aprilFirst10amPDT = new Date('2026-04-01T17:00:00.000Z');
        const result = getOfficialStart(aprilFirst10amPDT);
        expect(result?.getTime()).toBe(aprilFirst10amPDT.getTime());
    });

    it('10 AM PDT + 1 min → next day 10 AM PDT', () => {
        // April 1, 2026 17:01 UTC = 10:01 AM PDT
        const justPastTenPDT = new Date('2026-04-01T17:01:00.000Z');
        const result = getOfficialStart(justPastTenPDT);
        // Expected: April 2 10 AM PDT = 17:00 UTC
        const expected = new Date('2026-04-02T17:00:00.000Z');
        expect(result?.getTime()).toBe(expected.getTime());
    });
});

// ---------------------------------------------------------------------------
// 6. calculateDraftSchedule
// ---------------------------------------------------------------------------

describe('calculateDraftSchedule', () => {
    // Helpers —— use MARCH_1_10AM_PST as startDateOverride for all tests.

    it('ROUND_1: first picker is active when no bookings exist and now is within window', () => {
        // now = March 1 noon PST (20:00 UTC) — within Alice's 2-day window
        const now = new Date('2026-03-01T20:00:00.000Z');
        const result = calculateDraftSchedule(SHAREHOLDERS_3, [], now, MARCH_1_10AM_PST);

        expect(result.phase).toBe('ROUND_1');
        expect(result.activePicker).toBe('Alice');
        expect(result.nextPicker).toBe('Bob');
        expect(result.round).toBe(1);
        expect(result.isSeasonStart).toBe(true);
        expect(result.isGracePeriod).toBe(false); // isSeasonStart overrides grace
    });

    it('ROUND_1: first picker window expires → second picker becomes active', () => {
        // now = March 4 noon PST — after Alice's 2-day window (ended March 3 10 AM PST)
        const now = new Date('2026-03-04T20:00:00.000Z');
        const result = calculateDraftSchedule(SHAREHOLDERS_3, [], now, MARCH_1_10AM_PST);

        expect(result.phase).toBe('ROUND_1');
        expect(result.activePicker).toBe('Bob');
        expect(result.nextPicker).toBe('Carol');
        expect(result.round).toBe(1);
        expect(result.isSeasonStart).toBe(false);
    });

    it('ROUND_1: first picker books → next picker window begins next 10 AM PST', () => {
        // Alice books on March 1 at 2 PM PST (22:00 UTC)
        const aliceBookingTime = new Date('2026-03-01T22:00:00.000Z');
        const bookings: Booking[] = [makeBooking('Alice', aliceBookingTime)];

        // now = March 2 noon PST — within Bob's new window
        const now = new Date('2026-03-02T20:00:00.000Z');
        const result = calculateDraftSchedule(SHAREHOLDERS_3, bookings, now, MARCH_1_10AM_PST);

        expect(result.phase).toBe('ROUND_1');
        expect(result.activePicker).toBe('Bob');
        expect(result.nextPicker).toBe('Carol');
    });

    it('ROUND_2: all Round 1 picks complete → Round 2 first picker active', () => {
        // Shareholders: [Alice, Bob, Carol]
        // fullTurnOrder: [Alice, Bob, Carol, Carol, Bob, Alice]
        // All R1 picks: Alice@Mar1 2PM, Bob@Mar2 2PM, Carol@Mar3 2PM
        // R2 Carol window: March 4 10AM – March 6 10AM PST
        const bookings: Booking[] = [
            makeBooking('Alice', new Date('2026-03-01T22:00:00.000Z')),
            makeBooking('Bob',   new Date('2026-03-02T22:00:00.000Z')),
            makeBooking('Carol', new Date('2026-03-03T22:00:00.000Z')),
        ];
        // now = March 5 noon PST (within Carol's R2 window)
        const now = new Date('2026-03-05T20:00:00.000Z');
        const result = calculateDraftSchedule(SHAREHOLDERS_3, bookings, now, MARCH_1_10AM_PST);

        expect(result.phase).toBe('ROUND_2');
        expect(result.activePicker).toBe('Carol');
        expect(result.nextPicker).toBe('Bob');
        expect(result.round).toBe(2);
    });

    it('ROUND_2: isGracePeriod is true when now is before official window start', () => {
        const bookings: Booking[] = [
            makeBooking('Alice', new Date('2026-03-01T22:00:00.000Z')),
            makeBooking('Bob',   new Date('2026-03-02T22:00:00.000Z')),
            makeBooking('Carol', new Date('2026-03-03T22:00:00.000Z')),
        ];
        // Carol's R2 window officially starts March 4 at 10 AM PST (18:00 UTC)
        // now = March 4 at 2 AM PST (10:00 UTC) — before the window starts
        const now = new Date('2026-03-04T10:00:00.000Z');
        const result = calculateDraftSchedule(SHAREHOLDERS_3, bookings, now, MARCH_1_10AM_PST);

        expect(result.activePicker).toBe('Carol');
        expect(result.isGracePeriod).toBe(true);
    });

    it('OPEN_SEASON: all picks completed → phase is OPEN_SEASON with no active picker', () => {
        // 2 shareholders for simplicity: Alice, Bob
        // fullTurnOrder: [Alice, Bob, Bob, Alice] (R1 + R2 reversed)
        const shareholders2: Shareholder[] = ['Alice', 'Bob'];
        const bookings: Booking[] = [
            // R1
            makeBooking('Alice', new Date('2026-03-01T22:00:00.000Z')),
            makeBooking('Bob',   new Date('2026-03-02T22:00:00.000Z')),
            // R2
            makeBooking('Bob',   new Date('2026-03-03T22:00:00.000Z')),
            makeBooking('Alice', new Date('2026-03-04T22:00:00.000Z')),
        ];
        const now = new Date('2026-04-01T20:00:00.000Z');
        const result = calculateDraftSchedule(shareholders2, bookings, now, MARCH_1_10AM_PST);

        expect(result.phase).toBe('OPEN_SEASON');
        expect(result.activePicker).toBeNull();
        expect(result.round).toBe(3);
    });

    it('pass action advances the turn to the next picker', () => {
        // Alice passes her turn
        const bookings: Booking[] = [
            makeBooking('Alice', new Date('2026-03-01T22:00:00.000Z'), { type: 'pass' }),
        ];
        const now = new Date('2026-03-02T20:00:00.000Z');
        const result = calculateDraftSchedule(SHAREHOLDERS_3, bookings, now, MARCH_1_10AM_PST);

        expect(result.activePicker).toBe('Bob');
    });

    it('cancelled booking advances the turn (uses cancelledAt timestamp)', () => {
        const cancelledAt = new Date('2026-03-01T22:00:00.000Z');
        const bookings: Booking[] = [
            makeBooking('Alice', new Date('2026-03-01T20:00:00.000Z'), {
                type: 'cancelled',
                cancelledAt,
            }),
        ];
        const now = new Date('2026-03-02T20:00:00.000Z');
        const result = calculateDraftSchedule(SHAREHOLDERS_3, bookings, now, MARCH_1_10AM_PST);

        expect(result.activePicker).toBe('Bob');
    });

    it('windowEnds is set when a picker is active', () => {
        const now = new Date('2026-03-01T20:00:00.000Z');
        const result = calculateDraftSchedule(SHAREHOLDERS_3, [], now, MARCH_1_10AM_PST);

        expect(result.windowEnds).not.toBeNull();
        expect(result.windowEnds instanceof Date).toBe(true);
        // Window should end 2 days after March 1 10 AM PST = March 3 10 AM PST
        const expectedEnd = new Date('2026-03-03T18:00:00.000Z');
        expect(result.windowEnds?.getTime()).toBe(expectedEnd.getTime());
    });
});

// ---------------------------------------------------------------------------
// 7. mapOrderToSchedule
// ---------------------------------------------------------------------------

describe('mapOrderToSchedule', () => {
    it('returns 2× shareholders.length items (both rounds)', () => {
        const schedule = mapOrderToSchedule(SHAREHOLDERS_3, [], MARCH_1_10AM_PST);
        expect(schedule).toHaveLength(SHAREHOLDERS_3.length * 2);
    });

    it('first half has round=1, second half has round=2', () => {
        const schedule = mapOrderToSchedule(SHAREHOLDERS_3, [], MARCH_1_10AM_PST);
        const firstHalf = schedule.slice(0, SHAREHOLDERS_3.length);
        const secondHalf = schedule.slice(SHAREHOLDERS_3.length);
        firstHalf.forEach(item => expect(item.round).toBe(1));
        secondHalf.forEach(item => expect(item.round).toBe(2));
    });

    it('each item has all required fields', () => {
        const schedule = mapOrderToSchedule(SHAREHOLDERS_3, [], MARCH_1_10AM_PST);
        schedule.forEach(item => {
            expect(item).toHaveProperty('name');
            expect(item).toHaveProperty('round');
            expect(item).toHaveProperty('start');
            expect(item).toHaveProperty('end');
            expect(item).toHaveProperty('officialStart');
            expect(item).toHaveProperty('status');
            expect(item).toHaveProperty('isCompleted');
            expect(item).toHaveProperty('booking');
        });
    });

    it('completed booking → status is COMPLETED', () => {
        // Alice booked and finalized
        const bookings: Booking[] = [
            makeBooking('Alice', new Date('2026-03-01T22:00:00.000Z')),
        ];
        const schedule = mapOrderToSchedule(SHAREHOLDERS_3, bookings, MARCH_1_10AM_PST);
        const aliceR1 = schedule.find(i => i.name === 'Alice' && i.round === 1);
        expect(aliceR1?.status).toBe('COMPLETED');
        expect(aliceR1?.isCompleted).toBe(true);
    });

    it('passed turn → status is PASSED', () => {
        const bookings: Booking[] = [
            makeBooking('Alice', new Date('2026-03-01T22:00:00.000Z'), { type: 'pass' }),
        ];
        const schedule = mapOrderToSchedule(SHAREHOLDERS_3, bookings, MARCH_1_10AM_PST);
        const aliceR1 = schedule.find(i => i.name === 'Alice' && i.round === 1);
        expect(aliceR1?.status).toBe('PASSED');
    });

    it('cancelled booking → status is CANCELLED', () => {
        const bookings: Booking[] = [
            makeBooking('Alice', new Date('2026-03-01T22:00:00.000Z'), {
                type: 'cancelled',
                cancelledAt: new Date('2026-03-01T23:00:00.000Z'),
            }),
        ];
        const schedule = mapOrderToSchedule(SHAREHOLDERS_3, bookings, MARCH_1_10AM_PST);
        const aliceR1 = schedule.find(i => i.name === 'Alice' && i.round === 1);
        expect(aliceR1?.status).toBe('CANCELLED');
    });

    it('order is R1 sequence then R2 sequence (reversed)', () => {
        // R1: Alice, Bob, Carol  |  R2: Carol, Bob, Alice
        const schedule = mapOrderToSchedule(SHAREHOLDERS_3, [], MARCH_1_10AM_PST);
        expect(schedule[0].name).toBe('Alice');
        expect(schedule[1].name).toBe('Bob');
        expect(schedule[2].name).toBe('Carol');
        // R2 reversed
        expect(schedule[3].name).toBe('Carol');
        expect(schedule[4].name).toBe('Bob');
        expect(schedule[5].name).toBe('Alice');
    });
});
