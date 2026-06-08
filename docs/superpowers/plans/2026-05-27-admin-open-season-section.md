# Admin Open Season Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a third section to the admin Bookings -> List view, labelled `OPEN SEASON - FIRST COME, FIRST SERVED`, that lists every confirmed (or cancelled) open-season booking as its own actionable row.

**Architecture:** A pure helper `deriveOpenSeasonSlots(allBookings, schedule)` derives the open-season list from existing data using a "not in any rotation slot" rule. `AdminDashboard` memoizes the result and passes it as a new prop. `AdminBookingManagement` renders a third tbody group below Round 2 reusing the existing `renderRow` / `renderMobileCard` templates with two tiny adjustments (round badge -> `OPEN`, React key -> include `booking.id`). Empty state always shows the header with a placeholder row.

**Tech Stack:** React 19 + Vite + Tailwind CSS, TypeScript helpers, Vitest. No Cloud Functions, Firestore Rules, or email template changes.

**Spec:** `docs/superpowers/specs/2026-05-27-admin-open-season-section-design.md` (commit `1caf45b`).

**Version bump:** This is a new admin tool. Per `CLAUDE.md`, that's a **minor** bump (`BUMP=minor`). The spec's acceptance criterion #9 says "patch"; correcting it here.

---

## File Structure

| File                                                       | Action | Responsibility                                                                            |
|------------------------------------------------------------|--------|-------------------------------------------------------------------------------------------|
| `src/lib/openSeason.ts`                                    | CREATE | Pure helper `deriveOpenSeasonSlots(allBookings, schedule)` returning sorted slot objects. |
| `tests/openSeason.test.ts`                                 | CREATE | 9 unit tests against the helper (no React render, no Firebase).                           |
| `src/features/admin/pages/AdminDashboard.jsx`              | MODIFY | Add one `useMemo` + pass `openSeasonSlots` as a new prop.                                 |
| `src/features/admin/components/AdminBookingManagement.jsx` | MODIFY | Accept new prop, render third section + header + empty state, update key + round badge.   |

No changes to `functions/`, `firestore.rules`, email templates, `mapOrderToSchedule`, the calendar view, the stats memo, or the CSV exporter.

---

## Task 1: Scaffold helper + empty-case test

**Files:**
- Create: `src/lib/openSeason.ts`
- Create: `tests/openSeason.test.ts`

- [ ] **Step 1.1: Write the failing test**

```ts
// tests/openSeason.test.ts
import { describe, it, expect } from 'vitest';
import { deriveOpenSeasonSlots } from '../src/lib/openSeason';

describe('deriveOpenSeasonSlots', () => {
    it('returns an empty array when there are no bookings', () => {
        expect(deriveOpenSeasonSlots([], [])).toEqual([]);
    });
});
```

- [ ] **Step 1.2: Run the test - expect FAIL (module missing)**

```bash
npx vitest run tests/openSeason.test.ts
```
Expected output contains: `Failed to load url ../src/lib/openSeason` or similar import error.

- [ ] **Step 1.3: Create the minimal helper**

```ts
// src/lib/openSeason.ts
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
    return [];
}
```

- [ ] **Step 1.4: Run the test - expect PASS**

```bash
npx vitest run tests/openSeason.test.ts
```
Expected: `1 passed`.

- [ ] **Step 1.5: Commit**

```bash
git add src/lib/openSeason.ts tests/openSeason.test.ts
git commit -m "feat(open-season): scaffold deriveOpenSeasonSlots with empty-case test"
```

---

## Task 2: Filter out pass + auto-pass records

**Files:**
- Modify: `tests/openSeason.test.ts`
- Modify: `src/lib/openSeason.ts`

- [ ] **Step 2.1: Add the failing test**

Append inside the `describe` block. The test asserts a real booking IS returned while pass/auto-pass are dropped - the stub returns `[]` for everything so this fails on the length assertion, driving the next step:

