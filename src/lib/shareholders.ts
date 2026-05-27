export type Shareholder = string;

export interface Booking {
    id: string;
    shareholderName: string;
    from: any; // Firestore Timestamp or Date
    to: any;   // Firestore Timestamp or Date
    createdAt: any;
    type?: 'pass' | 'auto-pass' | 'cancelled';
    cancelledAt?: any;
    isFinalized?: boolean;
    cabinNumber?: string | number;
}

export interface DraftConfig {
    START_DATE: Date;
    PICK_DURATION_DAYS: number;
    SEASON_START: Date;
    SEASON_END: Date;
    IS_TEST_MODE: boolean;
}

export type DraftPhase = 'PRE_DRAFT' | 'ROUND_1' | 'ROUND_2' | 'OPEN_SEASON';

export interface DraftStatus {
    phase: DraftPhase;
    activePicker: Shareholder | null;
    nextPicker: Shareholder | null;
    windowEnds: Date | null;
    draftStart: Date;
    isGracePeriod: boolean;
    isSeasonStart: boolean;
    windowStarts: Date;
    officialStart: Date;
    debugPhase: string;
    round: number;
    schedule?: ScheduleItem[];
}

const NAME_MAP: Record<string, string> = {
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

export function normalizeName(name: string | null | undefined): string {
    if (!name) return "";
    let n = name.toString().trim();
    if (NAME_MAP[n]) n = NAME_MAP[n];
    return n.toLowerCase()
        .replace(/&/g, "and")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Format a name for display: Convert & to 'and' but preserve casing.
 */
export function formatNameForDisplay(name: string | null | undefined): string {
    if (!name) return "";
    let n = name.toString()
        .replace(/&/g, "and")
        .replace(/\s+/g, " ")
        .trim();
    if (NAME_MAP[n]) n = NAME_MAP[n];
    return n;
}

export const SHAREHOLDERS_2025: Shareholder[] = [
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

export function getShareholderOrder(year: number): Shareholder[] {
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

    if (diff <= 0) return SHAREHOLDERS_2025;

    const rotation = diff % SHAREHOLDERS_2025.length;

    return [
        ...SHAREHOLDERS_2025.slice(rotation),
        ...SHAREHOLDERS_2025.slice(0, rotation)
    ];
}

// DEPRECATED: Use Firestore 'shareholders' collection instead.
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
export const DRAFT_CONFIG: DraftConfig = {
    START_DATE: new Date(2026, 3, 1, 0, 0, 0), // April 1 (draft opens)
    PICK_DURATION_DAYS: 2,
    SEASON_START: new Date(2026, 4, 1),  // May 1 (bookable)
    SEASON_END: new Date(2026, 8, 30),   // Sept 30 (bookable)
    IS_TEST_MODE: false
};

export type SeasonState = 'OPEN' | 'CLOSED' | 'OFF_SEASON';

/**
 * Booking closes for the season on the 3rd Monday of September.
 * Computed per year so it auto-rolls (e.g. Sep 21 in 2026, Sep 20 in 2027).
 */
export function getBookingCloseDate(year: number): Date {
    const sept1 = new Date(year, 8, 1);
    const firstMonday = 1 + ((8 - sept1.getDay()) % 7); // day-of-month of the first Monday
    return new Date(year, 8, firstMonday + 14);          // + 2 weeks = 3rd Monday
}

/**
 * Shareholder booking lifecycle for the configured season:
 *   OPEN        - before the September cutoff; booking allowed
 *   CLOSED      - from the cutoff through the season's last bookable day; no new bookings
 *   OFF_SEASON  - after the season ends; the next season has not opened yet
 */
export function getSeasonState(now: Date = new Date()): SeasonState {
    // Year-aware: getCurrentSeasonYear rolls forward on Oct 1, so "after Sep 30"
    // naturally becomes the next season's pre-draft (OFF_SEASON) below.
    const cfg = getSeasonConfig(getCurrentSeasonYear(now));
    const t = now.getTime();
    if (t < cfg.START_DATE.getTime()) return 'OFF_SEASON'; // before the draft opens (Oct prev year through Mar)
    if (t < cfg.BOOKING_CLOSE.getTime()) return 'OPEN';    // Apr 1 through the 3rd-Monday cutoff
    return 'CLOSED';                                        // cutoff through Sep 30
}

/**
 * The season year currently in focus. Oct-Dec roll forward to the upcoming
 * season (the off-season points at next year); Jan-Sep map to that year.
 */
export function getCurrentSeasonYear(now: Date = new Date()): number {
    return now.getMonth() >= 9 ? now.getFullYear() + 1 : now.getFullYear();
}

export interface SeasonConfig {
    START_DATE: Date;    // draft opens (April 1)
    SEASON_START: Date;  // first bookable night (May 1)
    SEASON_END: Date;    // last bookable night (Sept 30)
    BOOKING_CLOSE: Date; // booking closes (3rd Monday of September)
}

/** All season anchors derived from a season year (the basis for auto-rollover). */
export function getSeasonConfig(year: number): SeasonConfig {
    return {
        START_DATE: new Date(year, 3, 1),
        SEASON_START: new Date(year, 4, 1),
        SEASON_END: new Date(year, 8, 30),
        BOOKING_CLOSE: getBookingCloseDate(year),
    };
}

/** The bookable months (May-September, the 1st of each) for a season year. */
export function getSeasonMonths(year: number): Date[] {
    return [4, 5, 6, 7, 8].map(m => new Date(year, m, 1));
}

/**
 * Scope bookings to a single season. Bookings carry no explicit season field,
 * but every record (real booking, pass, auto-pass, cancellation) has a `from`
 * date that falls within its season's calendar year. Filtering on that year
 * cleanly separates the active season from prior seasons (which become history)
 * with no data migration. Malformed records without a valid `from` are dropped.
 */
export function filterBookingsToSeason(bookings: Booking[], seasonYear: number): Booking[] {
    return bookings.filter(b => {
        // Prefer `from` (the booked night / pass moment); fall back to `createdAt`
        // for records that lack a `from`. Both land in the season's calendar year.
        const raw = b.from ?? b.createdAt;
        const d = raw instanceof Date ? raw : (raw?.toDate ? raw.toDate() : (raw ? new Date(raw) : null));
        return d != null && !isNaN(d.getTime()) && d.getFullYear() === seasonYear;
    });
}

/**
 * STRICT RULE: Every turn officially starts at 10:00 AM.
 */
export function getOfficialStart(finishTime: Date | any): Date | null {
    if (!finishTime) return null;
    const date = finishTime.toDate ? finishTime.toDate() : new Date(finishTime);

    const ptParts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false
    }).formatToParts(date);

    const hour = parseInt(ptParts.find(p => p.type === 'hour')!.value);
    const minute = parseInt(ptParts.find(p => p.type === 'minute')!.value);
    const second = parseInt(ptParts.find(p => p.type === 'second')!.value);

    const isPastTen = (hour > 10) || (hour === 10 && (minute > 0 || second > 0));

    return getTargetPstTime(date, 10, isPastTen ? 1 : 0);
}

function getTargetPstTime(baseDate: Date, targetHour: number, daysOffset: number = 0): Date {
    const adjustedDate = new Date(baseDate);
    adjustedDate.setDate(adjustedDate.getDate() + daysOffset);

    const ptParts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        year: 'numeric', month: 'numeric', day: 'numeric'
    }).formatToParts(adjustedDate);

    const year = parseInt(ptParts.find(p => p.type === 'year')!.value);
    const month = parseInt(ptParts.find(p => p.type === 'month')!.value);
    const day = parseInt(ptParts.find(p => p.type === 'day')!.value);

    const guess = new Date(Date.UTC(year, month - 1, day, targetHour + 8, 0, 0, 0));

    const checkParts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        hour: 'numeric', hour12: false
    }).formatToParts(guess);
    const actualHour = parseInt(checkParts.find(p => p.type === 'hour')!.value);

    if (actualHour !== targetHour) {
        guess.setUTCHours(guess.getUTCHours() + (targetHour - actualHour));
    }

    return guess;
}

