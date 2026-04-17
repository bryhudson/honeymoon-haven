---
description: Execute the testing strategy in TEST_PLAN.md and mark items complete
---

Invoke the `hhr-testing` skill, then execute TEST_PLAN.md:

1. Read `TEST_PLAN.md` and identify any items not marked ✅.
2. For each pending item:
   - Create or update the test file under `tests/`.
   - Run `npx vitest run tests/<filename>` and iterate until passing.
   - Mark the item ✅ in `TEST_PLAN.md`.
3. Run `npm test` at the end to confirm the full suite is green.

Report which items were completed and any that remain deferred (with reason).
