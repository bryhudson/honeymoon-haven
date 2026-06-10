import { normalizeName } from './shareholders';

// Open-season fairness rule: after locking in an open-season booking, a
// shareholder waits 48 hours before grabbing more dates, so everyone gets a
// shot at the remaining calendar.
//
// Only FINALIZED, non-cancelled bookings with phase 'OPEN_SEASON' count:
// - cancelled bookings don't block (cancel-and-rebook is a legitimate flow),
// - rotation (Round 1/2) bookings don't block the first open-season grab,
// - drafts and pass/auto-pass records never count.
// Name matching uses normalizeName because legacy docs store variants like
// "Mike & Janelle" for the canonical "Janelle and Mike".

const COOLDOWN_HOURS = 48;

interface BookingLike {
    shareholderName?: string;
    type?: string;
    isFinalized?: boolean;
    phase?: string;
    createdAt?: Date | { toDate(): Date } | string | null;
    [key: string]: unknown;
}

export interface CooldownState {
    blocked: boolean;
    /** Whole-ish hours until the cooldown lifts (0 when not blocked). */
    hoursRemaining: number;
}

function toDate(raw: unknown): Date | null {
    if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;
    if (raw && typeof (raw as { toDate?: () => Date }).toDate === 'function') {
        const d = (raw as { toDate: () => Date }).toDate();
        return d instanceof Date && !isNaN(d.getTime()) ? d : null;
    }
    if (raw == null) return null;
    const d = new Date(raw as string);
    return isNaN(d.getTime()) ? null : d;
}

export function getOpenSeasonCooldown(
    bookings: BookingLike[],
    shareholderName: string,
    now: Date = new Date()
): CooldownState {
    const me = normalizeName(shareholderName || '');

    let lastCreated: Date | null = null;
    for (const b of bookings || []) {
        if (b.type === 'pass' || b.type === 'auto-pass' || b.type === 'cancelled') continue;
        if (b.isFinalized !== true) continue;
        if (b.phase !== 'OPEN_SEASON') continue;
        if (normalizeName(b.shareholderName || '') !== me) continue;
        const created = toDate(b.createdAt);
        if (!created) continue;
        if (!lastCreated || created > lastCreated) lastCreated = created;
    }

    if (!lastCreated) return { blocked: false, hoursRemaining: 0 };

    const hoursSince = (now.getTime() - lastCreated.getTime()) / (1000 * 60 * 60);
    if (hoursSince >= COOLDOWN_HOURS) return { blocked: false, hoursRemaining: 0 };

    return { blocked: true, hoursRemaining: COOLDOWN_HOURS - hoursSince };
}
