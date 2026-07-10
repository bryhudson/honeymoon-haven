// Shared "today" logic + styling token for the season calendars (admin +
// shareholder). "Today" is always resolved in Pacific time so the highlighted
// cell matches the app's core America/Los_Angeles rule, regardless of the
// viewer's device timezone. All functions accept an injectable `now` so the
// date logic is deterministically testable.

/** Year / month (1-12) / day of the given instant in Pacific time. */
export function getPacificDateParts(now: Date = new Date()): { year: number; month: number; day: number } {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(now);
    const get = (type: string) => parseInt(parts.find(p => p.type === type)!.value, 10);
    return { year: get('year'), month: get('month'), day: get('day') };
}

/**
 * Local-midnight Date for the current Pacific calendar day. Comparable against
 * the local-midnight day Dates the calendars build via eachDayOfInterval, so it
 * can drive BOTH the "today" highlight and the "past day" fade from one source
 * (a cell can never render as both today and past).
 */
export function getPacificToday(now: Date = new Date()): Date {
    const { year, month, day } = getPacificDateParts(now);
    return new Date(year, month - 1, day);
}

/** True if `day` (any time-of-day) falls on the current Pacific calendar day. */
export function isTodayPacific(day: Date, now: Date = new Date()): boolean {
    const today = getPacificToday(now);
    const d = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    return d.getTime() === today.getTime();
}

/**
 * Tailwind classes that mark the "today" cell in both calendars. A blue outline
 * ring reads as today over any cell fill (booking, turnover, holiday, or empty)
 * because blue is unused by every other cell state. Kept here so both calendar
 * components stay pixel-identical.
 */
export const TODAY_CELL_RING = 'ring-2 ring-blue-600 ring-offset-1 ring-offset-white z-10 font-extrabold';
