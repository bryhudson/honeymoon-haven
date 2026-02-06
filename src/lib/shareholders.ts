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
    START_DATE: new Date(2026, 2, 1, 0, 0, 0),
    PICK_DURATION_DAYS: 2,
    SEASON_START: new Date(2026, 3, 3), // April 3
    SEASON_END: new Date(2026, 9, 12),   // Oct 12
    IS_TEST_MODE: false
};

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
    const DRAFT_START = startDateOverride ? new Date(startDateOverride) : DRAFT_CONFIG.START_DATE;
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

        const userActions = bookings
            .filter(b => normalizeName(b.shareholderName) === normalizeName(shareholderName))
            .sort((a, b) => {
                const aTime = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
                const bTime = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
                return aTime.getTime() - bTime.getTime();
            });

        const action = userActions[bookingIndex];

        if (action) {
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
        debugPhase: phase,
        round: currentRound
    };
}

export function adjustForCourtesy(date: Date): Date | null {
    return getOfficialStart(date);
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
    const DRAFT_START = startDateOverride ? new Date(startDateOverride) : DRAFT_CONFIG.START_DATE;
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

        const userActions = bookings
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
            let actionTime = (action.type === 'cancelled' && action.cancelledAt) ? action.cancelledAt : (action.createdAt || action.from);
            if (!actionTime) actionTime = windowStart;

            const pTime = actionTime?.toDate ? actionTime.toDate() : new Date(actionTime);
            windowEnd = pTime instanceof Date && !isNaN(pTime.getTime()) ? pTime : new Date();

            lastCompletionTime = windowEnd;
            currentWindowStart = startAnchor(windowEnd);
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
