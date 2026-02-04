
// functions/helpers/shareholders.js
// PORTED FROM src/lib/shareholders.js to ensure Logic Parity
// CommonJS Format for Cloud Functions

const SHAREHOLDERS_2025 = [
    "Mike & Janelle",
    "Julia, Mandy & Bryan",
    "Brian & Monique",
    "Brian & Sam",
    "Jeff & Lori",
    "David & Gayla",
    "Barb",
    "Steve & Kate",
    "Ernest & Sandy",
    "Gerry & Georgina",
    "Saurabh & Jessica",
    "Dom & Melanie"
];

function getShareholderOrder(year) {
    // TESTING OVERRIDE: For 2026, start with Julia, Mandy & Bryan
    if (year === 2026) {
        return [
            "Julia, Mandy & Bryan",
            "Brian & Monique",
            "Brian & Sam",
            "Jeff & Lori",
            "David & Gayla",
            "Barb",
            "Steve & Kate",
            "Ernest & Sandy",
            "Gerry & Georgina",
            "Saurabh & Jessica",
            "Dom & Melanie",
            "Mike & Janelle"
        ];
    }

    const baseYear = 2025;
    const diff = year - baseYear;

    if (diff <= 0) return SHAREHOLDERS_2025;

    const rotation = diff % SHAREHOLDERS_2025.length;

    return [
        ...SHAREHOLDERS_2025.slice(rotation),
        ...SHAREHOLDERS_2025.slice(0, rotation)
    ];
}

// --- DRAFT CONFIGURATION ---
const DRAFT_CONFIG = {
    // Current Production Start: March 1, 2026.
    START_DATE: new Date(2026, 2, 1, 0, 0, 0),

    PICK_DURATION_DAYS: 2,
    SEASON_START: new Date(2026, 3, 3), // April 3
    SEASON_END: new Date(2026, 9, 12),   // Oct 12
    IS_TEST_MODE: false // System always in production
};

/**
 * STRICT RULE: Every turn officially starts at 10:00 AM.
 * If finished before 10 AM, starts at 10 AM today.
 * If finished after 10 AM, starts at 10 AM tomorrow.
 */
