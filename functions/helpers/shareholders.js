const SHAREHOLDERS_2025 = [
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

function getShareholderOrder(year) {
    // TESTING OVERRIDE: For 2026, start with Julia, Mandy & Bryan
    if (year === 2026) {
        return [
            "Julia, Mandy & Bryan",
            "Jeff & Lori",
            "David & Gayla",
            "Barb",
            "Steve & Kate",
            "Ernest & Sandy",
            "Gerry & Georgina",
            "Saurabh & Jessica",
            "Dom & Melanie",
            "Mike & Janelle",
            "Brian & Sam",
            "Brian & Monique"
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

const DRAFT_CONFIG = {
    // Current Production Start: March 1, 2026.
    START_DATE: new Date(2026, 2, 1, 0, 0, 0),
    PICK_DURATION_DAYS: 2,
    SEASON_START: new Date(2026, 3, 3), // April 3
    SEASON_END: new Date(2026, 9, 12),   // Oct 12
    IS_TEST_MODE: false // System always in production
};

function getOfficialStart(finishTime) {
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

function getPickDurationMS(fastTestingMode) {
    return fastTestingMode
        ? (10 * 60 * 1000) // Fast mode: 10 minutes
        : (DRAFT_CONFIG.PICK_DURATION_DAYS * 24 * 60 * 60 * 1000); // Normal: 48 hours
}

function calculateDraftSchedule(bookings, draftStartDateOverride = null, bypassTenAM = false, fastTestingMode = false) {
    const now = new Date();
    const DRAFT_START = draftStartDateOverride ? new Date(draftStartDateOverride) : DRAFT_CONFIG.START_DATE;
    const year = DRAFT_START.getFullYear();
    const shareholders = getShareholderOrder(year);
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

    // Preliminary check: Pre-draft
    if (now < DRAFT_START && bookings.length === 0) {
        return {
            phase: 'PRE_DRAFT',
            activePicker: null,
            nextPicker: fullTurnOrder[0],
            windowStarts: null,
            windowEnds: null,
            round: 1
        };
    }

    for (let i = 0; i < fullTurnOrder.length; i++) {
        const shareholderName = fullTurnOrder[i];

        // Determine which booking index we are looking for (0 for 1st choice, 1 for 2nd)
        const bookingIndex = userTurnCounts[shareholderName];
        userTurnCounts[shareholderName]++; // Increment for next time we see them

        // Find if they have a booking/pass for this slot
        const userActions = bookings
            .filter(b => b.shareholderName === shareholderName) // Allow cancelled to be seen
            .sort((a, b) => a.createdAt - b.createdAt); // Assumption: bookings have 'createdAt' (JS Date or Timestamp)

        const action = userActions[bookingIndex];

        // Helper to get Date object from Firestore Timestamp or JS Date
        const getDate = (d) => d && d.toDate ? d.toDate() : (d ? new Date(d) : null);

        if (action) {
            // Check if this action completes the turn (Pass, Finalized Booking, or Cancelled)
            const isCompleted = action.type === 'pass' || action.type === 'cancelled' || action.isFinalized !== false;

            if (isCompleted) {
                // Turn is done. Next window starts at official 10 AM anchor.
                let actionTime = (action.type === 'cancelled' && action.cancelledAt) ? getDate(action.cancelledAt) : (getDate(action.createdAt) || getDate(action.from));
                if (!actionTime) actionTime = currentWindowStart;

                if (!isNaN(actionTime.getTime())) {
                    currentWindowStart = startAnchor(actionTime);
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
                isGracePeriod = isSeasonStart ? false : (now < currentWindowStart);
                phase = (i < round1Order.length) ? 'ROUND_1' : 'ROUND_2';
                break;
            }
        }
    }

    // If loop finishes without activePicker, draft is done OR Pre-Draft
    if (!activePicker && now >= DRAFT_START) {
        phase = 'OPEN_SEASON';
    } else if (now < DRAFT_START && bookings.length === 0 && !activePicker) {
        phase = 'PRE_DRAFT';
    }

    const currentRound = phase === 'ROUND_1' ? 1 : phase === 'ROUND_2' ? 2 : (phase === 'OPEN_SEASON' ? 3 : 1);

    return {
        activePicker,
        nextPicker,
        windowStarts: currentWindowStart,
        windowEnds: activeWindowEnd,
        round: currentRound,
        phase
    };
}

module.exports = {
    SHAREHOLDERS_2025,
    getShareholderOrder,
    calculateDraftSchedule
};
