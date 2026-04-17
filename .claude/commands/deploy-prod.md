---
description: Deploy to production Firebase (hhr-trailer-booking). Requires dev verification first.
argument-hint: "[bump: patch|minor|major|none]"
---

Invoke the `deploy-manager` skill and run the prod deploy.

**Golden rule: dev first.** Do not proceed unless the same change has been verified on `hhr-trailer-booking-dev` (real email received if email changed, UI exercised, no error logs).

1. Confirm dev verification — ask the user explicitly if it is not obvious from context.
2. Run pre-deploy checklist: `git status` clean, `npm run lint`, `npm test`, both `.env.development` and `.env.production` present.
3. Determine bump size from `$ARGUMENTS` (default `patch`). Valid: `patch`, `minor`, `major`, `none`.
4. Execute:
   ```bash
   BUMP=${1:-patch} ./scripts/deploy-prod.sh
   ```
   The script will prompt for typed "deploy production" confirmation.
5. Post-deploy: check footer version at https://hhr-trailer-booking.web.app/#/login and `firebase functions:log -n 20 --project prod` for clean startup (no `535-5.7.8`, no unexpected errors).

Report the released version and paste the release commit SHA.