function getOfficialStart(finishTime) {
    if (!finishTime) return null;
    const date = new Date(finishTime);

    // Convert finishTime to Pacific Time 'Wall Clock' components
    // We use toLocaleString with America/Vancouver to get the local date/hour in PT
    const options = { timeZone: 'America/Vancouver', hour12: false, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' };
    const ptString = date.toLocaleString('en-US', options);

    // Parse the PT components back out to understand the "Wall Clock" time
    // format roughly "M/D/YYYY, HH:MM:SS"
    // But referencing the date object directly against 10 AM in PT is easier by creating a target.

    // 1. Create a "Today 10 AM PT" target for the given date
    // We do this by getting the YMD parts in PT
    const ymdOptions = { timeZone: 'America/Vancouver', year: 'numeric', month: 'numeric', day: 'numeric' };
    const ptDateString = date.toLocaleString('en-US', ymdOptions); // e.g., "3/15/2026"

    // Construct "Today 10:00 AM" in PT
    // Note: We use a string constructor which JS parses well, but explicit is better.
    // Let's rely on standard ISO-like construction or just manipulating the string if risky.
    // Actually, creating a Date object effectively "in PT" is tricky in vanilla JS.
    // Better approach:
    // Get the hour in PT.
    const hourInPT = parseInt(date.toLocaleString('en-US', { timeZone: 'America/Vancouver', hour: 'numeric', hour12: false }));

    // If hourInPT < 10, then "Today 10 AM PT" is the target.
    // If hourInPT >= 10, then "Tomorrow 10 AM PT" is the target (unless minute is 0 and second is 0... strictly > 10 is safest or >= 10:00:01)

    // Let's refine the check:
    // Compare 'date' vs 'date set to 10 AM PT on same day'

    // We need to generate a Date object that REPRESENTS 10 AM PT on the date of 'finishTime'.
    const tenAmPTSource = new Date(ptDateString + " 10:00:00");
    // WARNING: 'new Date("3/15/2026 10:00:00")' uses local browser/server timezone, NOT PT.
    // This is the trap.

    // CORRECT APPROACH WITHOUT LIBRARIES:
    // 1. Get the current PT date string "MM/DD/YYYY".
    // 2. We want to find the timestamp X such that X in PT is "MM/DD/YYYY 10:00:00".
    // 3. Since we don't have date-fns-tz, we can iterate or use offsets, but getting offset is hard.

    // Alternative:
    // Uses the fact that we just need to return a Date object.
    // If we return a Date object that is "Tomorrow 10 AM UTC", that is wrong.
    // We need "Tomorrow 10 AM PT".

    // Let's try this:
    // 1. Take 'date'. Is it before 10 AM PT? 
    //    check hourInPT. If hourInPT < 10, yes. If hourInPT > 10, no.
    //    If hourInPT == 10, check minutes.

    const minutesInPT = parseInt(date.toLocaleString('en-US', { timeZone: 'America/Vancouver', minute: 'numeric' }));

    let isBeforeTen = false;
    if (hourInPT < 10) isBeforeTen = true;
    else if (hourInPT === 10 && minutesInPT === 0 && date.getSeconds() === 0) isBeforeTen = true; // Exactly 10 AM counts as "by 10 AM" -> Start today? No, starts today if "finished before".
    // Rule: "If finished before 10 AM, starts at 10 AM today." (meaning window opens today).
    // If finished at 10:00:01, starts tomorrow.

    // Target Day String:
    const targetDatePT = new Date(ptDateString); // "3/15/2026" -> Local midnight? NO. Browser interprets as local.
    // We can't rely on string parsing in unknown server locale.

    // ULTRA-ROBUST METHOD:
    // We construct the "Next 10 AM PT".
    // We loop forward in 12-hour increments until we hit the time? No too slow.

    // Method:
    // 1. Get readable string of "Today 10:00 AM America/Vancouver" -> converting to timestamp is the hard part.
    // Actually, we can just assume the server might be UTC and we need to be careful.

    // Let's stick to the definition:
    // logic: If (Now in PT) <= 10:00 AM, Target = (Today in PT) @ 10:00 AM.
    // Result must be a Date object.

    // We can reconstruct the date string safely and append offset?
    // "2026-03-15T10:00:00-07:00" (PDT) or "-08:00" (PST). 
    // We don't know if it's DST or not easily.

    // Compromise:
    // Use `Intl.DateTimeFormat` to get parts, then use a library if present? No library.
    // Use the `toDate` helper in checking provided file... no helpers.

    // Let's look at existing code again.
    // "const tenAM = new Date(date); tenAM.setHours(10, 0, 0, 0);"
    // This sets 10 AM *system local time*.

    // PROPOSAL:
    // We will assume that we can treat the date as UTC for calculation then shift? No.

    // Let's do this:
    // 1. Get year, month, day of the event in PT.
    // 2. Construct a string "YYYY-MM-DD 10:00:00" (Wall clock target).
    // 3. We need to convert that "Wall clock" back to UTC timestamp.
    //    There is a trick: `new Date("YYYY-MM-DD 10:00:00")` is local.
    //    We can loop: guess a timestamp, convert to PT string, compare to target string, adjust.
    //    This is "Seek and Destroy" method. It is robust and library-free.

    // But since we are likely on Firebase Functions (UTC usually), maybe we can just use offsets?
    // No, DST changes in March/Nov.

    // Let's go with the logic that checks Hour In PT and then ensures the resulting object, when printed in PT, says "10:00:00".

    // Simplified Logic:
    // 1. Get 'date'. formatting to PT.
    // 2. Decide if we want "Today" or "Tomorrow" (Day boundary at 10 AM PT).
    // 3. Construct the target timestamp.

    const ptParts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Vancouver',
        year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric',
        hour12: false
    }).formatToParts(date);

    const part = (type) => parseInt(ptParts.find(p => p.type === type).value);

    const pHour = part('hour');
    const pMinute = part('minute');
    const pSecond = part('second');

    // Is it before 10:00:00?
    // Taking "Finished at or before 10:00:00 AM" -> Starts 10 AM Today.
    // Note: If exactly 10:00:00, it starts today.
    const isBeforeOrAtTen = (pHour < 10) || (pHour === 10 && pMinute === 0 && pSecond === 0);

    // Calculate target Day delta
    // If before 10, current PT day. If after, next PT day.

    // Now, finding the timestamp for "10 AM PT on Target Day".
    // Start with 'date'.
    // If isBeforeOrAtTen, we want to change 'date' to be 10 AM PT on the same day.
    // If !isBeforeOrAtTen, we want to add 1 day and set to 10 AM PT.

    // We can iterate to find the specific timestamp.
    // Start with 'date'. Set UTC hours to 17 (10 AM + 7) or 18 (10 AM + 8) as a rough guess?
    // Better:
    // Create a date, setHours(10)... in local.
    // Then check what that is in PT. Calculate difference. Apply correction.

    // Function to get "10 AM PT" for a given JS Date object's Day:
    const getTenAmPtForDay = (baseDate) => {
        // Base guess: Set UTC to 17:00 (approx 10 AM PDT) or 18:00 (PST)
        // 10 AM is 17:00 UTC (PDT -7) or 18:00 UTC (PST -8)
        const guess = new Date(baseDate);
        guess.setUTCHours(18, 0, 0, 0); // Try 18:00 UTC (Safe PST guess)

        // Check what time this is in Vancouver
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/Vancouver', hour: 'numeric', hour12: false, minute: 'numeric'
        }).formatToParts(guess);
        const h = parseInt(parts.find(p => p.type === 'hour').value);

        // If h is 10, we are good! (18:00 UTC was 10 AM PST)
        // If h is 11, it means we are in PDT (18:00 UTC is 11 AM PDT). We need to subtract 1 hour.

        if (h === 11) {
            guess.setUTCHours(17, 0, 0, 0);
        } else if (h !== 10) {
            // Fallback for weirdness, straightforward correction
            // If h=9 (unlikely), add 1. 
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

function getPickDurationMS(fastTestingMode) {
    return fastTestingMode
        ? (10 * 60 * 1000) // Fast mode: 10 minutes
        : (DRAFT_CONFIG.PICK_DURATION_DAYS * 24 * 60 * 60 * 1000); // Normal: 48 hours
}


function calculateDraftSchedule(shareholders, bookings = [], now = new Date(), startDateOverride = null, fastTestingMode = false, bypassTenAM = false) {
    const DRAFT_START = startDateOverride ? new Date(startDateOverride) : DRAFT_CONFIG.START_DATE;
    const PICK_DURATION_MS = getPickDurationMS(fastTestingMode);

    // Build the full turn order (Round 1 + Round 2 Snake)
    const round1Order = [...shareholders];
    const round2Order = [...shareholders].reverse();
    const fullTurnOrder = [...round1Order, ...round2Order];

    // STRICT RULE: The calculation cycle must effectively start from an Official 10 AM block.
    // RELAXED RULE: In fastTestingMode OR if bypassTenAM is specified, we bypass the 10 AM rounding for immediate testing.
    const startAnchor = (time) => (fastTestingMode || bypassTenAM) ? new Date(time) : getOfficialStart(time);
    let currentWindowStart = startAnchor(DRAFT_START);

    let activePicker = null;
    let nextPicker = null;
    let activeWindowEnd = null;
    let phase = 'PRE_DRAFT';
    let isGracePeriod = false;
    let isSeasonStart = false;

    // Track how many turns each user has taken to match with bookings
    const userTurnCounts = {};
    shareholders.forEach(s => userTurnCounts[s] = 0);

    for (let i = 0; i < fullTurnOrder.length; i++) {
        const shareholderName = fullTurnOrder[i];

        // Determine which booking index we are looking for (0 for 1st choice, 1 for 2nd)
        const bookingIndex = userTurnCounts[shareholderName];
        userTurnCounts[shareholderName]++; // Increment for next time we see them

        // Find if they have a booking/pass for this slot
        const userActions = bookings
            .filter(b => b.shareholderName === shareholderName) // Allow cancelled to be seen
            .sort((a, b) => a.createdAt - b.createdAt);

        const action = userActions[bookingIndex];

        if (action) {
            // Check if this action completes the turn (Pass, Finalized Booking, or Cancelled)
            const isCompleted = action.type === 'pass' || action.type === 'cancelled' || action.isFinalized !== false;

            if (isCompleted) {
                // Turn is done. Next window starts at official 10 AM anchor.
                let actionTime = (action.type === 'cancelled' && action.cancelledAt) ? action.cancelledAt : (action.createdAt || action.from);
                if (!actionTime) actionTime = currentWindowStart;

                // Safe Date Conversion (Handle Firestore Timestamp)
                let pTime;
                if (actionTime?.toDate) {
                    pTime = actionTime.toDate();
                } else {
                    pTime = new Date(actionTime);
                }

                if (!isNaN(pTime.getTime())) {
                    currentWindowStart = startAnchor(pTime);
                }
            } else {
                // Booking exists but is NOT finalized (Draft Mode).
                const windowLimit = new Date(currentWindowStart.getTime() + PICK_DURATION_MS);

                if (now > windowLimit) {
                    // TIMEOUT implies Finalization and move to next 10 AM
                    currentWindowStart = startAnchor(windowLimit);
                } else {
                    // Still active and within window
                    activePicker = shareholderName;
                    nextPicker = fullTurnOrder[i + 1] || null;
                    activeWindowEnd = windowLimit;
                    isSeasonStart = (i === 0);
                    // Special Rule: First person ignores Grace Period (Early Access active immediately)
                    isGracePeriod = isSeasonStart ? false : (now < currentWindowStart);
                    phase = (i < round1Order.length) ? 'ROUND_1' : 'ROUND_2';
                    break;
                }
            }
        } else {
            // No action found. They are either ACTIVE or TIMED OUT.
            const windowLimit = new Date(currentWindowStart.getTime() + PICK_DURATION_MS);

            if (now > windowLimit) {
                // TIMEOUT / IMPLICIT PASS
                currentWindowStart = startAnchor(windowLimit);
            } else {
                // THEY ARE ACTIVE
                activePicker = shareholderName;
                nextPicker = fullTurnOrder[i + 1] || null;
                activeWindowEnd = windowLimit;
                isSeasonStart = (i === 0);
                // Special Rule: First person ignores Grace Period (Early Access active immediately)
                isGracePeriod = isSeasonStart ? false : (now < currentWindowStart);
                phase = (i < round1Order.length) ? 'ROUND_1' : 'ROUND_2';
                break;
            }
        }
    }

    // If loop finishes without activePicker, draft is done
    if (!activePicker && now >= DRAFT_START) {
        phase = 'OPEN_SEASON';
    } else if (now < DRAFT_START && bookings.length === 0 && !activePicker) {
        phase = 'PRE_DRAFT';
    }

    const currentRound = phase === 'ROUND_1' ? 1 : phase === 'ROUND_2' ? 2 : (phase === 'OPEN_SEASON' ? 3 : 1);

    return {
        phase,
        activePicker,
        nextPicker,
        windowEnds: activeWindowEnd,
        draftStart: DRAFT_START,
        isGracePeriod,
        isSeasonStart,
        windowStarts: currentWindowStart, // FIX: Match property expected by autosync and frontend
        officialStart: currentWindowStart,
        debugPhase: phase, // Helper for debugging
        round: currentRound
    };
}


module.exports = {
    SHAREHOLDERS_2025,
    getShareholderOrder,
    DRAFT_CONFIG,
    getOfficialStart,
    getPickDurationMS,
    calculateDraftSchedule
};
