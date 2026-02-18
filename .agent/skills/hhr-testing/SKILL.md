---
name: hhr-testing
description: Use when adding tests to the HHR codebase, running the test suite, updating TEST_PLAN.md, or deciding what is testable vs. deferred in the Firebase/React stack.
---

# HHR Testing Methodology

## Core Principle

**Only pure functions can be tested.** This project's Vitest setup runs in Node with no jsdom and no Firebase mocks. If code imports Firebase or React, it cannot be imported into a test file as-is.

## What Is and Isn't Testable

| Testable now | Deferred |
|---|---|
| `src/lib/*.ts` pure functions | React components (need jsdom) |
| Extracted validation utilities | Firebase hooks (`useBookingRealtime`) |
| Business logic with no Firebase imports | Cloud Function triggers |
| Email template generators (`functions/helpers/`) | Firebase Auth flows |

## The Extract-Then-Test Pattern

When Firebase-coupled code contains pure sub-logic, **extract it first**:

1. Create `src/lib/<name>.ts` with the pure functions
2. Import and use them in the component (behavior unchanged)
3. Write tests in `tests/<name>.test.ts` importing from `src/lib/`

**Real example:** `AuthAction.jsx` had inline password validation → extracted to `src/lib/authValidation.ts` → tested in `tests/auth.test.ts`.

This is the only viable path to testing logic that lives inside components.

## Test File Conventions

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '../src/lib/myModule';

describe('myFunction', () => {
    describe('valid inputs', () => {
        it('returns null for a valid case', () => {
            expect(myFunction('good')).toBeNull();
        });
    });

    describe('invalid inputs', () => {
        it('returns an error for empty string', () => {
            expect(myFunction('')).toBe('Some error message.');
        });
    });
});
```

- TypeScript preferred, `.test.ts` extension
- `describe` → group; nested `describe` → sub-group; `it` → single assertion
- One behavior per test, descriptive `it()` labels
- Test null/undefined/empty inputs explicitly

## Commands

```bash
npm test                              # Run all tests once
npx vitest run tests/auth.test.ts     # Run a single file
npm run test:watch                    # Watch mode during development
```

## TEST_PLAN.md — Always Update

After adding or changing tests, update `TEST_PLAN.md`:

1. Add a row to the **Test Files Summary** table with file, functions covered, and count
2. Update the **total** at the bottom
3. If coverage of a previously-deferred item improves, update its status note

## Current Coverage (as of Feb 2026)

| File | Functions | Tests |
|---|---|---|
| `tests/pricing.test.ts` | `calculateBookingCost` | 18 |
| `tests/emailTemplates.test.js` | All 16 email templates | 26 |
| `tests/shareholders.test.ts` | `normalizeName`, `getOfficialStart`, `calculateDraftSchedule`, + more | 51 |
| `tests/utils.test.ts` | `cn` | 24 |
| `tests/auth.test.ts` | `validatePasswordReset`, `mapForgotPasswordError`, `validateAuthActionParams` | 24 |

**Total: 143 tests — all passing**