export function getPickDurationMS(): number {
    return DRAFT_CONFIG.PICK_DURATION_DAYS * 24 * 60 * 60 * 1000;
}

export function calculateDraftSchedule(
    shareholders: Shareholder[],
    bookings: Booking[] = [],
    now: Date = new Date(),
    startDateOverride: Date | null = null,
    bypassTenAM: boolean = false
): DraftStatus {
    // Year-aware: the active season is the override's year (dev wipe/reset) or
    // the current season year. Scope bookings to it so prior seasons don't leak
    // into a fresh draft, and anchor the draft start on that season's April 1.
    const seasonYear = startDateOverride ? new Date(startDateOverride).getFullYear() : getCurrentSeasonYear(now);
    const DRAFT_START = startDateOverride ? new Date(startDateOverride) : getSeasonConfig(seasonYear).START_DATE;
    const seasonBookings = filterBookingsToSeason(bookings, seasonYear);

    const schedule = mapOrderToSchedule(shareholders, seasonBookings, DRAFT_START, bypassTenAM);
    const PICK_DURATION_MS = getPickDurationMS();

    const round1Order = [...shareholders];
    const round2Order = [...shareholders].reverse();
    const fullTurnOrder = [...round1Order, ...round2Order];

    const startAnchor = (time: Date) => getOfficialStart(time)!;
    let currentWindowStart = startAnchor(DRAFT_START);

    let activePicker: Shareholder | null = null;
    let nextPicker: Shareholder | null = null;
    let activeWindowEnd: Date | null = null;
    let phase: DraftPhase = 'PRE_DRAFT';
    let isGracePeriod = false;
    let isSeasonStart = false;

    const userTurnCounts: Record<string, number> = {};
    shareholders.forEach(s => userTurnCounts[s] = 0);

    for (let i = 0; i < fullTurnOrder.length; i++) {
        const shareholderName = fullTurnOrder[i];
        const bookingIndex = userTurnCounts[shareholderName];
        userTurnCounts[shareholderName]++;

        const userActions = seasonBookings
            .filter(b => normalizeName(b.shareholderName) === normalizeName(shareholderName))
            .filter(b => b.isFinalized || ['pass', 'skipped', 'cancelled'].includes(b.type || (b as any).status)) // IGNORE DRAFTS
            .sort((a, b) => {
                const aRaw = a.createdAt instanceof Date ? a.createdAt : (a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0));
                const bRaw = b.createdAt instanceof Date ? b.createdAt : (b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0));
                const aTime = isNaN(aRaw.getTime()) ? 0 : aRaw.getTime();
                const bTime = isNaN(bRaw.getTime()) ? 0 : bRaw.getTime();
                return aTime - bTime;
            });

        const action = userActions[bookingIndex];

        if (action) {
            if ((action as any).adminBackfilled) {
                // Admin manually filled a previously skipped slot. Don't let this
                // retroactively shift rotation timing; advance as if still SKIPPED.
                const windowLimit = new Date(currentWindowStart.getTime() + PICK_DURATION_MS);
                currentWindowStart = startAnchor(windowLimit);
            } else {
                let actionTime = (action.type === 'cancelled' && action.cancelledAt) ? action.cancelledAt : (action.createdAt || action.from);
                if (!actionTime) actionTime = currentWindowStart;

                let pTime = actionTime instanceof Date ? actionTime : (actionTime?.toDate ? actionTime.toDate() : new Date(actionTime || 0));

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
        debugPhase: phase,
        round: currentRound,
        schedule
    };
}

