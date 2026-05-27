
// functions/helpers/shareholders.js
// PORTED FROM src/lib/shareholders.js to ensure Logic Parity
// CommonJS Format for Cloud Functions

const NAME_MAP = {
    "Gerry & Georgina": "Georgina and Jerry",
    "Gerry and Georgina": "Georgina and Jerry",
    "Mike & Janelle": "Janelle and Mike",
    "Mike and Janelle": "Janelle and Mike",
    "Brian & Monique": "Monique and Brian",
    "Brian and Monique": "Monique and Brian",
    "Brian & Sam": "Sam and Brian",
    "Brian and Sam": "Sam and Brian",
    "Ernest & Sandy": "Sandy and Ernest",
    "Ernest and Sandy": "Sandy and Ernest",
    "Jeff & Lori": "Lori and Jeff",
    "Jeff and Lori": "Lori and Jeff",
    "David & Gayla": "Gayla and David",
    "David and Gayla": "Gayla and David",
    "Saurabh & Jessica": "Jessica and Saurabh",
    "Saurabh and Jessica": "Jessica and Saurabh",
    "Dom & Melanie": "Melanie and Dom",
    "Dom and Melanie": "Melanie and Dom",
    "Julia, Mandy & Bryan": "Julia, Mandy and Bryan"
};

function normalizeName(name) {
    if (!name) return "";
    let n = name.toString().trim();
    if (NAME_MAP[n]) n = NAME_MAP[n];
    return n.toLowerCase()
        .replace(/&/g, "and")
        .replace(/\s+/g, " ")
        .trim();
}

function formatNameForDisplay(name) {
    if (!name) return "";
    let n = name.toString()
        .replace(/&/g, "and")
        .replace(/\s+/g, " ")
        .trim();
    if (NAME_MAP[n]) n = NAME_MAP[n];
    return n;
}

