import { describe, it, expect } from 'vitest';
import { calculateBookingCost } from '../src/lib/pricing';

describe('calculateBookingCost', () => {
    // --- Edge Cases ---
    describe('Edge Cases', () => {
        it('returns zero for null inputs', () => {
            const result = calculateBookingCost(null, null);
            expect(result.total).toBe(0);
            expect(result.nights).toBe(0);
            expect(result.breakdown).toBeNull();
        });

        it('returns zero for undefined inputs', () => {
            const result = calculateBookingCost(undefined, undefined);
            expect(result.total).toBe(0);
            expect(result.nights).toBe(0);
        });

        it('returns zero when end date is before start date', () => {
            const result = calculateBookingCost('2026-06-15', '2026-06-10');
            expect(result.total).toBe(0);
            expect(result.nights).toBe(0);
        });

        it('returns zero for same-day check-in/check-out', () => {
            const result = calculateBookingCost('2026-06-15', '2026-06-15');
            expect(result.total).toBe(0);
        });
    });

    // --- Single Night ---
    describe('Single Night Stays', () => {
        it('charges $100 for a weeknight (Monday)', () => {
            // 2026-06-15 is a Monday
            const result = calculateBookingCost('2026-06-15', '2026-06-16');
            expect(result.nights).toBe(1);
            expect(result.total).toBe(100);
            expect(result.breakdown?.weeknights).toBe(1);
            expect(result.breakdown?.weekends).toBe(0);
        });

        it('charges $125 for a Friday night', () => {
            // 2026-06-19 is a Friday - use T12:00:00 to avoid UTC->local timezone shift
            const result = calculateBookingCost('2026-06-19T12:00:00', '2026-06-20T12:00:00');
            expect(result.nights).toBe(1);
            expect(result.total).toBe(125);
            expect(result.breakdown?.weeknights).toBe(0);
            expect(result.breakdown?.weekends).toBe(1);
        });

        it('charges $125 for a Saturday night', () => {
            // 2026-06-20 is a Saturday
            const result = calculateBookingCost('2026-06-20T12:00:00', '2026-06-21T12:00:00');
            expect(result.nights).toBe(1);
            expect(result.total).toBe(125);
            expect(result.breakdown?.weekends).toBe(1);
        });
    });

    // --- Multi-Night Stays ---
    describe('Multi-Night Stays', () => {
        it('calculates a Mon-Thu stay correctly (3 weeknights)', () => {
            // Mon Jun 15 to Thu Jun 18 = 3 weeknights
            const result = calculateBookingCost('2026-06-15', '2026-06-18');
            expect(result.nights).toBe(3);
            expect(result.total).toBe(300); // 3 x $100
            expect(result.breakdown?.weeknights).toBe(3);
            expect(result.breakdown?.weekends).toBe(0);
        });

        it('calculates a Fri-Sun stay correctly (2 weekend nights)', () => {
            // Fri Jun 19 to Sun Jun 21 = 2 weekend nights
            const result = calculateBookingCost('2026-06-19T12:00:00', '2026-06-21T12:00:00');
            expect(result.nights).toBe(2);
            expect(result.total).toBe(250); // 2 x $125
            expect(result.breakdown?.weeknights).toBe(0);
            expect(result.breakdown?.weekends).toBe(2);
        });

        it('calculates a mixed weeknight/weekend stay correctly', () => {
            // Thu Jun 18 to Sun Jun 21 = Thu(100) + Fri(125) + Sat(125) = $350
            const result = calculateBookingCost('2026-06-18T12:00:00', '2026-06-21T12:00:00');
            expect(result.nights).toBe(3);
            expect(result.total).toBe(350);
            expect(result.breakdown?.weeknights).toBe(1);
            expect(result.breakdown?.weekends).toBe(2);
        });
    });

    // --- Weekly Discount ---
    describe('Weekly Discount ($100 off per 7 nights)', () => {
        it('applies $100 discount for exactly 7 nights', () => {
            // Mon Jun 15 to Mon Jun 22 = 5 weeknights + 2 weekends
            // Subtotal: 5*100 + 2*125 = 750, Discount: 100, Total: 650
            const result = calculateBookingCost('2026-06-15', '2026-06-22');
            expect(result.nights).toBe(7);
            expect(result.breakdown?.fullWeeks).toBe(1);
            expect(result.breakdown?.discount).toBe(100);
            expect(result.breakdown?.weeknightTotal).toBe(500);
            expect(result.breakdown?.weekendTotal).toBe(250);
            expect(result.total).toBe(650);
        });

        it('does NOT apply discount for 6 nights', () => {
            // Mon Jun 15 to Sun Jun 21 = 4 weeknights + 2 weekends
            const result = calculateBookingCost('2026-06-15', '2026-06-21');
            expect(result.nights).toBe(6);
            expect(result.breakdown?.fullWeeks).toBe(0);
            expect(result.breakdown?.discount).toBe(0);
        });

        it('applies $200 discount for 14 nights (2 full weeks)', () => {
            // Mon Jun 15 to Mon Jun 29 = 14 nights
            const result = calculateBookingCost('2026-06-15', '2026-06-29');
            expect(result.nights).toBe(14);
            expect(result.breakdown?.fullWeeks).toBe(2);
            expect(result.breakdown?.discount).toBe(200);
        });

        it('applies only 1 discount for 10 nights (1 full week + 3 extra)', () => {
            const result = calculateBookingCost('2026-06-15', '2026-06-25');
            expect(result.nights).toBe(10);
            expect(result.breakdown?.fullWeeks).toBe(1);
            expect(result.breakdown?.discount).toBe(100);
        });
    });

    // --- Average Rate ---
    describe('Average Rate Calculation', () => {
        it('calculates correct average rate for 7-night stay', () => {
            const result = calculateBookingCost('2026-06-15', '2026-06-22');
            // Total 650 / 7 nights = ~92.86
            expect(result.averageRate).toBeCloseTo(92.86, 1);
        });

        it('calculates correct average rate for single weeknight', () => {
            const result = calculateBookingCost('2026-06-15', '2026-06-16');
            expect(result.averageRate).toBe(100);
        });
    });

    // --- String/Date Input Handling ---
    describe('Input Formats', () => {
        it('handles Date objects', () => {
            const result = calculateBookingCost(new Date('2026-06-15'), new Date('2026-06-16'));
            expect(result.nights).toBe(1);
            expect(result.total).toBe(100);
        });

        it('handles string dates', () => {
            const result = calculateBookingCost('2026-06-15', '2026-06-16');
            expect(result.nights).toBe(1);
            expect(result.total).toBe(100);
        });
    });
});