export interface ScheduleItem {
    name: Shareholder;
    round: number;
    start: Date;
    end: Date;
    officialStart: Date;
    status: 'FUTURE' | 'CANCELLED' | 'PASSED' | 'COMPLETED' | 'SKIPPED' | 'ACTIVE' | 'GRACE_PERIOD';
    isCompleted: boolean;
    booking: Booking | null;
}

export function mapOrderToSchedule(
    shareholders: Shareholder[],
    bookings: Booking[] = [],
    startDateOverride: Date | null = null,
    bypassTenAM: boolean = false
): ScheduleItem[] {
    // Year-aware (mirrors calculateDraftSchedule): scope bookings to the active
    // season and anchor the start on that season's April 1, so the rendered
    // schedule rolls over each year and ignores prior seasons.
    const seasonYear = startDateOverride ? new Date(startDateOverride).getFullYear() : getCurrentSeasonYear();
    const DRAFT_START = startDateOverride ? new Date(startDateOverride) : getSeasonConfig(seasonYear).START_DATE;
    const seasonBookings = filterBookingsToSeason(bookings, seasonYear);
    const PICK_DURATION_MS = getPickDurationMS();

    const fullTurnOrder = [...shareholders, ...[...shareholders].reverse()];
    const schedule: ScheduleItem[] = [];

    const userTurnCounts: Record<string, number> = {};
    shareholders.forEach(s => userTurnCounts[s] = 0);

    const startAnchor = (time: Date) => getOfficialStart(time)!;

    let currentWindowStart = startAnchor(DRAFT_START);
    let hasFoundActive = false;
    let lastCompletionTime: Date | null = null;

    for (let i = 0; i < fullTurnOrder.length; i++) {
        const name = fullTurnOrder[i];
        const turnIndex = userTurnCounts[name];
        userTurnCounts[name]++;
        let returnStart: Date | null = null;

        const userActions = seasonBookings
            .filter(b => normalizeName(b.shareholderName) === normalizeName(name))
            .sort((a, b) => {
                const aTime = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
                const bTime = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
                return aTime.getTime() - bTime.getTime();
            });

        const action = userActions[turnIndex];
        const isCompleted = action && (action.type === 'pass' || action.type === 'cancelled' || action.isFinalized !== false);

        const windowStart = new Date(currentWindowStart);
        let windowEnd: Date;
        let status: ScheduleItem['status'] = 'FUTURE';

        if (isCompleted) {
            if (action.type === 'cancelled') {
                status = 'CANCELLED';
            } else {
                status = action.type === 'pass' ? 'PASSED' : 'COMPLETED';
            }

            if ((action as any).adminBackfilled) {
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
