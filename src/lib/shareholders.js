
export function normalizeName(name) {
    if (!name) return "";
    return name.toString().toLowerCase()
        .replace(/&/g, "and")
        .replace(/\s+/g, " ")
        .trim();
}

export const SHAREHOLDERS_2025 = [
    "Janelle and Mike",
    "Julia, Mandy and Bryan",
    "Monique and Brian",
    "Sam and Brian",
    "Lori and Jeff",
    "Gayla and David",
    "Barb",
    "Steve and Kate",
    "Sandy and Ernest",
    "Georgina and Jerry",
    "Jessica and Saurabh",
    "Melanie and Dom"
];

export function getShareholderOrder(year) {
    // TESTING OVERRIDE: For 2026, start with Julia, Mandy & Bryan
    if (year === 2026) {
        return [
            "Julia, Mandy and Bryan",
            "Monique and Brian",
            "Sam and Brian",
            "Lori and Jeff",
            "Gayla and David",
            "Barb",
            "Steve and Kate",
            "Sandy and Ernest",
            "Georgina and Jerry",
            "Jessica and Saurabh",
            "Melanie and Dom",
            "Janelle and Mike"
        ];
    }

    const baseYear = 2025;
    const diff = year - baseYear;

    // If diff is negative (past), handle wrap around or just return 2025 for simplicity? 
    // Assuming forward looking for now.
    if (diff <= 0) return SHAREHOLDERS_2025;

    const rotation = diff % SHAREHOLDERS_2025.length;

    // Logic: "First becomes last" -> Left Rotation
    // 2025 (Diff 0): [A, B, C]
    // 2026 (Diff 1): [B, C, A] -> Slice(1) + Slice(0, 1)

    return [
        ...SHAREHOLDERS_2025.slice(rotation),
        ...SHAREHOLDERS_2025.slice(0, rotation)
    ];
}

// DEPRECATED: Use Firestore 'shareholders' collection instead.
// This constant is now only used as a fallback for initial migration.
export const CABIN_OWNERS = [
    { cabin: "1", name: "Georgina and Jerry" },
    { cabin: "2", name: "Janelle and Mike" },
    { cabin: "3", name: "Monique and Brian" },
    { cabin: "4", name: "Sam and Brian" },
    { cabin: "5", name: "Sandy and Ernest" },
    { cabin: "6", name: "Barb" },
    { cabin: "7", name: "Lori and Jeff" },
    { cabin: "8", name: "Julia, Mandy and Bryan" },
    { cabin: "9", name: "Gayla and David" },
    { cabin: "10", name: "Jessica and Saurabh" },
    { cabin: "11", name: "Melanie and Dom" },
    { cabin: "12", name: "Steve and Kate" }
];

// --- DRAFT CONFIGURATION ---
export const DRAFT_CONFIG = {
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
export function getOfficialStart(finishTime) {
    if (!finishTime) return null;
    const date = new Date(finishTime);

    // Get PT components accurately to check for exact 10:00:00
    const ptParts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false
    }).formatToParts(date);

    const hour = parseInt(ptParts.find(p => p.type === 'hour').value);
    const minute = parseInt(ptParts.find(p => p.type === 'minute').value);
    const second = parseInt(ptParts.find(p => p.type === 'second').value);

    // RULE: If strictly before 10 AM or ALREADY exactly 10:00:00 PT, use Today at 10 AM.
    // Otherwise, push to tomorrow 10 AM.
    const isPastTen = (hour > 10) || (hour === 10 && (minute > 0 || second > 0));

    return getTargetPstTime(date, 10, isPastTen ? 1 : 0);
}

/**
 * Helper to get a clean 10 AM (or any hour) Date object in PST/PDT.
 */
