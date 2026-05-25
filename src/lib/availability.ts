import { startOfDay } from 'date-fns';

// Bookings are stored as a date range [from, to] where `from` is the check-in
// day and `to` is the check-out day. A stay occupies *nights*, so the range is
// treated as half-open [from, to): the check-out day is NOT occupied and stays
// available as the next shareholder's check-in day.

/** True if two stays share at least one night. The check-out day of one stay
 *  may be the check-in day of another without conflicting. */
export function nightsOverlap(aFrom: Date, aTo: Date, bFrom: Date, bTo: Date): boolean {
    const aStart = startOfDay(aFrom).getTime();
    const aEnd = startOfDay(aTo).getTime();
    const bStart = startOfDay(bFrom).getTime();
    const bEnd = startOfDay(bTo).getTime();
    return aStart < bEnd && bStart < aEnd;
}

/** True if `day` falls on an occupied night of the stay [from, to). The
 *  check-out day (`to`) is excluded, so it is left selectable in the calendar. */
export function isNightBooked(day: Date, from: Date, to: Date): boolean {
    const d = startOfDay(day).getTime();
    return d >= startOfDay(from).getTime() && d < startOfDay(to).getTime();
}

interface BookingLike {
    type?: string;
    from?: Date | { toDate(): Date } | string | null;
    to?: Date | { toDate(): Date } | string | null;
    [key: string]: unknown;
}

export interface DayOccupancy {
    /** Booking whose night this is (from <= day < to), or null. */
    occupant: BookingLike | null;
    /** Booking that checks out this morning (to === day), or null. */
    departing: BookingLike | null;
}

const NON_OCCUPYING_TYPES = new Set(['pass', 'auto-pass', 'cancelled']);

function coerceDate(value: BookingLike['from']): Date | null {
    if (!value) return null;
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
    if (typeof value === 'object' && typeof value.toDate === 'function') return value.toDate();
    const d = new Date(value as string);
    return isNaN(d.getTime()) ? null : d;
}

/** Resolve who occupies a calendar day's night and who checks out that morning.
 *  When both are present the day is a "turnover": one stay ends as the next begins. */
export function getDayOccupancy(day: Date, bookings: BookingLike[]): DayOccupancy {
    const d = startOfDay(day).getTime();
    let occupant: BookingLike | null = null;
    let departing: BookingLike | null = null;

    for (const b of Array.isArray(bookings) ? bookings : []) {
        if (!b || (b.type && NON_OCCUPYING_TYPES.has(b.type))) continue;
        const from = coerceDate(b.from);
        const to = coerceDate(b.to);
        if (!from || !to) continue;
        const fromT = startOfDay(from).getTime();
        const toT = startOfDay(to).getTime();
        if (d >= fromT && d < toT) occupant = b;
        if (d === toT) departing = b;
    }

    return { occupant, departing };
}