const SHAREHOLDERS_2025 = [
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

function getShareholderOrder(year) {
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
    if (diff <= 0) return SHAREHOLDERS_2025;
    const rotation = diff % SHAREHOLDERS_2025.length;
    return [
        ...SHAREHOLDERS_2025.slice(rotation),
        ...SHAREHOLDERS_2025.slice(0, rotation)
    ];
}

const DRAFT_CONFIG = {
    START_DATE: new Date(2026, 3, 1, 0, 0, 0), // April 1 (draft opens)
    PICK_DURATION_DAYS: 2,
    SEASON_START: new Date(2026, 4, 1),
    SEASON_END: new Date(2026, 8, 30),
    IS_TEST_MODE: false
};

function getOfficialStart(finishTime) {
    if (!finishTime) return null;
    const date = finishTime && finishTime.toDate ? finishTime.toDate() : new Date(finishTime);

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

// Booking closes for the season on the 3rd Monday of September. Mirrors client.
function getBookingCloseDate(year) {
    const sept1 = new Date(year, 8, 1);
    const firstMonday = 1 + ((8 - sept1.getDay()) % 7);
    return new Date(year, 8, firstMonday + 14);
}

// The season year currently in focus: Oct-Dec roll forward to the upcoming season.
function getCurrentSeasonYear(now = new Date()) {
    return now.getMonth() >= 9 ? now.getFullYear() + 1 : now.getFullYear();
}

// All season anchors derived from a season year (the basis for auto-rollover).
function getSeasonConfig(year) {
    return {
        START_DATE: new Date(year, 3, 1),
        SEASON_START: new Date(year, 4, 1),
        SEASON_END: new Date(year, 8, 30),
        BOOKING_CLOSE: getBookingCloseDate(year),
    };
}

// Shareholder booking lifecycle (mirrors client getSeasonState):
//   OFF_SEASON  - before the draft opens (Oct of the prior year through March)
//   OPEN        - April 1 through the September cutoff
//   CLOSED      - cutoff through the season's last day (Sept 30)
function getSeasonState(now = new Date()) {
    const cfg = getSeasonConfig(getCurrentSeasonYear(now));
    const t = now.getTime();
    if (t < cfg.START_DATE.getTime()) return 'OFF_SEASON';
    if (t < cfg.BOOKING_CLOSE.getTime()) return 'OPEN';
    return 'CLOSED';
}

// Off-season hibernation: decide what the weekly backup cron should do on a run.
//   'weekly'      - in-season (OPEN/CLOSED): take the regular weekly snapshot
//   'season_end'  - first off-season run: take one season-end snapshot
//   'skip'        - off-season and the season-end snapshot already exists
// `seasonEndExists` is supplied by the caller (a Firestore existence check) so
// this stays pure and unit-testable.
function decideWeeklyBackup(now, seasonEndExists) {
    if (getSeasonState(now) !== 'OFF_SEASON') return 'weekly';
    return seasonEndExists ? 'skip' : 'season_end';
}

// Scope bookings to a single season by their `from` (or `createdAt`) calendar year.
function filterBookingsToSeason(bookings, seasonYear) {
    return bookings.filter(b => {
        const raw = (b.from != null ? b.from : b.createdAt);
        const d = raw instanceof Date ? raw : (raw && raw.toDate ? raw.toDate() : (raw ? new Date(raw) : null));
        return d != null && !isNaN(d.getTime()) && d.getFullYear() === seasonYear;
    });
}

function calculateDraftSchedule(shareholders, bookings = [], now = new Date(), startDateOverride = null, bypassTenAM = false) {
    // Year-aware: scope bookings to the active season and anchor the draft start
    // on that season's April 1 so a fresh season drafts clean. Mirrors client.
    const seasonYear = startDateOverride ? new Date(startDateOverride).getFullYear() : getCurrentSeasonYear(now);
    const DRAFT_START = startDateOverride ? new Date(startDateOverride) : getSeasonConfig(seasonYear).START_DATE;
    const seasonBookings = filterBookingsToSeason(bookings, seasonYear);
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

        const userActions = seasonBookings
            .filter(b => normalizeName(b.shareholderName) === normalizeName(shareholderName))
            .filter(b => b.isFinalized || ['pass', 'skipped', 'cancelled'].includes(b.type || b.status))
            .sort((a, b) => {
                const aRaw = a.createdAt instanceof Date ? a.createdAt : (a.createdAt && a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0));
                const bRaw = b.createdAt instanceof Date ? b.createdAt : (b.createdAt && b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0));
                const aTime = isNaN(aRaw.getTime()) ? 0 : aRaw.getTime();
                const bTime = isNaN(bRaw.getTime()) ? 0 : bRaw.getTime();
                return aTime - bTime;
            });

        const action = userActions[bookingIndex];

        if (action) {
            if (action.adminBackfilled) {
                // Admin manually filled a previously skipped slot. Don't let this
                // retroactively shift rotation timing; advance as if still SKIPPED.
                const windowLimit = new Date(currentWindowStart.getTime() + PICK_DURATION_MS);
                currentWindowStart = startAnchor(windowLimit);
            } else {
                let actionTime = (action.type === 'cancelled' && action.cancelledAt) ? action.cancelledAt : (action.createdAt || action.from);
                if (!actionTime) actionTime = currentWindowStart;
                let pTime = actionTime instanceof Date ? actionTime : (actionTime && actionTime.toDate ? actionTime.toDate() : new Date(actionTime || 0));
                if (!isNaN(pTime.getTime())) {
                    currentWindowStart = startAnchor(pTime);
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
    } else if (now < DRAFT_START && seasonBookings.length === 0 && !activePicker) {
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

function mapOrderToSchedule(shareholders, bookings = [], startDateOverride = null, bypassTenAM = false) {
    // Year-aware (mirrors calculateDraftSchedule): scope bookings to the active
    // season and anchor the start on that season's April 1.
    const seasonYear = startDateOverride ? new Date(startDateOverride).getFullYear() : getCurrentSeasonYear();
    const DRAFT_START = startDateOverride ? new Date(startDateOverride) : getSeasonConfig(seasonYear).START_DATE;
    const seasonBookings = filterBookingsToSeason(bookings, seasonYear);
    const PICK_DURATION_MS = getPickDurationMS();

    const fullTurnOrder = [...shareholders, ...[...shareholders].reverse()];
    const schedule = [];

    const userTurnCounts = {};
    shareholders.forEach(s => userTurnCounts[s] = 0);

    const startAnchor = (time) => getOfficialStart(time);

    let currentWindowStart = startAnchor(DRAFT_START);
    let hasFoundActive = false;
    let lastCompletionTime = null;

    for (let i = 0; i < fullTurnOrder.length; i++) {
        const name = fullTurnOrder[i];
        const turnIndex = userTurnCounts[name];
        userTurnCounts[name]++;
        let returnStart = null;

        const userActions = seasonBookings
            .filter(b => normalizeName(b.shareholderName) === normalizeName(name))
            .sort((a, b) => {
                const aRaw = a.createdAt instanceof Date ? a.createdAt : (a.createdAt && a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0));
                const bRaw = b.createdAt instanceof Date ? b.createdAt : (b.createdAt && b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0));
                const aTime = isNaN(aRaw.getTime()) ? 0 : aRaw.getTime();
                const bTime = isNaN(bRaw.getTime()) ? 0 : bRaw.getTime();
                return aTime - bTime;
            });

        const action = userActions[turnIndex];
        const isCompleted = action && (action.type === 'pass' || action.type === 'cancelled' || action.isFinalized !== false);

        const windowStart = new Date(currentWindowStart);
        let windowEnd;

        let status = 'FUTURE';

        if (isCompleted) {
            if (action.type === 'cancelled') {
                status = 'CANCELLED';
            } else {
                status = action.type === 'pass' ? 'PASSED' : 'COMPLETED';
            }

            if (action.adminBackfilled) {
                // Admin manually filled a previously skipped slot. Don't let this
                // retroactively shift rotation timing; advance as if still SKIPPED.
                const projectedLimit = new Date(windowStart.getTime() + PICK_DURATION_MS);
                windowEnd = projectedLimit;
                lastCompletionTime = projectedLimit;
                currentWindowStart = startAnchor(projectedLimit);
            } else {
                let actionTime = (action.type === 'cancelled' && action.cancelledAt) ? action.cancelledAt : (action.createdAt || action.from);
                if (!actionTime) actionTime = windowStart;
                const pTime = actionTime?.toDate ? actionTime.toDate() : new Date(actionTime);
                windowEnd = pTime instanceof Date && !isNaN(pTime.getTime()) ? pTime : new Date();
                lastCompletionTime = windowEnd;
                currentWindowStart = startAnchor(windowEnd);
            }
        } else {
            const now = new Date();
            const projectedLimit = new Date(windowStart.getTime() + PICK_DURATION_MS);
            const realStart = lastCompletionTime || windowStart;

            if (now > projectedLimit && windowStart < now) {
                status = 'SKIPPED';
                windowEnd = projectedLimit;
                lastCompletionTime = projectedLimit;
                currentWindowStart = startAnchor(projectedLimit);
            } else if (!hasFoundActive) {
                hasFoundActive = true;
                const isFirst = (i === 0);
                status = (isFirst || now >= windowStart) ? 'ACTIVE' : 'GRACE_PERIOD';
                returnStart = realStart;
                windowEnd = projectedLimit;
                currentWindowStart = startAnchor(projectedLimit);
            } else {
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

module.exports = {
    normalizeName,
    formatNameForDisplay,
    SHAREHOLDERS_2025,
    getShareholderOrder,
    getOfficialStart,
    getPickDurationMS,
    getBookingCloseDate,
    getCurrentSeasonYear,
    getSeasonConfig,
    getSeasonState,
    decideWeeklyBackup,
    filterBookingsToSeason,
    calculateDraftSchedule,
    mapOrderToSchedule
};