```ts
    it('filters out pass and auto-pass records while keeping real bookings', () => {
        const realBooking = {
            id: 'real',
            type: 'booking',
            isFinalized: true,
            shareholderName: 'Real',
            from: new Date(2026, 5, 1),
            to: new Date(2026, 5, 3),
        };
        const bookings = [
            realBooking,
            { id: 'a', type: 'pass', isFinalized: true, shareholderName: 'X', from: new Date(2026, 5, 1), to: new Date(2026, 5, 3) },
            { id: 'b', type: 'auto-pass', isFinalized: true, shareholderName: 'Y', from: new Date(2026, 5, 4), to: new Date(2026, 5, 6) },
        ];
        const result = deriveOpenSeasonSlots(bookings, []);
        expect(result).toHaveLength(1);
        expect(result[0].booking).toBe(realBooking);
    });
```

- [ ] **Step 2.2: Run the test - expect FAIL**

```bash
npx vitest run tests/openSeason.test.ts
```
Expected: 1 pass + 1 fail (`Expected length: 1 / Received length: 0`).

- [ ] **Step 2.3: Implement the filter + mapping**

Replace the body of `deriveOpenSeasonSlots` in `src/lib/openSeason.ts`:

```ts
export function deriveOpenSeasonSlots(
    allBookings: any[],
    schedule: any[]
): OpenSeasonSlot[] {
    return allBookings
        .filter(b => b.type !== 'pass' && b.type !== 'auto-pass')
        .map(b => ({
            name: b.shareholderName,
            round: 'OPEN' as const,
            status: b.type === 'cancelled' ? 'CANCELLED' : 'COMPLETED',
            booking: b,
            start: b.from,
            end: b.to,
        }));
}
```

- [ ] **Step 2.4: Run the test - expect PASS**

```bash
npx vitest run tests/openSeason.test.ts
```
Expected: 2 passed.

- [ ] **Step 2.5: Commit**

```bash
git add src/lib/openSeason.ts tests/openSeason.test.ts
git commit -m "feat(open-season): filter pass/auto-pass, return slot for real bookings"
```

---

## Task 3: Filter out drafts (isFinalized === false)

**Files:**
- Modify: `tests/openSeason.test.ts`
- Modify: `src/lib/openSeason.ts`

- [ ] **Step 3.1: Add the failing test**

```ts
    it('filters out drafts (isFinalized === false)', () => {
        const draft = {
            id: 'draft',
            type: 'booking',
            isFinalized: false,
            shareholderName: 'Draftee',
            from: new Date(2026, 5, 1),
            to: new Date(2026, 5, 3),
        };
        expect(deriveOpenSeasonSlots([draft], [])).toEqual([]);
    });
```

- [ ] **Step 3.2: Run - expect FAIL** (current impl returns 1 slot for the draft)

```bash
npx vitest run tests/openSeason.test.ts
```

- [ ] **Step 3.3: Update the filter**

Update the `.filter()` line in `src/lib/openSeason.ts`:

```ts
        .filter(b => {
            if (b.type === 'pass' || b.type === 'auto-pass') return false;
            if (b.isFinalized !== true) return false;
            return true;
        })
```

- [ ] **Step 3.4: Run - expect PASS** (3 tests total)

```bash
npx vitest run tests/openSeason.test.ts
```
Expected: 3 passed.

- [ ] **Step 3.5: Commit**

```bash
git add src/lib/openSeason.ts tests/openSeason.test.ts
git commit -m "feat(open-season): exclude drafts (isFinalized=false)"
```

---

## Task 4: Include cancelled bookings with CANCELLED status

**Files:**
- Modify: `tests/openSeason.test.ts`

(The mapping in `src/lib/openSeason.ts` already sets `status: 'CANCELLED'` when `type === 'cancelled'`. This task locks that behavior in as a test.)

- [ ] **Step 4.1: Add the test**

```ts
    it('includes cancelled bookings with status CANCELLED', () => {
        const cancelled = {
            id: 'c',
            type: 'cancelled',
            isFinalized: true,
            shareholderName: 'Cancelled Co',
            from: new Date(2026, 5, 1),
            to: new Date(2026, 5, 3),
        };
        const result = deriveOpenSeasonSlots([cancelled], []);
        expect(result).toHaveLength(1);
        expect(result[0].status).toBe('CANCELLED');
        expect(result[0].name).toBe('Cancelled Co');
    });
```

- [ ] **Step 4.2: Run - expect PASS** (4 tests total)

```bash
npx vitest run tests/openSeason.test.ts
```

- [ ] **Step 4.3: Commit**

```bash
git add tests/openSeason.test.ts
git commit -m "test(open-season): lock cancelled bookings show as CANCELLED slot"
```

