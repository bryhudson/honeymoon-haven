# Calendar Header Cleanup - Design

Date: 2026-07-10
Status: Approved (mockup + decisions), ready to implement

## Problem

The Bookings calendar header (both shareholder and admin) feels cluttered and
disjointed. Concretely:

1. **Two titles** for one thing: the shareholder view shows "Bookings" then,
   nested below, "2026 Season Calendar".
2. **Competing bordered pills at different heights** - the Today card, the
   legend card, the Calendar/List toggle, and (admin) Export all carry similar
   visual weight, so nothing reads as the focal point and informational cards
   look clickable ("boundaries look like buttons").
3. **The two views are built differently** - shareholder double-titles via a
   nested `ShareholderCalendarView` header; admin puts the title + Export +
   toggle in `AdminBookingManagement` and the Today/legend row in
   `AdminCalendarView`. They drift and feel inconsistent.

## Goals

- One clear visual hierarchy: a single title, obvious controls, quiet info.
- A premium, consistent header shared by the shareholder and admin calendars.
- Interactive elements (view toggle, Export) look clickable; informational
  elements (Today readout, legend) read as quiet info, not buttons.

## Approved decisions

- **One title.** Keep "Bookings"; drop the redundant "2026 Season Calendar"
  heading. Use "Bookings" in both views (was "Calendar View"/"Booking
  Management" on admin) for consistency.
- **Legend:** always visible, quiet, borderless swatches (not a popover).
- **Scope:** the calendar header/toolbar region only. NOT the page-level tabs,
  top nav, or the calendar grid cells.

## Design

A single shared header owns: icon + title, a quiet live Today line beneath the
title, the Calendar/List toggle (and admin Export) on the right as the only
button-styled controls, and a borderless legend row below. Admin differs only
by adding Export and the Paid/Unpaid swatches.

Weight rules that fix "boundaries look like buttons":
- **Controls** (view toggle, Export): button styling (segmented control /
  bordered ghost button).
- **Info** (Today, legend): borderless, muted text + small swatches. The Today
  card shrinks to one line with a live dot.

## Architecture

New shared component `src/components/ui/CalendarHeader.jsx`:

- Props: `title`, `viewMode` ('calendar' | 'list'), `onViewModeChange`,
  `onExport` (optional; renders Export when provided), `legendItems` (array),
  and the live Today line rendered internally (Pacific, reuses the
  `calendarToday` timezone logic).
- Legend shown only in `calendar` mode (colors are calendar-specific); the
  Today line shows in both.

Header ownership moves UP to the wrappers; the calendar view components become
pure month grids:

- `RecentBookings.jsx` (shareholder wrapper): render `CalendarHeader` (title
  "Bookings", legend = Confirmed/Turnover/Holiday/Event, no Export). Rename its
  local `viewMode` value `table` -> `list` for consistency.
- `ShareholderCalendarView.jsx`: remove its title, description, `CalendarTodayBanner`,
  and legend. Keep only the month grids (and the today-cell ring, unchanged).
- `AdminBookingManagement.jsx`: replace its bespoke title + Export + toggle
  header with `CalendarHeader` (title "Bookings", legend = Paid/Unpaid/
  Turnover/Holiday/Event, `onExport` wired to the existing CSV download).
- `AdminCalendarView.jsx`: remove its Today banner + legend row. Keep only the
  month grids (and the today-cell ring, unchanged).

The bordered `CalendarTodayBanner` card (shipped v2.99.0) is superseded by the
quiet inline Today line inside `CalendarHeader`; remove the standalone card.

## Out of scope

Page-level tabs (Bookings/Schedule/Trailer Guide/What's On), top nav, and the
calendar grid cells (including the today-cell ring) are unchanged.

## Verification

- Lint (jsx clean), full test suite, production build.
- Deploy dev; browser-verify both the shareholder Season Calendar and the admin
  Calendar View for a single clean header, consistent layout, and clear
  control-vs-info separation. Then ship prod.
