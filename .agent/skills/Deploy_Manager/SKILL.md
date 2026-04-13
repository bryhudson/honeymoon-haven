---
name: HHR Deploy Manager
description: Safe, repeatable dev→prod deploys for the HHR Trailer Booking App. Enforces the dev-first workflow, pre/post-flight checks, and rollback guidance for the two isolated Firebase projects.
---

# HHR Deploy Manager

## 🔑 Environment map

| Env  | Firebase project          | URL                                         | Email behavior                          |
|------|---------------------------|---------------------------------------------|-----------------------------------------|
| dev  | `hhr-trailer-booking-dev` | https://hhr-trailer-booking-dev.web.app     | All outbound redirected → `SUPER_ADMIN_EMAIL` |
| prod | `hhr-trailer-booking`     | https://hhr-trailer-booking.web.app/#/login | Live sends to real shareholders         |

Runtime detection:
- Frontend: `VITE_FIREBASE_PROJECT_ID` in `.env.development` / `.env.production` → `src/lib/env.ts` exposes `IS_PROD` / `IS_DEV_ENV`
- Functions: `isProduction()` in `functions/helpers/email.js` checks `process.env.GCLOUD_PROJECT === "hhr-trailer-booking"`

**Never** reintroduce Firestore-based test-mode toggling.

## 🧭 Golden rule

**Dev first. Always.** Never run `deploy-prod.sh` unless the same change has been verified on dev and the app behaved correctly end-to-end.

## ✅ Pre-deploy checklist

Run before either script:

1. `git status` — working tree clean or intentionally staged
2. `npm run lint` — zero errors
3. `npm test` — all Vitest passing
4. `.env.development` and `.env.production` both present (build will white-screen without them)
5. Confirm secrets bound to latest version per project:
   ```bash
   firebase functions:secrets:access GMAIL_EMAIL --project dev
   firebase functions:secrets:access GMAIL_EMAIL --project prod
   ```
   If a secret was rotated, functions must be redeployed to pick up the new version (pinned versions don't auto-update).
6. Bump `package.json` version if shipping user-visible changes (injected as `__APP_VERSION__` for the footer).

## 🚀 Standard flows

### Full dev deploy (hosting + functions)
```bash
./scripts/deploy-dev.sh
```
- Builds with `--mode development`
- Deploys hosting + functions to `hhr-trailer-booking-dev`
- Functions skip if source unchanged

### Full prod deploy
```bash
./scripts/deploy-prod.sh
```
- Prompts for typed "deploy production" confirmation
- Builds with `--mode production`
- Deploys to `hhr-trailer-booking`

### Backend-only (faster, no frontend rebuild)
```bash
firebase deploy --only functions --project dev
firebase deploy --only functions --project prod
```
Use when only `functions/**` changed.

### Single function
```bash
firebase deploy --only functions:turnReminderScheduler --project dev
```

### Hosting-only
```bash
npm run build -- --mode development && firebase deploy --only hosting --project dev
```

## 🔬 Post-deploy verification

After **every** deploy:

1. **Version check** — open the site, confirm footer shows the expected version
2. **Function logs sanity**:
   ```bash
   firebase functions:log -n 20 --project dev
   ```
   Look for `[NON-PROD ENV] Redirecting email ...` on dev and no `535-5.7.8` / `BadCredentials`
3. **Smoke test** the path you changed (login, a booking action, whichever scheduler fired)
4. **For email changes**: trigger the affected email on dev, confirm the redirect log AND the inbox receipt for `bryan.m.hudson@gmail.com`

## 🛑 Deploy blockers — stop and diagnose

- `535-5.7.8 BadCredentials` in logs → Gmail app password invalid; regenerate, `firebase functions:secrets:set GMAIL_APP_PASSWORD`, redeploy
- `Cannot use "undefined" as a Firestore value` → frontend→backend param mismatch, see Email_Auditor skill
- White page on load → missing `.env` file; recover via `firebase apps:sdkconfig web`
- Secret rotated but function still using old value → functions not redeployed after rotation

## 🔙 Rollback

Hosting supports channel rollback:
```bash
firebase hosting:clone <project>:live <project>:live@<VERSION_ID>
```
Find version IDs in the Firebase Hosting console.

For functions, the only safe rollback is `git revert <sha>` → redeploy. There is no one-click rollback for Cloud Functions v2.

## 📋 When to deploy to prod (checklist before typing "deploy production")

- [ ] Change verified on dev (real email received, UI exercised, no error logs)
- [ ] `git status` clean — no unintended files bundled
- [ ] `package.json` version bumped if user-visible
- [ ] No active shareholder turn about to expire (check `draft_status` — avoid racing schedulers mid-deploy)
- [ ] Aware of which secret versions prod functions will bind to

## 💬 Usage

"Using the Deploy Manager skill, push the draft-reminder fix from dev to prod."
→ Assistant runs pre-flight, deploys dev if not already, smoke-tests, then (with confirmation) prod, then post-flight.
