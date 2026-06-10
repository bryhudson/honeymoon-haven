import { filterBookingsToSeason } from './shareholders';

// Derive the list of "open season" bookings from the raw bookings collection
// and the rotation schedule. The rule is "any real booking that isn't already
// represented by a Round 1 / Round 2 schedule slot."
//
// Pass `seasonYear` to scope the input to one season: after the Oct 1 rollover
// the fresh season's schedule contains no booking ids, so without scoping every
// prior-season booking would qualify as "not in a rotation slot" and flood the
// OPEN SEASON list.

export interface OpenSeasonSlot {
    name: string;
    round: 'OPEN';
    status: 'COMPLETED' | 'CANCELLED';
    booking: any;
    start: Date;
    end: Date;
}

// Accepts Date, Firestore Timestamp-like { toDate() }, ISO string, or null/undefined.
// Returns a valid Date or null when the value is missing/unparseable.
function toDate(raw: unknown): Date | null {
    if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;
    if (raw && typeof (raw as any).toDate === 'function') {
        const d = (raw as any).toDate();
        return d instanceof Date && !isNaN(d.getTime()) ? d : null;
    }
    if (raw == null) return null;
    const d = new Date(raw as any);
    return isNaN(d.getTime()) ? null : d;
}

export function deriveOpenSeasonSlots(
    allBookings: any[],
    schedule: any[],
    seasonYear?: number
): OpenSeasonSlot[] {
    const scheduledIds = new Set<string>();
    for (const s of schedule) {
        const id = s?.booking?.id;
        if (id) scheduledIds.add(id);
    }

    const seasonBookings = seasonYear != null
        ? filterBookingsToSeason(allBookings, seasonYear)
        : allBookings;

    const result: OpenSeasonSlot[] = [];
    for (const b of seasonBookings) {
        if (b.type === 'pass' || b.type === 'auto-pass') continue;
        if (b.isFinalized !== true) continue;
        if (b.id != null && scheduledIds.has(b.id)) continue;
        const start = toDate(b.from);
        if (!start) continue;
        const end = toDate(b.to) || start;
        result.push({
            name: b.shareholderName,
            round: 'OPEN',
            status: b.type === 'cancelled' ? 'CANCELLED' : 'COMPLETED',
            booking: b,
            start,
            end,
        });
    }

    result.sort((a, b) => a.start.getTime() - b.start.getTime());
    return result;
}
