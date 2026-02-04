# Workflow: Pre-Flight Production Check

## Trigger
Run this workflow when the user asks for a "Pre-flight check," "Audit," or "Prepare for production."

## Steps

1.  **Context Loading**
    - Read `@firestore.rules`
    - Read `firebase.json`
    - Scan `@src` (focusing on api calls and auth hooks)

2.  **Execute Skill**
    - Invoke the `security_audit` skill on the staged or active files.

3.  **Sanitization Check**
    - Verify that no `console.log` containing user data exists.
    - Verify strict mode is enabled in `vite.config`.

4.  **Report Generation**
    - Output the Audit Report.
    - If Critical issues exist, end with: "⛔️ DEPLOYMENT BLOCKED".
    - If clean, end with: "✅ READY FOR PRODUCTION".
