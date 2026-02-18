# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Vite dev server with HMR
npm run build        # Production build to dist/
npm run lint         # ESLint v9 flat config
npm test             # Vitest (run once)
npm run test:watch   # Vitest watch mode
npm run deploy       # Builds then firebase deploy (hosting + functions + rules)
```

**Run a single test file:**
```bash
npx vitest run tests/shareholders.test.ts
```

## Architecture

**What it does:** Private booking app for ~12 shareholder families who co-own a resort. Each season, a two-round draft determines who books which dates in what order. Round 1 is picks 1–12, Round 2 reverses to 12–1, then open season.

**Stack:** React 19 + Vite, HashRouter (`/#/` URLs), Tailwind CSS (CSS custom property color tokens, shadcn-style), Firebase (Auth, Firestore, Cloud Functions v2, Hosting).

### Core Domain Logic

`src/lib/shareholders.ts` is the heart of the app. `calculateDraftSchedule()` replays all existing bookings to determine current phase (`PRE_DRAFT → ROUND_1 → ROUND_2 → OPEN_SEASON`), active picker, window deadlines, and next picker. This function is mirrored verbatim in `functions/helpers/shareholders.js` for use in Cloud Functions.

**10 AM PST rule:** Every draft turn officially starts at 10:00 AM Pacific (DST-aware). `getOfficialStart()` in `shareholders.ts` enforces this. It is a hard business rule.

### Data Flow

```
useBookingRealtime() hook (called in Header on every page)
  ├── onSnapshot("settings/general")  → startDate, isSystemFrozen, bypassTenAM, isTestMode
  └── onSnapshot("bookings")          → allBookings[]
      → calculateDraftSchedule()      → DraftStatus { phase, activePicker, windowEnds, ... }
```

The hook must handle unauthenticated state gracefully — it fires before login because `Header` renders on the login page too.

### Booking Lifecycle

1. Active picker creates booking (`isFinalized: false`) — editable
2. Picker clicks "Finalize" → `isFinalized: true`, `createdAt` resets to now
3. Firestore trigger `onBookingChangeTrigger` fires → sends confirmation email to current user, turn-started email to next user
4. Alternatively: shareholder "Passes" → creates `{type: 'pass'}` record
5. Auto-pass: if window expires, the `autosyncTurnStatus` scheduled function creates `{type: 'auto-pass'}`

### Feature Structure

```
src/features/
  auth/          # AuthContext, ProtectedRoute, AdminRoute, Login, ForgotPassword
  dashboard/     # Shareholder view: ShareholderHero, BookingSection, SeasonSchedule, modals
  admin/         # AdminDashboard with tabs: bookings, users, email testing, system, notifications
  feedback/      # FeedbackModal (sends email)
src/lib/         # Core logic: shareholders.ts, pricing.ts, firebase.ts, utils.ts
src/hooks/       # useBookingRealtime.ts
src/services/    # emailService.ts (calls Cloud Functions)
src/components/  # layout/ (Header, Footer, Layout) and ui/ (BaseModal, ConfirmationModal, etc.)
```

### Admin Features

- Admins auto-redirect to `/admin`
- **Masquerade:** visit `/?masquerade=<shareholderName>` to see dashboard as any shareholder (read-only, shows purple banner)
- Test mode: toggled via `settings/general.isTestMode` in Firestore; wipes DB and sets booking clock to today (test) or April 13, 2026 (production)

### Cloud Functions

All v2. Callables: `sendEmail`, `sendGuestGuideEmail`, `createAccount`, `deleteAccount`, `adminUpdatePassword`, `adminUpdateShareholderEmail`, admin debug/test tools.

Triggers: `onBookingChangeTrigger` (booking writes → emails), `onDraftStatusChange`.

Scheduled: `turnReminderScheduler`, `paymentReminderScheduler`, `autosyncTurnStatus`.

Email transport: Gmail SMTP via nodemailer. Secrets (`GMAIL_USER`, `GMAIL_APP_PASSWORD`, `SUPER_ADMIN_EMAIL`) are Firebase secret parameters, not env vars.

Email templates: 16 HTML templates in `functions/helpers/emailTemplates.js` using Apple-inspired design system (white cards on gray, `#0071e3` blue, system fonts).

### Firestore Rules Key Points

- `bookings` and `settings` are **publicly readable** (no auth required) — the Header component calls `useBookingRealtime()` before the user authenticates
- Admin role is determined by looking up the caller's email in the `shareholders` collection and checking `role == 'admin'` or `role == 'super_admin'`
- Never restrict `bookings` or `settings` reads to `request.auth != null` without refactoring the auth flow

### Pricing

`src/lib/pricing.ts`: Sun–Thu = $100/night, Fri–Sat = $125/night, $100 discount per complete 7-night week.

### UI Patterns

- `cn()` utility (`src/lib/utils.ts`): clsx + tailwind-merge, use for conditional Tailwind classes
- `BaseModal.jsx`: all modals build on this (portal, backdrop, animation)
- `ConfirmationModal` supports `requireTyping` prop for destructive actions (user must type "delete", "wipe database", etc.)
- Destructive admin operations additionally require re-authentication via `ReauthenticationModal`

### Testing

Tests live in `tests/` (Vitest). Current coverage: `pricing.test.ts`, `emailTemplates.test.js`, `shareholders.test.ts`, `utils.test.ts`. See `TEST_PLAN.md` for what's covered and what's intentionally deferred (component/Firebase tests require additional setup).

---

## /run-tests

Execute the testing strategy in `TEST_PLAN.md`.

1. Read `TEST_PLAN.md` — identify any items not marked ✅
2. For each pending item:
   - Create or update the test file
   - Run `npx vitest run tests/<filename>` and iterate until passing
   - Mark the item ✅ in `TEST_PLAN.md`
3. Run `npm test` at the end to confirm all tests pass
