---
description: Build and deploy the Honeymoon Haven web application
---

# 🚀 GOLDEN RULE: Deploy Workflow

> [!IMPORTANT]
> **Strict Rule**: We ALWAYS bumping the version, push to Git, and then deploy.
> Never manually run `firebase deploy` without versioning.

// turbo-all

## Step 1: The "One Command" Deployment
We use a unified script that handles:
1.  **Versioning**: Bumps `package.json` version (Patch).
2.  **Building**: Runs `npm run build` (injecting new version).
3.  **Deploying**: Pushes to Firebase Hosting.
4.  **Git Backup**: Commits with your message and pushes to GitHub.

### Command
```bash
npm run release "Your descriptive commit message here"
```

## Step 2: Verify Success
1.  Check terminal for "✅ Version Jumped!"
2.  Check for "✅ Deployment Complete!"
3.  Check for "✅ Success! Site is Live & Code is Saved."

## Troubleshooting
- If the script fails, check the error message.
- Ensure you have a clean working directory (or just use the script, as it stage changes).
- If you need to verify the version, check `package.json` before and after.

## Why this is mandatory
- Ensures `__APP_VERSION__` visible on Shareholder/Admin dashboards is always in sync with the deployed code.
- Guarantees every deployment is backed up to GitHub.