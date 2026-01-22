---
description: Build and deploy the Honeymoon Haven web application
---

# Release & Deploy Workflow

Description: Automates the full HHR release cycle: commits changes, bumps version, deploys to Firebase, and pushes to GitHub.

// turbo-all

## Step 1: Stage All Changes
Add all modified files to git staging.
- Command: `git add -A`

## Step 2: Commit Changes
Commit with a descriptive message. Use the pattern: `feat: <description>` or `fix: <description>`.
- Command: `git commit -m "feat: redesigned shareholder hero banners with modern UI and skipped state support"`
- **Note**: Adjust the message to describe the actual changes made.

## Step 3: Execute Release Script
Run the release script which handles version bumping, building, and deploying to Firebase.
- Command: `npm run release -- "Hero banner redesign + skipped state"`
- **Note**: The message will appear in the version commit and git tag.

## Step 4: Verify Deployment
Check the terminal output to ensure:
- ✅ Version number was incremented
- ✅ Firebase deploy URL is visible
- ✅ GitHub push was successful
- 🎉 Celebrate with the user if successful!

---

## Quick Deploy (Single Command)
If you just want to push to GitHub without a version bump:
1. `git add -A`
2. `git commit -m "feat: <description>"`
3. `git push origin main`