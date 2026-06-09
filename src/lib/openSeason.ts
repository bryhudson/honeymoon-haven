// Derive the list of "open season" bookings from the raw bookings collection
// and the rotation schedule. The rule is "any real booking that isn't already
// represented by a Round 1 / Round 2 schedule slot."

export interface OpenSeasonSlot {
    name: string;
    round: 'OPEN';
    status: 'COMPLETED' | 'CANCELLED';
    booking: any; // shape from Firestore: matches the rotation schedule's slot.booking
    start: Date;
    end: Date;
}

export function deriveOpenSeasonSlots(
    allBookings: any[],
    schedule: any[]
): OpenSeasonSlot[] {
    return allBookings
        .filter(b => {
            if (b.type === 'pass' || b.type === 'auto-pass') return false;
            if (b.isFinalized !== true) return false;
            return true;
        })
        .map(b => ({
            name: b.shareholderName,
            round: 'OPEN' as const,
            status: b.type === 'cancelled' ? 'CANCELLED' : 'COMPLETED',
            booking: b,
            start: b.from,
            end: b.to,
        }));
}