---

## Task 5: Exclude bookings already in the rotation schedule

**Files:**
- Modify: `tests/openSeason.test.ts`
- Modify: `src/lib/openSeason.ts`

- [ ] **Step 5.1: Add the failing test**

```ts
    it('excludes bookings whose id is referenced by a schedule slot, includes others', () => {
        const inSchedule = {
            id: 'sched-1',
            type: 'booking',
            isFinalized: true,
            shareholderName: 'Rotation Picker',
            from: new Date(2026, 5, 1),
            to: new Date(2026, 5, 3),
        };
        const openSeason = {
            id: 'open-1',
            type: 'booking',
            isFinalized: true,
            shareholderName: 'Open Picker',
            from: new Date(2026, 6, 10),
            to: new Date(2026, 6, 13),
        };
        const schedule = [
            { name: 'Rotation Picker', round: 1, booking: inSchedule },
            { name: 'Other', round: 1, booking: null },
        ];
        const result = deriveOpenSeasonSlots([inSchedule, openSeason], schedule);
        expect(result).toHaveLength(1);
        expect(result[0].booking).toBe(openSeason);
    });
```

- [ ] **Step 5.2: Run - expect FAIL** (current impl returns 2 slots, ignores `schedule`)

```bash
npx vitest run tests/openSeason.test.ts
```

- [ ] **Step 5.3: Use the schedule in the filter**

Update `src/lib/openSeason.ts` to build a `Set` of scheduled booking ids and exclude them:

```ts
export function deriveOpenSeasonSlots(
    allBookings: any[],
    schedule: any[]
): OpenSeasonSlot[] {
    const scheduledIds = new Set<string>();
    for (const s of schedule) {
        const id = s?.booking?.id;
        if (id) scheduledIds.add(id);
    }

    return allBookings
        .filter(b => {
            if (b.type === 'pass' || b.type === 'auto-pass') return false;
            if (b.isFinalized !== true) return false;
            if (b.id != null && scheduledIds.has(b.id)) return false;
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
```

- [ ] **Step 5.4: Run - expect PASS** (5 tests total)

```bash
npx vitest run tests/openSeason.test.ts
```

- [ ] **Step 5.5: Commit**

```bash
git add src/lib/openSeason.ts tests/openSeason.test.ts
git commit -m "feat(open-season): exclude bookings already represented by a rotation slot"
```

---

## Task 6: Sort by `from` ascending + handle Firestore Timestamp shape

**Files:**
- Modify: `tests/openSeason.test.ts`
- Modify: `src/lib/openSeason.ts`

- [ ] **Step 6.1: Add the failing tests (two at once - sort and Timestamp)**

```ts
    it('sorts results ascending by stay start date (from)', () => {
        const later = {
            id: 'b',
            type: 'booking',
            isFinalized: true,
            shareholderName: 'Later',
            from: new Date(2026, 7, 5),
            to: new Date(2026, 7, 7),
        };
        const earlier = {
            id: 'a',
            type: 'booking',
            isFinalized: true,
            shareholderName: 'Earlier',
            from: new Date(2026, 5, 1),
            to: new Date(2026, 5, 3),
        };
        const result = deriveOpenSeasonSlots([later, earlier], []);
        expect(result.map(s => s.booking.id)).toEqual(['a', 'b']);
    });

    it('handles Firestore Timestamp-like `from` (.toDate())', () => {
        const ts = new Date(2026, 5, 1);
        const tsLike = { toDate: () => ts };
        const booking = {
            id: 'ts',
            type: 'booking',
            isFinalized: true,
            shareholderName: 'TS',
            from: tsLike,
            to: tsLike,
        };
        const result = deriveOpenSeasonSlots([booking], []);
        expect(result).toHaveLength(1);
        expect(result[0].start).toBeInstanceOf(Date);
        expect(result[0].start.getTime()).toBe(ts.getTime());
    });
```

