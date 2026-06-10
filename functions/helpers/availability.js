// Cloud-side overlap math, mirroring src/lib/availability.ts on the client.
//
// Bookings are stored as [from, to] where `from` is the check-in day and `to`
// is the check-out day. A stay occupies *nights*, so the range is half-open
// [from, to): the check-out day is NOT occupied and stays available as the
// next shareholder's check-in day.
//
// Unlike the client (whose date-fns startOfDay runs in the shareholder's local
// Pacific timezone), Cloud Functions run in UTC, so day normalization must be
// timezone-explicit. Stored timestamps are not guaranteed to be midnight: some
// records carry a time-of-day (e.g. a checkout at 2026-08-26T19:00Z, noon PDT),
// and comparing raw timestamps falsely overlaps the boundary day.

// Normalize Date / Firestore Timestamp-like / ISO string to a Date, else null.
function toDate(raw) {
    if (!raw) return null;
    if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;
    if (typeof raw.toDate === "function") {
        const d = raw.toDate();
        return d instanceof Date && !isNaN(d.getTime()) ? d : null;
    }
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
}

// The Pacific calendar day of a timestamp, as a sortable "YYYY-MM-DD" key.
// Returns null for missing/unparseable input.
function pacificDayKey(raw) {
    const d = toDate(raw);
    if (!d) return null;
    // en-CA formats as YYYY-MM-DD; lexicographic order == chronological order.
    return d.toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
}

// True if two stays share at least one night (Pacific calendar days, half-open).
// The check-out day of one stay may be the check-in day of another without
// conflicting. Returns false when any date is unparseable: the caller must not
// claim a conflict it cannot prove.
function nightsOverlap(aFrom, aTo, bFrom, bTo) {
    const aStart = pacificDayKey(aFrom);
    const aEnd = pacificDayKey(aTo);
    const bStart = pacificDayKey(bFrom);
    const bEnd = pacificDayKey(bTo);
    if (!aStart || !aEnd || !bStart || !bEnd) return false;
    return aStart < bEnd && bStart < aEnd;
}

module.exports = {
    pacificDayKey,
    nightsOverlap
};
