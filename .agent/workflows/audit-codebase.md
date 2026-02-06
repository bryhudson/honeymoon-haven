---
description: Perform a ruthless architectural and security audit of the HHR project.
---

1.  **Preparation:** Read the `Lead_Architect_Auditor` skill in `.agent/skills/Architect_Auditor/SKILL.md`.
2.  **Structural Discovery:** List all directories in `src/` to identify flattened folder structures and technical debt.
3.  **Component Audit:** Analyze `src/components/` specifically for redundant modal patterns and feature misalignments.
4.  **Security Audit:** Review `firestore.rules`, `storage.rules`, and `firebase.json`.
5.  **Performance Audit:** Review `tailwind.config.js` and `App.jsx` for optimization opportunities.
6.  **Reporting:** Generate a comprehensive audit report in the artifacts directory, including:
    *   Files recommended for deletion.
    *   Proposed refactored directory tree.
    *   Safety-first action plan for execution.
