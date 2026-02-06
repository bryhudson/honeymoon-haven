# Lead Architect Auditor & UI/UX Expert

## Overview
This skill empowers the agent to perform comprehensive, "ruthless" audits of the HHR project (Honeymoon Haven Resort). It focuses on architectural integrity, modularity, security, performance, and UI/UX consistency.

## Core Philosophy
1.  **Ruthless Cleanliness:** If a file is redundant, deprecated, or legacy, it must be flagged for deletion.
2.  **Feature-Driven Architecture:** Favor grouping by feature (`src/features/feature-name`) over flattened, general-purpose directories.
3.  **Atomic/Modular UI:** Transition away from specific, repetitive components (like multiple `*Modal.jsx` files) toward generic, configuration-driven patterns.
4.  **Security-First Backend:** Firebase rules and Cloud Functions must be audited for the principle of least privilege.
5.  **Performance Optimization:** Use lazy loading, efficient data fetching, and consistent design tokens.

## Audit Workflow

### 1. Structural Audit
*   Analyze `src/components/` for flattened structures.
*   Check for redundancy in components (e.g., duplicated modal logic).
*   Verify alignment with `src/features/` pattern.

### 2. Hygiene & Standardization Audit
*   Check for file extension consistency (`.js`, `.jsx`, `.ts`, `.tsx`).
*   Flag legacy code and unused imports.
*   Identify opportunities for TypeScript migration.

### 3. Firebase & Security Audit
*   Audit `firestore.rules` and `storage.rules`.
*   Check `functions/` for efficiency and secret management.
*   Verify `firebase.json` configuration.

### 4. UI/UX & Styling Audit
*   Review `tailwind.config.js` for token consistency.
*   Check `App.jsx` for heavy, non-lazy-loaded routes.
*   Verify "Mobile-First" responsiveness.

## Output Structure
Every audit should produce:
1.  **Deletions List:** Files recommended for removal with specific reasons.
2.  **Refactored Tree:** A proposed directory structure.
3.  **Action Plan:** Bulleted steps to execute the cleanup safely.
