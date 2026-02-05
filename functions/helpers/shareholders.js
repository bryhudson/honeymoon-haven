
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

const DRAFT_CONFIG = {
    START_DATE: new Date(2026, 2, 1, 0, 0, 0),
    PICK_DURATION_DAYS: 2,
    SEASON_START: new Date(2026, 3, 3),
    SEASON_END: new Date(2026, 9, 12),
    IS_TEST_MODE: false
};

function getOfficialStart(finishTime) {
    if (!finishTime) return null;
    const date = new Date(finishTime);

    const hourPT = parseInt(new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        hour: 'numeric',
        hour12: false
    }).format(date));

    const isBeforeTen = (hourPT < 10);
    return getTargetPstTime(date, 10, isBeforeTen ? 0 : 1);
}

function getTargetPstTime(baseDate, targetHour, daysOffset = 0) {
    const adjustedDate = new Date(baseDate);
    adjustedDate.setDate(adjustedDate.getDate() + daysOffset);

    const ptParts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        year: 'numeric', month: 'numeric', day: 'numeric'
    }).formatToParts(adjustedDate);

    const year = parseInt(ptParts.find(p => p.type === 'year').value);
    const month = parseInt(ptParts.find(p => p.type === 'month').value);
    const day = parseInt(ptParts.find(p => p.type === 'day').value);

    const guess = new Date(Date.UTC(year, month - 1, day, targetHour + 8, 0, 0, 0));

    const checkParts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        hour: 'numeric', hour12: false
    }).formatToParts(guess);
    const actualHour = parseInt(checkParts.find(p => p.type === 'hour').value);

    if (actualHour !== targetHour) {
        guess.setUTCHours(guess.getUTCHours() + (targetHour - actualHour));
    }
    return guess;
}

function getPickDurationMS() {
    return DRAFT_CONFIG.PICK_DURATION_DAYS * 24 * 60 * 60 * 1000;
}

function calculateDraftSchedule(shareholders, bookings = [], now = new Date(), startDateOverride = null, bypassTenAM = false) {
    const DRAFT_START = startDateOverride ? new Date(startDateOverride) : DRAFT_CONFIG.START_DATE;
    const PICK_DURATION_MS = getPickDurationMS();

    const round1Order = [...shareholders];
    const round2Order = [...shareholders].reverse();
    const fullTurnOrder = [...round1Order, ...round2Order];

    // RULE: bypassTenAM is now ignored for the startAnchor to enforce the 10 AM snap for deadlines.
    const startAnchor = (time) => getOfficialStart(time);
    let currentWindowStart = startAnchor(DRAFT_START);

    let activePicker = null;
    let nextPicker = null;
    let activeWindowEnd = null;
    let phase = 'PRE_DRAFT';
    let isGracePeriod = false;
    let isSeasonStart = false;

    const userTurnCounts = {};
    shareholders.forEach(s => userTurnCounts[s] = 0);

    for (let i = 0; i < fullTurnOrder.length; i++) {
        const shareholderName = fullTurnOrder[i];
        const bookingIndex = userTurnCounts[shareholderName];
        userTurnCounts[shareholderName]++;

        const userActions = bookings
            .filter(b => b.shareholderName === shareholderName)
            .sort((a, b) => a.createdAt - b.createdAt);

        const action = userActions[bookingIndex];

        if (action) {
            const isCompleted = action.type === 'pass' || action.type === 'cancelled' || action.isFinalized !== false;
            if (isCompleted) {
                let actionTime = (action.type === 'cancelled' && action.cancelledAt) ? action.cancelledAt : (action.createdAt || action.from);
                if (!actionTime) actionTime = currentWindowStart;
                let pTime = actionTime?.toDate ? actionTime.toDate() : new Date(actionTime);
                if (!isNaN(pTime.getTime())) {
                    currentWindowStart = startAnchor(pTime);
                }
            } else {
                const windowLimit = new Date(currentWindowStart.getTime() + PICK_DURATION_MS);
                if (now > windowLimit) {
                    currentWindowStart = startAnchor(windowLimit);
                } else {
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
            const windowLimit = new Date(currentWindowStart.getTime() + PICK_DURATION_MS);
            if (now > windowLimit) {
                currentWindowStart = startAnchor(windowLimit);
            } else {
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
        windowStarts: currentWindowStart,
        officialStart: currentWindowStart,
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
