# Admin Booking Management - Open Season Section

**Status:** approved design (2026-05-27), pending implementation plan.
**Owner:** Bryan Hudson.
**Related code:** `src/features/admin/components/AdminBookingManagement.jsx`, `src/features/admin/pages/AdminDashboard.jsx`, `src/lib/shareholders.ts`.

## 1. Background

The admin **Bookings -> List** view groups rows by rotation round. The rendering pulls from the `schedule` array produced by `mapOrderToSchedule()`, which only emits **24 fixed slots** (12 Round 1 + 12 Round 2):

```jsx
{schedule.filter(s => s.round === 1).map(renderRow)}  // ROUND 1 - SHAREHOLDER ROTATION
{schedule.filter(s => s.round === 2).map(renderRow)}  // ROUND 2 - SNAKE DRAFT
```

Bookings created during **Open Season** (the first-come-first-served phase after Round 2 closes) do not correspond to any rotation slot. They are stored in the `bookings` Firestore collection with `phase: 'OPEN_SEASON'`, but `mapOrderToSchedule` never emits them, so they are **invisible in the List view** - admins cannot track or action their payments from there.

What is **already correct** (and stays untouched):
- **Stats cards** (`Total Revenue`, `Unpaid Fees`, `Bookings`, `Total Nights`) - the `analytics` memo in `AdminDashboard` iterates `allBookings` directly, so open-season bookings already count.
- **Calendar view** (`AdminCalendarView`) - already iterates `allBookings`.
- **CSV export** (`exportBookingsToCSV(allBookings)`) - already exports every booking.

The gap is exactly one place: the grouped List view.

## 2. Goal

Add a third section to the admin Bookings List view - **`OPEN SEASON - FIRST COME, FIRST SERVED`** - that lists every confirmed (or cancelled) open-season booking as its own row, so admins can track and manage payments the same way they do for Round 1 / Round 2 turns.

No behavior changes to the calendar, the stats, the CSV export, the booking actions themselves, or the rotation schedule.

## 3. Approach (chosen: B)

Derive an `openSeasonSlots` array in `AdminDashboard` via a new `useMemo`, pass it as a prop to `AdminBookingManagement`, and render a third section below Round 2 reusing the existing `renderRow` / `renderMobileCard` templates.

**Rejected alternatives:**
- **A. Extend `mapOrderToSchedule`** to emit open-season "slots." Rejected because `mapOrderToSchedule` is mirrored byte-for-byte in `functions/helpers/shareholders.js` and guarded by `cloudParity.test.js`; touching it would force a cloud-parity ripple for a UI-only need, and the "schedule" abstraction is rotation-shaped (one slot per shareholder per round), which fits poorly with the open-season model of zero-to-many bookings per shareholder.
- **C. Filter inline inside `AdminBookingManagement`.** Rejected because mixing data derivation into render code is harder to unit-test than a pure helper, and the component is already large.

## 4. Data shape & derivation

A new pure helper `deriveOpenSeasonSlots(allBookings, schedule)` lives in a new module **`src/lib/openSeason.ts`** (importable and unit-testable in isolation from React).

**Filter rule:** a booking belongs in the open-season list iff
1. `type !== 'pass'` and `type !== 'auto-pass'` (pass records are not real bookings), AND
2. `isFinalized === true` (drafts are transient; we do not show them in this admin section), AND
3. `id` is NOT in `Set(schedule.map(s => s.booking?.id).filter(Boolean))` (not already represented by a Round 1 / Round 2 slot).

Note: cancelled bookings (`type === 'cancelled'`) are intentionally **included** - they mirror the R1/R2 behavior of showing cancelled turns with a Cancelled badge, giving admins an audit trail.

**Slot shape** (mapped per surviving booking so the existing `renderRow` / `renderMobileCard` consume it without a new template):

```ts
{
  name: booking.shareholderName,
  round: 'OPEN',                          // sentinel; not the number 1 or 2
  status: booking.type === 'cancelled' ? 'CANCELLED' : 'COMPLETED',
  booking,                                // for actions + display
  start: booking.from,                    // normalised to Date (handles Firestore Timestamp)
  end: booking.to,
}
```

**Sort:** ascending by normalised `from` (so the calendar's reading direction matches the list's reading direction).

`AdminDashboard` adds:

```js
const openSeasonSlots = React.useMemo(
  () => deriveOpenSeasonSlots(allBookings, schedule),
  [allBookings, schedule]
);
```

and passes `openSeasonSlots` to `<AdminBookingManagement ... />`.

## 5. UI

**Placement:** new `<tbody>` group + section header inserted directly **below** the existing Round 2 block in the desktop list. On mobile, the open-season cards follow the R2 mobile cards.

**Header label:** `OPEN SEASON - FIRST COME, FIRST SERVED`, matching the all-caps styling of `ROUND 1 - SHAREHOLDER ROTATION` and `ROUND 2 - SNAKE DRAFT`.

**Row templates:** reuse the existing `renderRow` (desktop `<tr>`) and `renderMobileCard` (mobile card). No parallel template. The status badge, dates, fee, payment toggle, Actions dropdown (paid toggle, edit, cancel, send reminder), highlight-on-day-click - all light up the same way they do on R1/R2 rows because they already operate on `slot.booking`.

**Two small render adjustments** in both templates:

