import { startOfDay, eachDayOfInterval, isFriday, isSaturday, differenceInCalendarDays } from 'date-fns';

export interface CostBreakdown {
    weeknights: number;
    weekends: number;
    weeknightTotal: number;
    weekendTotal: number;
    discount: number;
    fullWeeks: number;
}

export interface BookingCost {
    total: number;
    nights: number;
    averageRate: number;
    breakdown: CostBreakdown | null;
}

/**
 * Calculates the maintenance fee for a given booking range.
 * 
 * Rules (2026):
 * - Weeknights (Sun-Thu): $100 Maintenance Fee
 * - Weekends (Fri-Sat): $125 Maintenance Fee
 * - Weekly Discount: Stays of 7 consecutive nights get $100 off (1 free weeknight).
 * 
 * @param {Date|string} start - Check-in date
 * @param {Date|string} end - Check-out date
 * @returns {BookingCost}
 */
export function calculateBookingCost(start: Date | string | null | undefined, end: Date | string | null | undefined): BookingCost {
    if (!start || !end) return { total: 0, nights: 0, averageRate: 0, breakdown: null };

    const startDate = new Date(start);
    const endDate = new Date(end);

    // Calculate nights
    const nights = differenceInCalendarDays(endDate, startDate);
    if (nights <= 0) return { total: 0, nights: 0, averageRate: 0, breakdown: null };

    let weeknightCount = 0;
    let weekendCount = 0;

    // Iterate through each night
    for (let i = 0; i < nights; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);

        // Check if Friday or Saturday
        if (isFriday(d) || isSaturday(d)) {
            weekendCount++;
        } else {
            weeknightCount++;
        }
    }

    const weeknightTotal = weeknightCount * 100;
    const weekendTotal = weekendCount * 125;
    let subtotal = weeknightTotal + weekendTotal;

    // Apply Weekly Discounts
    const fullWeeks = Math.floor(nights / 7);
    const discount = fullWeeks * 100;

    const total = subtotal - discount;
    const averageRate = total / nights;

    return {
        total,
        nights,
        averageRate,
        breakdown: {
            weeknights: weeknightCount,
            weekends: weekendCount,
            weeknightTotal,
            weekendTotal,
            discount,
            fullWeeks
        }
    };
}
