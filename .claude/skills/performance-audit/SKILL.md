---
name: performance-audit
description: Full performance audit checklist for the HHR app covering bundle size, React rendering, Firestore data fetching, and asset hygiene. Use when investigating slow loads, high Firestore costs, or before major deployments.
---

# Performance Audit

## When to Use

- Investigating slow page loads or janky interactions
- Firestore read counts seem high or costs are climbing
- Before a major deployment or after adding significant new features
- Periodic health check (quarterly is reasonable for this app size)

## Audit Checklist

### 1. Bundle Analysis

Run `npm run build` and review the output.

| Check | What to look for |
|---|---|
| Main chunk size | Should stay under 500 kB minified. Currently ~734 kB due to Firebase SDK. |
| Lazy-loaded routes | All route pages use `React.lazy()` in `App.jsx` |
| Static imports in Header | Modals rendered conditionally should be lazy-loaded, not statically imported |
| Unused dependencies | Run `npx depcheck` or grep `src/` for each `dependencies` entry in `package.json` |
| Manual chunks config | `vite.config.js` should have `build.rollupOptions.output.manualChunks` for vendor splitting |

### 2. React Rendering

| Check | What to look for |
|---|---|
| Context value memoization | Every context provider's `value` prop must be wrapped in `useMemo` |
| Shared data hooks | Never call the same realtime hook in multiple components. Use a context provider instead. |
| Derived computations | `calculateDraftSchedule`, `mapOrderToSchedule`, `getShareholderOrder` must be in `useMemo` |
| Return object stability | Custom hooks returning objects should memoize the return value |
| Inline closures as props | Functions passed as props in render should use `useCallback` if the child is memoized |
| List keys | Never use array index as key when list items have stable IDs |
| Timer isolation | Components with `setInterval` (tick counters, countdowns) should be small leaf components |

### 3. Firestore Data Fetching

| Check | What to look for |
|---|---|
| Duplicate listeners | Search for all `onSnapshot` calls. Each collection/doc should have exactly ONE listener app-wide. |
| Listener cleanup | Every `onSnapshot` must have a matching unsubscribe in `useEffect` cleanup |
| Full collection reads | `getDocs(collection(...))` without `where` or `limit` fetches everything. Acceptable for small collections (~12 shareholders), flag for large ones. |
| N+1 queries | Fetching a list then querying details per item. Pass data as props from parent instead. |
| Offline persistence | `firebase.ts` should use `initializeFirestore` with `persistentLocalCache` |
| Error handlers | All `onSnapshot` listeners must have error callbacks to prevent crashes on permission errors |

**Current listener inventory (after March 2026 refactor):**

| Listener | Location | Scope |
|---|---|---|
| `settings/general` | `BookingRealtimeContext.tsx` (shared) | App-wide, single instance |
| `bookings` (ordered by `from`) | `BookingRealtimeContext.tsx` (shared) | App-wide, single instance |
| `status/draftStatus` | `AdminDashboard.jsx` | Admin only |
| `shareholders` (ordered by `cabin`) | `AdminDashboard.jsx` | Admin only |

**Rule: If you need booking or settings data in a new component, consume `useBookingRealtimeContext()` or `useBookingRealtime()`. Never create a new `onSnapshot` listener for `bookings` or `settings/general`.**

### 4. Asset Hygiene

| Check | What to look for |
|---|---|
| Dead images | Files in `src/assets/` or `public/` not imported/referenced anywhere |
| Duplicate assets | Multiple versions of the same file (e.g., `map-v1.png` through `map-v7.png`) |
| Image optimization | Large PNGs that could be WebP/AVIF (only matters if images are user-facing) |
| Font loading | Google Fonts should use `display=swap` and `preconnect` (currently correct) |
| DNS prefetch | Add `<link rel="dns-prefetch">` for `firestore.googleapis.com` and `identitytoolkit.googleapis.com` in `index.html` |

### 5. Network & Caching

| Check | What to look for |
|---|---|
| Firestore persistence | `firebase.ts` uses `persistentLocalCache` with `persistentMultipleTabManager` |
| Cache-friendly chunks | Vendor code in separate chunks so deploys don't invalidate everything |
| Cloud Functions batching | Individual `httpsCallable` calls are fine for user-initiated actions. Flag any loops calling functions. |
| Polling vs realtime | All data should come from `onSnapshot` listeners, not `setInterval` + `getDocs` |

## Output Structure

Produce a prioritized report:

1. **HIGH** - Issues with real cost/reliability impact (duplicate listeners, missing persistence, broken cleanup)
2. **MEDIUM** - Wasted work that compounds (unmemoized computations, missing context sharing)
3. **LOW** - Code hygiene (dead assets, unused deps, missing prefetch hints)
4. **POSITIVE** - Things that are already done right (acknowledge good patterns)

For each finding, include the file path, line number, and a concrete fix.

## Context for This App

This is a private app for ~12 shareholder families. Performance "issues" should be evaluated against that scale:
- Microsecond rendering optimizations are irrelevant
- Firestore read costs and duplicate listeners are real
- Offline persistence matters (resort may have spotty WiFi)
- Bundle size matters less (users visit infrequently, modern connections)