1. The round badge currently renders `` `R${slot.round}` `` (e.g. `R1`, `R2`). For open-season rows it must display `OPEN` instead. Implementation: `slot.round === 'OPEN' ? 'OPEN' : \`R${slot.round}\``.
2. The React `key` is currently `` `${slot.name}-${slot.round}` `` (one slot per `(name, round)` works for R1/R2 because each shareholder has exactly one turn per round). Open Season allows multiple bookings per shareholder, so the key must incorporate the booking id: `` `${slot.name}-${slot.round}-${slot.booking?.id ?? 'empty'}` ``. This is backward-compatible for R1/R2 (still uniquely identifies each slot) and prevents key collisions for the new section.

**Empty state:** when `openSeasonSlots.length === 0`, render a single placeholder row inside the section that reads *"No open-season bookings yet."* The header stays visible so the admin always sees the section exists.

**Examples:**
- Round 1 + Round 2 phases: section appears with the placeholder, signalling that open-season tracking is wired up and ready.
- Open Season phase with three bookings: section appears with three chronologically sorted rows, each fully actionable.

## 6. Tests

Vitest, against the pure `deriveOpenSeasonSlots` helper - no React render required.

| # | Test                                                                 |
|---|----------------------------------------------------------------------|
| 1 | Empty `allBookings` returns `[]`                                     |
| 2 | Filters out `type: 'pass'` and `type: 'auto-pass'`                   |
| 3 | Filters out drafts (`isFinalized === false`)                         |
| 4 | Includes `type: 'cancelled'` with `status: 'CANCELLED'` on the slot  |
| 5 | Excludes bookings whose id is referenced by a schedule slot          |
| 6 | Includes bookings whose id is NOT in any schedule slot               |
| 7 | Sorts ascending by `from`                                            |
| 8 | Sets `round: 'OPEN'` on every result                                 |
| 9 | Handles Firestore Timestamp-like `from` values (`.toDate()`)         |

Test data fixtures live in the test file; no Firebase emulator dependency.

## 7. Edge cases

Handled by the design:

- **Same shareholder, multiple open-season bookings:** each is its own row, chronologically ordered.
- **Open-season booking that the admin date-edits to overlap a Round 1 / Round 2 window:** still appears in the OPEN section, because identity is "booking-id not in schedule," not "date overlaps rotation window."
- **R1 / R2 booking that gets cancelled:** stays in its existing R1/R2 row (still part of the schedule, status flips to CANCELLED). Never duplicated into OPEN.
- **Booking with no `from` date** (malformed legacy record): filtered out by the helper before the sort comparator runs (no crash).
- **Booking whose `from` is a Firestore Timestamp vs. a plain Date:** the sort comparator normalises both shapes the same way `filterBookingsToSeason` and the calendar already do.

Deliberately **out of scope** for this change:
- Backfilling `phase: 'OPEN_SEASON'` on historical bookings. The slot-mismatch rule does not need the field.
- A separate stats card for open-season counts. Totals already include open-season; a dedicated card would be a separate UX conversation.
- Surfacing open-season activity in the Schedule tab. This change is scoped to the Bookings tab's List view.

## 8. What does not change

- `mapOrderToSchedule` (and its mirror in `functions/helpers/shareholders.js`) - untouched, no cloud-parity ripple.
- `AdminCalendarView` - already shows open-season bookings.
- Analytics / stats cards - already include open-season bookings via `allBookings`.
- `exportBookingsToCSV` - already exports every booking.
- The booking-action handlers (`handleEditClick`, `handleCancelBooking`, `handleToggleFinalized`, `handleTogglePaid`, `handleEditPayment`, `handleSendPaymentReminder`) - they operate on a booking object, which the new slots carry.
- The Schedule tab, the Notifications tab, the Users tab, the System tab.

## 9. Files touched (preview)

| File                                                   | Change                                                                 |
|--------------------------------------------------------|------------------------------------------------------------------------|
| `src/lib/openSeason.ts` (new)                          | `deriveOpenSeasonSlots(allBookings, schedule)` helper.                 |
| `tests/openSeason.test.ts` (new)                       | Nine unit tests against the helper.                                    |
| `src/features/admin/pages/AdminDashboard.jsx`          | One `useMemo` + one new prop on `<AdminBookingManagement ... />`.      |
| `src/features/admin/components/AdminBookingManagement.jsx` | Accept `openSeasonSlots` prop, render new section + header + empty state, one ternary in `renderRow` / `renderMobileCard` for the round badge. |

No changes to `functions/`, no changes to firestore.rules, no changes to email templates.

## 10. Acceptance criteria

1. With zero open-season bookings, the admin Bookings list shows a third section header `OPEN SEASON - FIRST COME, FIRST SERVED` containing a single placeholder row "No open-season bookings yet."
2. With N open-season bookings, the section shows N rows, chronologically sorted by stay start date.
3. Each row exposes the same actions admins use on R1/R2 rows: toggle paid, edit booking, cancel booking, send payment reminder.
4. Cancelled open-season bookings show with the existing Cancelled badge.
5. Stats cards, calendar, and CSV export show no functional change.
6. All existing tests still pass; the new `tests/openSeason.test.ts` adds 9 passing tests.
7. ESLint introduces no new errors on the touched files.
8. Production build succeeds.
9. Verified on dev before prod; prod ships behind a patch version bump.
