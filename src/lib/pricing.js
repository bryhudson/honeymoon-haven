import { startOfDay, eachDayOfInterval, isFriday, isSaturday, differenceInCalendarDays } from 'date-fns';

/**
 * Calculates the maintenance fee for a given booking range.
 * 
 * Rules (2026):
 * - Weeknights (Sun-Thu): $100
 * - Weekends (Fri-Sat): $125
 * - Weekly Discount: Bookings of 7 consecutive nights get $100 off (1 free weeknight).
 *   (Standard week: 5 x $100 + 2 x $125 = $750. With discount: $650).
 * 
 * @param {Date|string} start - Check-in date
 * @param {Date|string} end - Check-out date
 * @returns {Object} { total, nights, averageRate, breakdown: { weeknights, weekends, discount } }
 */
export function calculateBookingCost(start, end) {
    if (!start || !end) return { total: 0, nights: 0, averageRate: 0, breakdown: null };

    const startDate = new Date(start);
    const endDate = new Date(end);

    // Calculate nights
    const nights = differenceInCalendarDays(endDate, startDate);
    if (nights <= 0) return { total: 0, nights: 0, averageRate: 0, breakdown: null };

    // Generate array of days (excluding checkout day for nightly rate calc)
    // eachDayOfInterval includes start and end. We want nights, so we stop before end.
    // Actually, simpler: Iterate from 0 to nights-1 adding days to start.

    let weeknightCount = 0;
    let weekendCount = 0;

    // We can use a loop to check each night
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
    // For every full 7 nights, subtract $100
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
