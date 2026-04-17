---
description: Build and deploy to the dev Firebase project (hhr-trailer-booking-dev)
---

Invoke the `deploy-manager` skill, then run the dev deploy:

1. Confirm working tree is either clean or intentionally staged (`git status`).
2. Run `npm run lint` and `npm test` — stop on any failure.
3. Execute `./scripts/deploy-dev.sh`.
4. Post-deploy: check footer version at https://hhr-trailer-booking-dev.web.app and `firebase functions:log -n 20 --project dev` for the `[NON-PROD ENV] Redirecting email` line.

Report the deployed version and any warnings.
