# HHR Trailer Booking — Test Plan

## Stack
- **Framework**: Vitest v4 (already installed)
- **Runner**: `npm test` → `vitest run`
- **Language**: TypeScript + JavaScript (ESM)
- **Environment**: Node (no jsdom needed — all lib/service tests are pure functions)

---

## Baseline (pre-existing)
| File | Tests | Status |
|---|---|---|
| `tests/pricing.test.ts` | 18 | ✅ Passing |
| `tests/emailTemplates.test.js` | 26 | ✅ Passing |
| `tests/shareholders.test.ts` | 51 | ✅ Passing |
| `tests/utils.test.ts` | 24 | ✅ Passing |

---

## Critical Paths — Integration Tests

### 1. Draft Schedule / Booking Flow (`src/lib/shareholders.ts`)
The `calculateDraftSchedule` function is the core state machine driving the entire booking experience. It determines who can pick, when their window opens, and phase transitions (PRE_DRAFT → ROUND_1 → ROUND_2 → OPEN_SEASON).

**Test scenarios:**
- `ROUND_1`: First picker active (no bookings yet, now within first window)
- `ROUND_1`: Window auto-expires and second picker becomes active
- `ROUND_1`: First picker books — next picker's window begins next 10 AM PST
- `ROUND_1 → ROUND_2`: All Round 1 picks complete, Round 2 picker is active
- `ROUND_2`: Correct phase label and round number
- `OPEN_SEASON`: All picks complete (activePicker = null)
- Grace period: `now` is before official 10 AM PST window start
- `isSeasonStart` flag for first pick in the entire draft

### 2. User Authentication (Firebase-dependent — mocked)
> `src/features/auth/AuthContext.jsx` + `src/features/auth/pages/Login.jsx`
>
> **Status**: Deferred — requires `@testing-library/react` + Firebase mock setup.
> Not included in this sprint; tracked for future iteration.

### 3. Pricing / Maintenance Fees (`src/lib/pricing.ts`)
> **Status**: ✅ Fully covered in `tests/pricing.test.ts` (18 tests).
> Weeknight ($100), weekend ($125), weekly discount ($100/7 nights), averageRate.

### 4. Email Templates (`functions/helpers/emailTemplates.js`)
> **Status**: ✅ Fully covered in `tests/emailTemplates.test.js` (26 tests).
> All 16 template functions, HTML structure, content quality.

---

## Unit Tests — Core Library Functions

### 5. Name Normalization (`src/lib/shareholders.ts`) ✅
`normalizeName()` and `formatNameForDisplay()` are used throughout the booking flow to match shareholders across data sources. Bugs here cause "user not found" auth failures.

**Test scenarios:**
- `&` → `and` conversion
- Canonical name mapping (`NAME_MAP` reversals like "Gerry & Georgina" → "Georgina and Jerry")
- Null / undefined / empty string inputs
- Whitespace trimming and normalization
- Case insensitivity (lowercase for internal comparison)
- Already-canonical names (no double-transformation)

### 6. Shareholder Order / Rotation (`src/lib/shareholders.ts`) ✅
`getShareholderOrder(year)` determines pick order for each year via rotation.

**Test scenarios:**
- 2025 baseline order
- 2026 hardcoded override (special case)
- 2027 rotation by 2 positions
- Full-cycle rotation (2025 + 12 = same as 2025)
- Past year (2024) returns 2025 baseline

### 7. 10 AM PST Turn Rule (`src/lib/shareholders.ts`) ✅
`getOfficialStart()` is the critical business rule: every turn officially starts at 10:00 AM Pacific. Errors here cascade through the entire draft schedule.

**Test scenarios:**
- Exactly at 10:00 AM PST → returns same day 10 AM PST
- 1 minute past 10 AM PST → rolls to NEXT day 10 AM PST
- Before 10 AM PST → returns same day 10 AM PST
- PDT period (after March 8 DST change) → correct UTC offset
- null input → returns null

### 8. Draft Schedule Mapping (`src/lib/shareholders.ts`) ✅
`mapOrderToSchedule()` converts the shareholder list + bookings into a visual schedule grid.

**Test scenarios:**
- Returns correct array length (shareholders × 2 rounds)
- Round 1 items have `round = 1`, Round 2 items have `round = 2`
- Completed booking → `status = 'COMPLETED'`
- Passed turn → `status = 'PASSED'`
- Cancelled booking → `status = 'CANCELLED'`
- All required fields present on each item

### 9. Tailwind Class Utility (`src/lib/utils.ts`) ✅
`cn()` is used in every component for conditional Tailwind classes.

**Test scenarios:**
- Multiple class string merging
- Conflicting Tailwind utility resolution (last wins)
- Falsy value exclusion (false, undefined, null)
- Object syntax `{ 'class': boolean }`
- Array syntax
- Responsive / variant conflict resolution (hover:, p-, text-)
- No arguments → empty string

---

## Test Files Summary

| File | Functions Covered | Tests |
|---|---|---|
| `tests/pricing.test.ts` | `calculateBookingCost` | 18 ✅ |
| `tests/emailTemplates.test.js` | All 16 email templates | 26 ✅ |
| `tests/shareholders.test.ts` | `normalizeName`, `formatNameForDisplay`, `getShareholderOrder`, `getOfficialStart`, `getPickDurationMS`, `calculateDraftSchedule`, `mapOrderToSchedule` | 51 ✅ |
| `tests/utils.test.ts` | `cn` | 24 ✅ |

**Total: 119 tests — all passing**

---

## Test Execution

```bash
# Run all tests
npm test

# Run specific file
npx vitest run tests/shareholders.test.ts
npx vitest run tests/utils.test.ts

# Watch mode (development)
npm run test:watch
```

---

## Out of Scope (This Sprint)
- Component tests (requires `@testing-library/react` + jsdom)
- Firebase integration tests (requires emulator or mock)
- E2E tests (Playwright/Cypress)
- Cloud Function trigger tests
- `useBookingRealtime` hook (Firebase-dependent)
