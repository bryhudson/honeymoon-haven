
// Mock strict logic from src/lib/shareholders.js
// We copy it here to test it in isolation without module dependency issues
function getOfficialStart(finishTime) {
    if (!finishTime) return null;
    const date = new Date(finishTime);

    // Convert finishTime to Pacific Time 'Wall Clock' components
    // We use toLocaleString with America/Vancouver to get the local date/hour in PT
    const options = { timeZone: 'America/Vancouver', hour12: false, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' };

    // 1. Create a "Today 10 AM PT" target for the given date
    // We do this by getting the YMD parts in PT
    const ymdOptions = { timeZone: 'America/Vancouver', year: 'numeric', month: 'numeric', day: 'numeric' };
    const ptDateString = date.toLocaleString('en-US', ymdOptions); // e.g., "3/15/2026"

    const hourInPT = parseInt(date.toLocaleString('en-US', { timeZone: 'America/Vancouver', hour: 'numeric', hour12: false }));
    const minutesInPT = parseInt(date.toLocaleString('en-US', { timeZone: 'America/Vancouver', minute: 'numeric' }));

    let isBeforeTen = false;
    if (hourInPT < 10) isBeforeTen = true;
    else if (hourInPT === 10 && minutesInPT === 0 && date.getSeconds() === 0) isBeforeTen = true;

    // Function to get "10 AM PT" for a given JS Date object's Day
    const getTenAmPtForDay = (baseDate) => {
        // Base guess: Set UTC to 18:00 (Safe PST guess, 10 AM)
        const guess = new Date(baseDate);
        guess.setUTCHours(18, 0, 0, 0);

        // Check what time this is in Vancouver
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/Vancouver', hour: 'numeric', hour12: false
        }).formatToParts(guess);
        const h = parseInt(parts.find(p => p.type === 'hour').value);

        if (h === 11) {
            guess.setUTCHours(17, 0, 0, 0); // PDT adjustment
        } else if (h !== 10) {
            const diff = 10 - h;
            guess.setUTCHours(18 + diff, 0, 0, 0);
        }
        return guess;
    };

    let target = new Date(date);
    if (!isBeforeTen) {
        // Move to tomorrow first
        target.setDate(target.getDate() + 1);
    }

    return getTenAmPtForDay(target);
}

// TEST CASES

function runTest(description, inputDateIso, expectedDateIsoNote) {
    const input = new Date(inputDateIso);
    const result = getOfficialStart(input);
    const resultPT = result.toLocaleString('en-US', { timeZone: 'America/Vancouver' });

    console.log(`TEST: ${description}`);
    console.log(`   Input (ISO): ${input.toISOString()} (${input.toLocaleString('en-US', { timeZone: 'America/Vancouver' })})`);
    console.log(`   Result (PT): ${resultPT}`);
    console.log(`   Result (ISO): ${result.toISOString()}`);

    // Check if result is 10:00:00
    if (resultPT.includes("10:00:00")) {
        console.log("   ✅ PASSED: Target is 10:00 AM PT");
    } else {
        console.log("   ❌ FAILED: Target is NOT 10:00 AM PT");
    }
    console.log("------------------------------------------------");
}

console.log("Running Timezone Logic Tests...\n");

// Case 1: 5 PM PT (After 10 AM) -> Tomorrow 10 AM
// March 15 (PDT)
runTest("Finish at 5 PM PT", "2026-03-15T17:00:00-07:00", "Tomorrow 10 AM");

// Case 2: 9 AM PT (Before 10 AM) -> Today 10 AM
runTest("Finish at 9 AM PT", "2026-03-15T09:00:00-07:00", "Today 10 AM");

// Case 3: 2 AM PT (Before 10 AM) -> Today 10 AM
runTest("Finish at 2 AM PT", "2026-03-15T02:00:00-07:00", "Today 10 AM");

// Case 4: 10:01 AM PT (After 10 AM) -> Tomorrow 10 AM
runTest("Finish at 10:01 AM PT", "2026-03-15T10:01:00-07:00", "Tomorrow 10 AM");

// Case 5: Winter (Standard Time) -> Nov 15
// Nov is PST (-08:00)
// 11 AM PST -> Tomorrow 10 AM PST
runTest("Winter 11 AM PST", "2026-11-15T11:00:00-08:00", "Tomorrow 10 AM");

