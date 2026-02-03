// Local Test for Pricing Logic

// We need to bypass the ESM import issues for the quick test, or use a wrapper.
// Since src/lib/pricing.js uses 'import', we can't require it directly in generic node unless type=module.
// I'll create a temporary version of pricing logic here to test EXACT logic.
// OR I can use 'esm' package if available. 
// Safest is to copy the logic into this script for isolation testing first, 
// then if that passes, trust the logic matches.
// BUT `import { isFriday }` needs `date-fns`.

// Let's rely on copying the logic to verify the LOGIC itself, using standard JS dates.

function isFriday(date) {
    return date.getDay() === 5;
}

function isSaturday(date) {
    return date.getDay() === 6;
}

// Minimal differenceInCalendarDays
function differenceInCalendarDays(a, b) {
    const _a = new Date(a);
    const _b = new Date(b);
    _a.setHours(0, 0, 0, 0);
    _b.setHours(0, 0, 0, 0);
    return Math.round((_a - _b) / (1000 * 60 * 60 * 24));
}

function calculateBookingCost(start, end) {
    if (!start || !end) return { total: 0, nights: 0, averageRate: 0, breakdown: null };

    const startDate = new Date(start);
    const endDate = new Date(end);

    // Calculate nights
    const nights = differenceInCalendarDays(endDate, startDate);
    if (nights <= 0) return { total: 0, nights: 0, averageRate: 0, breakdown: null };

    let weeknightCount = 0;
    let weekendCount = 0;

    // We can use a loop to check each night
    for (let i = 0; i < nights; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);

        console.log(`Night ${i + 1}: ${d.toDateString()} (Day ${d.getDay()})`);

        // Check if Friday or Saturday
        if (isFriday(d) || isSaturday(d)) {
            console.log("  -> Weekend");
            weekendCount++;
        } else {
            console.log("  -> Weeknight");
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

    return {
        total,
        nights,
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

console.log("--- TEST 1: Mar 25 - Mar 27 (Wed-Fri) ---");
// Expect: Wed Night, Thu Night. (2 Weeknights).
console.log(calculateBookingCost('2026-03-25T12:00:00', '2026-03-27T12:00:00'));

console.log("\n--- TEST 2: Mar 26 - Mar 28 (Thu-Sat) ---");
// Expect: Thu Night (Weeknight), Fri Night (Weekend). (1 Weeknight, 1 Weekend).
console.log(calculateBookingCost('2026-03-26T12:00:00', '2026-03-28T12:00:00'));

console.log("\n--- TEST 3: Mar 27 - Mar 29 (Fri-Sun) ---");
// Expect: Fri Night (Weekend), Sat Night (Weekend). (2 Weekends).
console.log(calculateBookingCost('2026-03-27T12:00:00', '2026-03-29T12:00:00'));
