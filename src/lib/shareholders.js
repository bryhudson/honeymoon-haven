
export const SHAREHOLDERS_2025 = [
    "Mike & Janelle",
    "Brian & Sam",
    "Brian & Monique",
    "Julia, Mandy & Bryan",
    "Jeff & Lori",
    "David & Gayla",
    "Barb",
    "Steve & Kate",
    "Ernest & Sandy",
    "Gerry & Georgina",
    "Saurabh & Jessica",
    "Dom & Melanie"
];

export function getShareholderOrder(year) {
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
    { cabin: "1", name: "Gerry & Georgina", email: "gerrygeorgie@gmail.com" },
    { cabin: "2", name: "Mike & Janelle", email: "janellestaite@gmail.com" },
    { cabin: "3", name: "Brian & Monique", email: "moniquerwebster@gmail.com" },
    { cabin: "4", name: "Brian & Sam", email: "samantha.lange1978@gmail.com" },
    { cabin: "5", name: "Ernest & Sandy", email: "ernest@malahatvaluationgroup.com" },
    { cabin: "6", name: "Barb", email: "myakristy@gmail.com" },
    { cabin: "7", name: "Jeff & Lori", email: "loriball@live.ca" },
    { cabin: "8", name: "Julia, Mandy & Bryan", email: "aftertuesday@gmail.com" },
    { cabin: "9", name: "David & Gayla", email: "dpanders@gmail.com" },
    { cabin: "10", name: "Saurabh & Jessica", email: "jessica.suryavanshi@gmail.com" },
    { cabin: "11", name: "Dom & Melanie", email: "melanie.oneill@hotmail.com" },
    { cabin: "12", name: "Steve & Kate", email: "stevemiller@hotmail.ca" }
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
    const tenAM = new Date(date);
    tenAM.setHours(10, 0, 0, 0);

    // If we finished at or before 10:00:00 AM, start at 10 AM today
    if (date.getTime() <= tenAM.getTime()) {
        return tenAM;
    } else {
        // Start at 10 AM tomorrow
        const nextDay = new Date(tenAM);
        nextDay.setDate(nextDay.getDate() + 1);
        return nextDay;
    }
}

export function calculateDraftSchedule(shareholders, bookings = [], now = new Date(), startDateOverride = null) {
    const DRAFT_START = startDateOverride ? new Date(startDateOverride) : DRAFT_CONFIG.START_DATE;
    const PICK_DURATION_MS = DRAFT_CONFIG.PICK_DURATION_DAYS * 24 * 60 * 60 * 1000;

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
    // If DRAFT_START is set to "Jan 20, 9:00 AM", it effectively means the first 10am slot is Jan 20, 10:00 AM.
    // If DRAFT_START is set to "Jan 20, 11:00 AM", it effectively means the first 10am slot is Jan 21, 10:00 AM.
    // This assumes the admin's 'Start Date' is just a trigger, and the clock respects the 10am rule.
    let currentWindowStart = getOfficialStart(DRAFT_START);

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
                    currentWindowStart = getOfficialStart(pTime);
                }
            } else {
                // Booking exists but is NOT finalized (Draft Mode).
                const windowLimit = new Date(currentWindowStart.getTime() + PICK_DURATION_MS);

                if (now > windowLimit) {
                    // TIMEOUT implies Finalization and move to next 10 AM
                    currentWindowStart = getOfficialStart(windowLimit);
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
                currentWindowStart = getOfficialStart(windowLimit);
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

    return {
        phase,
        activePicker,
        nextPicker,
        windowEnds: activeWindowEnd,
        draftStart: DRAFT_START,
        isGracePeriod,
        isSeasonStart,
        officialStart: currentWindowStart,
        debugPhase: phase // Helper for debugging
    };
}

export function adjustForCourtesy(date) {
    return getOfficialStart(date);
}

export function mapOrderToSchedule(shareholders, bookings = [], startDateOverride = null) {
    const DRAFT_START = startDateOverride ? new Date(startDateOverride) : DRAFT_CONFIG.START_DATE;
    const PICK_DURATION_MS = DRAFT_CONFIG.PICK_DURATION_DAYS * 24 * 60 * 60 * 1000;

    const fullTurnOrder = [...shareholders, ...[...shareholders].reverse()];
    const schedule = [];

    // Track user turns
    const userTurnCounts = {};
    shareholders.forEach(s => userTurnCounts[s] = 0);



    // Mirror calculateDraftSchedule logic: Start cursor aligned to Official 10 AM rule
    let currentWindowStart = getOfficialStart(DRAFT_START);
    let hasFoundActive = false;

    for (let i = 0; i < fullTurnOrder.length; i++) {
        const name = fullTurnOrder[i];
        const turnIndex = userTurnCounts[name];
        userTurnCounts[name]++;

        // Find match
        const userActions = bookings
            .filter(b => b.shareholderName === name) // Allow cancelled
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

            currentWindowStart = adjustForCourtesy(windowEnd);
        } else {
            // Not completed. Check if this is the ACTIVE window or GRACE PERIOD
            const now = new Date();
            const projectedLimit = new Date(windowStart.getTime() + PICK_DURATION_MS);
            if (now > projectedLimit && windowStart < now) {
                // Past / Timed Out
                status = 'SKIPPED';
                windowEnd = projectedLimit;
                currentWindowStart = getOfficialStart(projectedLimit);
            } else if (!hasFoundActive) {
                // This is the first person who isn't done.
                hasFoundActive = true;
                const isFirst = (i === 0);
                // If first person, force ACTIVE (Early Access), otherwise check grace period
                status = (isFirst || now >= windowStart) ? 'ACTIVE' : 'GRACE_PERIOD';
                windowEnd = projectedLimit;
                currentWindowStart = getOfficialStart(projectedLimit);
            } else {
                // Future
                status = 'FUTURE';
                windowEnd = projectedLimit;
                currentWindowStart = getOfficialStart(projectedLimit);
            }
        }

        schedule.push({
            name,
            round: i < shareholders.length ? 1 : 2,
            start: windowStart,
            end: windowEnd,
            status,
            isCompleted,
            booking: action || null // Expose full booking object (includes id, isPaid, etc.)
        });
    }

    return schedule;
}