function getTargetPstTime(baseDate, targetHour, daysOffset = 0) {
    const adjustedDate = new Date(baseDate);
    adjustedDate.setDate(adjustedDate.getDate() + daysOffset);

    // Get the year/month/day components in PT
    const ptParts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        year: 'numeric', month: 'numeric', day: 'numeric'
    }).formatToParts(adjustedDate);

    const year = parseInt(ptParts.find(p => p.type === 'year').value);
    const month = parseInt(ptParts.find(p => p.type === 'month').value);
    const day = parseInt(ptParts.find(p => p.type === 'day').value);

    // 1. Initial guess: Target time in UTC-8 (PST)
    const guess = new Date(Date.UTC(year, month - 1, day, targetHour + 8, 0, 0, 0));

    // 2. Refine based on actual PT hour in that guess (handles DST automatically)
    const checkParts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        hour: 'numeric', hour12: false
    }).formatToParts(guess);
    const actualHour = parseInt(checkParts.find(p => p.type === 'hour').value);

    if (actualHour !== targetHour) {
        // Correct for PDT (-7) vs PST (-8)
        guess.setUTCHours(guess.getUTCHours() + (targetHour - actualHour));
    }

    return guess;
}

export function getPickDurationMS() {
    // Always use 48-hour windows (fast testing mode removed)
    return DRAFT_CONFIG.PICK_DURATION_DAYS * 24 * 60 * 60 * 1000; // 48 hours
}