- [ ] **Step 6.2: Run - expect FAILs** (sort isn't applied; Timestamp not unwrapped)

```bash
npx vitest run tests/openSeason.test.ts
```

- [ ] **Step 6.3: Add a date-normalization helper + sort**

Replace the contents of `src/lib/openSeason.ts` with:

```ts
// Derive the list of "open season" bookings from the raw bookings collection
// and the rotation schedule. The rule is "any real booking that isn't already
// represented by a Round 1 / Round 2 schedule slot."

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
    schedule: any[]
): OpenSeasonSlot[] {
    const scheduledIds = new Set<string>();
    for (const s of schedule) {
        const id = s?.booking?.id;
        if (id) scheduledIds.add(id);
    }

    const result: OpenSeasonSlot[] = [];
    for (const b of allBookings) {
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
```

- [ ] **Step 6.4: Run - expect PASS** (7 tests total)

```bash
npx vitest run tests/openSeason.test.ts
```

- [ ] **Step 6.5: Commit**

```bash
git add src/lib/openSeason.ts tests/openSeason.test.ts
git commit -m "feat(open-season): sort by from asc + normalize Firestore Timestamp"
```

---

## Task 7: Lock in remaining invariants (round sentinel + malformed handling)

**Files:**
- Modify: `tests/openSeason.test.ts`

- [ ] **Step 7.1: Add the two remaining tests**

```ts
    it('sets round: "OPEN" on every returned slot', () => {
        const bookings = [
            { id: '1', type: 'booking', isFinalized: true, shareholderName: 'A', from: new Date(2026, 5, 1), to: new Date(2026, 5, 3) },
            { id: '2', type: 'cancelled', isFinalized: true, shareholderName: 'B', from: new Date(2026, 5, 5), to: new Date(2026, 5, 7) },
        ];
        const result = deriveOpenSeasonSlots(bookings, []);
        expect(result.map(s => s.round)).toEqual(['OPEN', 'OPEN']);
    });

    it('drops malformed bookings without a parseable from date', () => {
        const malformed = [
            { id: 'no-from', type: 'booking', isFinalized: true, shareholderName: 'X' },
            { id: 'bad-from', type: 'booking', isFinalized: true, shareholderName: 'Y', from: 'not-a-date' },
        ];
        expect(deriveOpenSeasonSlots(malformed, [])).toEqual([]);
    });
```

- [ ] **Step 7.2: Run - expect PASS** (9 tests total - matches the 9 in the spec table)

```bash
npx vitest run tests/openSeason.test.ts
```

- [ ] **Step 7.3: Run the FULL test suite to verify no regression**

```bash
npm test
```
Expected: All test files pass; total count = previous 216 + 9 = `225 passed`.

- [ ] **Step 7.4: Commit**

```bash
git add tests/openSeason.test.ts
git commit -m "test(open-season): lock round=OPEN invariant + malformed-from handling"
```

---

## Task 8: Wire AdminDashboard - add memo + pass new prop

**Files:**
- Modify: `src/features/admin/pages/AdminDashboard.jsx`

- [ ] **Step 8.1: Import the helper**

At the top of `src/features/admin/pages/AdminDashboard.jsx`, add the import next to the other `src/lib` imports:

```jsx
import { deriveOpenSeasonSlots } from '../../../lib/openSeason';
```

- [ ] **Step 8.2: Add the memo just below the existing `schedule` memo**

Find the existing memo (around line 509-514):

```jsx
    const { schedule, activeTurn } = React.useMemo(() => {
        const order = getShareholderOrder(getCurrentSeasonYear());
        const sched = mapOrderToSchedule(order, allBookings, startDateOverride, fastTestingMode, bypassTenAM);
        const active = sched.find(s => s.status === 'ACTIVE' || s.status === 'GRACE_PERIOD') || sched.find(s => s.name === status?.activePicker && s.round == status?.round);
        return { schedule: sched, activeTurn: active };
    }, [allBookings, status, startDateOverride, fastTestingMode, bypassTenAM]);
```

Immediately after that closing `]);`, add:

```jsx
    const openSeasonSlots = React.useMemo(
        () => deriveOpenSeasonSlots(allBookings, schedule),
        [allBookings, schedule]
    );
```

- [ ] **Step 8.3: Pass the new prop on `<AdminBookingManagement ... />`**

The current invocation is a single line (around line 563 in `src/features/admin/pages/AdminDashboard.jsx`):

```jsx
                    <AdminBookingManagement schedule={schedule} allBookings={allBookings} bookingViewMode={bookingViewMode} setBookingViewMode={setBookingViewMode} handleEditClick={(b) => { setEditingBooking(b); setIsEditModalOpen(true); }} handleCancelBooking={handleCancelBooking} handleToggleFinalized={handleToggleFinalized} handleTogglePaid={handleTogglePaid} handleEditPayment={handleEditPayment} handleSendPaymentReminder={handleSendPaymentReminder} handleBookSkippedSlot={handleBookSkippedSlot} triggerAlert={triggerAlert} />
```

Replace it with (adds `openSeasonSlots={openSeasonSlots}` immediately after `schedule={schedule}`; every other prop is preserved verbatim):

```jsx
                    <AdminBookingManagement schedule={schedule} openSeasonSlots={openSeasonSlots} allBookings={allBookings} bookingViewMode={bookingViewMode} setBookingViewMode={setBookingViewMode} handleEditClick={(b) => { setEditingBooking(b); setIsEditModalOpen(true); }} handleCancelBooking={handleCancelBooking} handleToggleFinalized={handleToggleFinalized} handleTogglePaid={handleTogglePaid} handleEditPayment={handleEditPayment} handleSendPaymentReminder={handleSendPaymentReminder} handleBookSkippedSlot={handleBookSkippedSlot} triggerAlert={triggerAlert} />
```

- [ ] **Step 8.4: Lint the file**

```bash
npx eslint src/features/admin/pages/AdminDashboard.jsx
```
Expected: no NEW errors compared to baseline (the pre-existing `set-state-in-effect` welcome-modal warning may still appear; that is not introduced here).

- [ ] **Step 8.5: Build to confirm no broken imports**

```bash
npm run build
```
Expected: `vite build` reports success (no resolution errors).

- [ ] **Step 8.6: Commit**

```bash
git add src/features/admin/pages/AdminDashboard.jsx
git commit -m "feat(admin): derive openSeasonSlots and pass to AdminBookingManagement"
```

---

## Task 9: AdminBookingManagement - accept prop, update key + round badge

**Files:**
- Modify: `src/features/admin/components/AdminBookingManagement.jsx`

- [ ] **Step 9.1: Accept the new prop**

In the component's destructured props (top of `export function AdminBookingManagement({ ... })`), add `openSeasonSlots = []` so callers without the prop don't crash:

```jsx
export function AdminBookingManagement({
    schedule,
    openSeasonSlots = [],
    allBookings,
    bookingViewMode,
    setBookingViewMode,
    handleEditClick,
    handleCancelBooking,
    handleToggleFinalized,
    handleTogglePaid,
    handleEditPayment,
    handleSendPaymentReminder,
    handleBookSkippedSlot,
    triggerAlert
}) {
```

- [ ] **Step 9.2: Update `renderMobileCard`'s key to incorporate `booking.id`**

Find the mobile card's outer `<div key={`${slot.name}-${slot.round}`} ...>` (around line 100). Replace the `key`:

```jsx
            <div key={`${slot.name}-${slot.round}-${slot.booking?.id ?? 'empty'}`} data-bk={booking?.id || undefined} className={`rounded-2xl border shadow-sm relative overflow-hidden transition-all ${highlightedId && highlightedId === booking?.id ? 'ring-2 ring-amber-400 bg-amber-50' : isActive ? 'bg-emerald-50/30 ring-2 ring-emerald-500/40' : 'bg-white'}`}>
```

- [ ] **Step 9.3: Update `renderMobileCard`'s round badge**

Find the round badge `<span ...>R{slot.round}</span>` (around line 119). Replace the text expression:

```jsx
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-700">
                                {slot.round === 'OPEN' ? 'OPEN' : `R${slot.round}`}
                            </span>
```

- [ ] **Step 9.4: Update `renderRow`'s unbooked-slot key for consistency**

Find the unbooked-row `<tr key={`${slot.name}-${slot.round}`} ...>` (around line 222). Replace the key:

```jsx
                <tr key={`${slot.name}-${slot.round}-${slot.booking?.id ?? 'empty'}`} className={`bg-slate-50/30 ${isActive ? 'ring-inset ring-2 ring-emerald-500/50 shadow-sm relative z-10 bg-emerald-50/30' : ''}`}>
```

(The booked-row `<tr key={booking.id} ...>` already keys by booking id and needs no change.)

- [ ] **Step 9.5: Lint + build**

```bash
npx eslint src/features/admin/components/AdminBookingManagement.jsx
npm run build
```
Expected: no new errors; build succeeds.

- [ ] **Step 9.6: Commit**

```bash
git add src/features/admin/components/AdminBookingManagement.jsx
git commit -m "refactor(admin): accept openSeasonSlots prop + key/badge ready for round=OPEN"
```

---

## Task 10: Render the OPEN SEASON section (desktop)

**Files:**
- Modify: `src/features/admin/components/AdminBookingManagement.jsx`

- [ ] **Step 10.1: Insert the new tbody section below Round 2**

Locate the `tbody` block that renders Round 2 (around lines 446-451). Immediately after the existing `{schedule.filter(s => s.round === 2).map(renderRow)}` line, add:

```jsx
                                <tr className="bg-slate-100 border-b border-t border-slate-200">
                                    <td colSpan="8" className="px-6 py-2 text-xs font-bold tracking-wider text-slate-600 uppercase">
                                        Open Season - First Come, First Served
                                    </td>
                                </tr>
                                {openSeasonSlots.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="px-6 py-6 text-center text-sm italic text-slate-400">
                                            No open-season bookings yet.
                                        </td>
                                    </tr>
                                ) : (
                                    openSeasonSlots.map(renderRow)
                                )}
```

- [ ] **Step 10.2: Build to verify no JSX syntax error**

```bash
npm run build
```
Expected: build succeeds.

- [ ] **Step 10.3: Commit**

```bash
git add src/features/admin/components/AdminBookingManagement.jsx
git commit -m "feat(admin): render OPEN SEASON section in desktop bookings list"
```

---

## Task 11: Render the OPEN SEASON section (mobile)

**Files:**
- Modify: `src/features/admin/components/AdminBookingManagement.jsx`

- [ ] **Step 11.1: Insert the new mobile section below the schedule cards**

Locate the mobile view (around lines 419-422):

```jsx
                    {/* Mobile View */}
                    <div className="md:hidden space-y-4">
                        {schedule.map(renderMobileCard)}
                    </div>
```

Replace it with:

```jsx
                    {/* Mobile View */}
                    <div className="md:hidden space-y-4">
                        {schedule.map(renderMobileCard)}

                        <div className="pt-6 pb-2 text-xs font-bold tracking-wider text-slate-600 uppercase border-t border-slate-200 mt-4">
                            Open Season - First Come, First Served
                        </div>
                        {openSeasonSlots.length === 0 ? (
                            <div className="text-center text-sm italic text-slate-400 py-4">
                                No open-season bookings yet.
                            </div>
                        ) : (
                            openSeasonSlots.map(renderMobileCard)
                        )}
                    </div>
```

- [ ] **Step 11.2: Build to verify**

```bash
npm run build
```
Expected: build succeeds.

- [ ] **Step 11.3: Commit**

```bash
git add src/features/admin/components/AdminBookingManagement.jsx
git commit -m "feat(admin): render OPEN SEASON section in mobile bookings list"
```

---

## Task 12: Full verification gate

**Files:** none

- [ ] **Step 12.1: Lint all touched source files**

```bash
npx eslint src/lib/openSeason.ts src/features/admin/pages/AdminDashboard.jsx src/features/admin/components/AdminBookingManagement.jsx
```
Expected: no NEW errors. The pre-existing welcome-modal `set-state-in-effect` warning in Dashboard.jsx (not AdminDashboard) is unrelated. AdminDashboard's pre-existing unused vars (`isMobileMenuOpen`, `handleWipeDatabase`, unused catch `e`) may remain - those are pre-existing debt and out of scope.

- [ ] **Step 12.2: Run the full test suite**

```bash
npm test
```
Expected: `Test Files 11 passed` (10 pre-existing + 1 new); `Tests 225 passed` (216 pre-existing + 9 new).

- [ ] **Step 12.3: Production build**

```bash
npm run build
```
Expected: build succeeds; bundle sizes roughly unchanged.

---

## Task 13: Dev deploy + smoke verify

**Files:** none

- [ ] **Step 13.1: Confirm dev tree is committed (or acceptably dirty)**

```bash
git status -sb
```
Dev deploys tolerate uncommitted changes but warn. All changes from Tasks 1-11 should already be committed - tree should be clean.

- [ ] **Step 13.2: Deploy to dev (background)**

```bash
./scripts/deploy-dev.sh
```
This builds with `--mode development` and deploys hosting + functions to `hhr-trailer-booking-dev`. Functions will skip since `functions/` is unchanged. Run it in the background (it takes a few minutes).

Expected: `Dev deploy complete -> https://hhr-trailer-booking-dev.web.app`.

- [ ] **Step 13.3: Smoke-verify on dev**

Open https://hhr-trailer-booking-dev.web.app/#/admin in the connected browser. Verify with `javascript_tool` / `read_console_messages`:

1. Footer renders the current `package.json` version (dev never bumps).
2. No console errors.
3. The List view (Bookings tab -> List toggle) now shows three sections in order:
   - `Round 1 - Shareholder Rotation`
   - `Round 2 - Snake Draft`
   - `Open Season - First Come, First Served`
4. Since dev is in Round 1 (no open-season bookings yet), the third section shows the placeholder row `No open-season bookings yet.`
5. The Calendar toggle still renders the calendar identically (no regressions to existing behavior).
6. Mobile view (narrow the window or use DevTools device emulation): the third section appears below the rotation cards with the same placeholder.

If the populated state needs visual confirmation, that is intentionally deferred to in-prod usage once open season starts; the 9 unit tests cover the populated-state logic.

---

## Task 14: Prod deploy as v2.97.0 (minor bump)

**Files:** none

- [ ] **Step 14.1: Confirm git tree is clean (deploy-prod.sh hard-fails on dirty tree)**

```bash
git status --short
```
Expected: empty output.

- [ ] **Step 14.2: Deploy to prod with minor bump + typed confirmation**

This is a new admin tool -> minor bump. Run in the background:

```bash
echo "deploy production" | BUMP=minor ./scripts/deploy-prod.sh
```

The script will:
1. Bump `package.json` to `2.97.0`.
2. Commit `chore: release v2.97.0` + push to origin.
3. Build with `--mode production`.
4. Deploy hosting + functions to `hhr-trailer-booking`.

Expected (tail of output): `Production deploy complete`.

- [ ] **Step 14.3: Verify live prod**

Open https://hhr-trailer-booking.web.app and:

1. Footer reads `v2.97.0`.
2. No console errors.
3. Log in as admin (the user performs login; this plan does not type passwords). Navigate to Bookings -> List. Confirm the three sections render with the new Open Season header and the placeholder (or, if any open-season bookings already exist in prod, the populated rows in chronological order).

- [ ] **Step 14.4: Tag the release as a feature, not a fix**

(Already handled by the conventional `chore: release v2.97.0` commit pushed by the script. No additional action needed.)

---

## Self-Review Summary

| Spec requirement                                                              | Plan task |
|-------------------------------------------------------------------------------|-----------|
| Pure helper `deriveOpenSeasonSlots(allBookings, schedule)` in `src/lib`       | Tasks 1-7 |
| Filter rule: not pass/auto-pass, finalized, not in any schedule slot          | Tasks 2,3,5 |
| Cancelled bookings included with `status: 'CANCELLED'`                        | Task 4 |
| Slot shape with `name`, `round: 'OPEN'`, `status`, `booking`, `start`, `end`  | Tasks 2,6,7 |
| Sort ascending by `from`                                                      | Task 6 |
| Firestore Timestamp-like `.toDate()` normalization                            | Task 6 |
| 9 unit tests in `tests/openSeason.test.ts`                                    | Tasks 1-7 (9 tests across) |
| New `useMemo` in `AdminDashboard` + new prop                                  | Task 8 |
| `AdminBookingManagement` accepts new prop                                     | Task 9 |
| React key incorporates `booking.id` to avoid collisions                       | Task 9 (steps 9.2, 9.4) |
| Round badge renders `OPEN` for open-season rows                               | Task 9 (step 9.3) |
| Section header `OPEN SEASON - FIRST COME, FIRST SERVED` below Round 2 (desktop) | Task 10 |
| Mobile section + header                                                       | Task 11 |
| Empty-state placeholder always-visible                                        | Tasks 10, 11 |
| No changes to `mapOrderToSchedule`, `functions/`, rules, or emails            | (none touched) |
| Stats / calendar / CSV unchanged                                              | (none touched) |
| Verified on dev before prod                                                   | Task 13 |
| Prod ships behind a version bump (corrected to minor per CLAUDE.md)           | Task 14 |