export function calculateDraftSchedule(shareholders, bookings = [], now = new Date(), startDateOverride = null, bypassTenAM = false) {
    const DRAFT_START = startDateOverride ? new Date(startDateOverride) : DRAFT_CONFIG.START_DATE;
    const PICK_DURATION_MS = getPickDurationMS();


    // Build the full turn order (Round 1 + Round 2 Snake)
    const round1Order = [...shareholders];
    const round2Order = [...shareholders].reverse();
    const fullTurnOrder = [...round1Order, ...round2Order];

    // If we are before the start date and no bookings exist, it is PRE_DRAFT.
    // RELAXED RULE: We allow the first person to have "Early Access" (Active Loop) even before DRAFT_START.
    // The loop below will correctly set their windowEnds to DRAFT_START + 48h using currentWindowStart.
    /* 
    if (bookings.length === 0 && now < DRAFT_START) {
        return {
            phase: 'PRE_DRAFT',
            activePicker: null,
            nextPicker: fullTurnOrder[0], // First person is up next
            windowEnds: null,
            draftStart: DRAFT_START,
            isGracePeriod: false,
            isSeasonStart: false,
            officialStart: DRAFT_START,
            debugPhase: 'PRE_DRAFT_HARD_LOCK'
        };
    }
    */

    // STRICT RULE: The calculation cycle must effectively start from an Official 10 AM block.
    // RULE: bypassTenAM is now ignored for the startAnchor to enforce the 10 AM snap for deadlines.
    const startAnchor = (time) => getOfficialStart(time);
    let currentWindowStart = startAnchor(DRAFT_START);
    let lastCompletionTime = null; // Track actual previous finish for Early Access display

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
            .filter(b => normalizeName(b.shareholderName) === normalizeName(shareholderName)) // Allow cancelled to be seen
            .sort((a, b) => a.createdAt - b.createdAt);

        const action = userActions[bookingIndex];

        if (action) {
            // Turn is done. Next window starts at official 10 AM anchor.
            let actionTime = (action.type === 'cancelled' && action.cancelledAt) ? action.cancelledAt : (action.createdAt || action.from);
            if (!actionTime) actionTime = currentWindowStart;

            // Safe Date Conversion (Handle Firestore Timestamp)
            let pTime = actionTime?.toDate ? actionTime.toDate() : new Date(actionTime);

            if (!isNaN(pTime.getTime())) {
                lastCompletionTime = pTime;
                currentWindowStart = startAnchor(pTime);
            }
        } else {
            // No action found. They are either ACTIVE or TIMED OUT.
            const windowLimit = new Date(currentWindowStart.getTime() + PICK_DURATION_MS);

            if (now > windowLimit) {
                // TIMEOUT / IMPLICIT PASS
                lastCompletionTime = windowLimit;
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

export function adjustForCourtesy(date) {
    return getOfficialStart(date);
}

export function mapOrderToSchedule(shareholders, bookings = [], startDateOverride = null, bypassTenAM = false) {
    const DRAFT_START = startDateOverride ? new Date(startDateOverride) : DRAFT_CONFIG.START_DATE;
    const PICK_DURATION_MS = getPickDurationMS();

    const fullTurnOrder = [...shareholders, ...[...shareholders].reverse()];
    const schedule = [];

    // Track user turns
    const userTurnCounts = {};
    shareholders.forEach(s => userTurnCounts[s] = 0);



    // RULE: Snap all windows to 10AM Official rule
    const startAnchor = (time) => getOfficialStart(time);

    // Mirror calculateDraftSchedule logic: Start cursor aligned to Official rule
    let currentWindowStart = startAnchor(DRAFT_START);
    let hasFoundActive = false;
    let lastCompletionTime = null;

    for (let i = 0; i < fullTurnOrder.length; i++) {
        const name = fullTurnOrder[i];
        const turnIndex = userTurnCounts[name];
        userTurnCounts[name]++;
        let returnStart = null;

        // Find match
        const userActions = bookings
            .filter(b => normalizeName(b.shareholderName) === normalizeName(name)) // Allow cancelled
            .sort((a, b) => a.createdAt - b.createdAt);

        const action = userActions[turnIndex];
        const isCompleted = action && (action.type === 'pass' || action.type === 'cancelled' || action.isFinalized !== false);

        // Calculate Window
        const windowStart = new Date(currentWindowStart);
        let windowEnd;

        // Determine Status & Next Start
        let status = 'FUTURE';

        if (isCompleted) {
            if (action.type === 'cancelled') {
                status = 'CANCELLED';
            } else {
                status = action.type === 'pass' ? 'PASSED' : 'COMPLETED';
            }
            let actionTime = (action.type === 'cancelled' && action.cancelledAt) ? action.cancelledAt : (action.createdAt || action.from);
            if (!actionTime) actionTime = windowStart;

            // Safe Date Conversion
            const pTime = actionTime?.toDate ? actionTime.toDate() : new Date(actionTime);
            windowEnd = pTime instanceof Date && !isNaN(pTime) ? pTime : new Date();

            lastCompletionTime = windowEnd;
            currentWindowStart = startAnchor(windowEnd);
        } else {
            // Not completed. Check if this is the ACTIVE window or GRACE PERIOD
            const now = new Date();
            const projectedLimit = new Date(windowStart.getTime() + PICK_DURATION_MS);

            // ADJUST START: If someone finished early, this person's PHYSICAL window started then
            const realStart = lastCompletionTime || windowStart;

            if (now > projectedLimit && windowStart < now) {
                // Past / Timed Out
                status = 'SKIPPED';
                windowEnd = projectedLimit;
                lastCompletionTime = projectedLimit;
                currentWindowStart = startAnchor(projectedLimit);
            } else if (!hasFoundActive) {
                // This is the first person who isn't done.
                hasFoundActive = true;
                const isFirst = (i === 0);

                // CRITICAL STATUS LOGIC:
                // Now strictly follows the SNAP for the status, but display uses realStart
                status = (isFirst || now >= windowStart) ? 'ACTIVE' : 'GRACE_PERIOD';

                returnStart = realStart; // Display from actual start
                windowEnd = projectedLimit;
                currentWindowStart = startAnchor(projectedLimit);
            } else {
                // Future
                status = 'FUTURE';
                windowEnd = projectedLimit;
                currentWindowStart = startAnchor(projectedLimit);
            }
        }

        schedule.push({
            name,
            round: i < shareholders.length ? 1 : 2,
            start: returnStart || windowStart,
            end: windowEnd,
            officialStart: windowStart,
            status,
            isCompleted,
            booking: action || null
        });
    }

    return schedule;
}
