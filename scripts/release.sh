#!/bin/bash

# release.sh - Automate HHR Deployment & Backup
# Usage: npm run release "Commit Message"

# 1. Check for Commit Message
if [ -z "$1" ]; then
    echo "❌ Error: Missing commit message."
    echo "Usage: npm run release \"Your message here\""
    exit 1
fi

MSG="$1"

echo "=========================================="
echo "🚀 HHR Release Automation"
echo "=========================================="
echo ""

# 1.5 Bump Version
echo "📈 Step 0: Bumping Version..."
node scripts/bump.cjs "$MSG"
if [ $? -ne 0 ]; then
    echo "❌ Version Bump Failed."
    exit 1
fi
echo "✅ Version Jumped!"
echo ""

# 2. Deploy to Firebase
echo "📦 Step 1: Deploying to Firebase..."
npm run deploy
if [ $? -ne 0 ]; then
    echo "❌ Deployment Failed. Aborting."
    exit 1
fi
echo "✅ Deployment Complete!"
echo ""

# 3. Backup to GitHub
echo "💾 Step 2: Backing up to GitHub..."
git add .
git commit -m "$MSG"
git push origin main
if [ $? -ne 0 ]; then
    echo "❌ Git Push Failed."
    exit 1
fi

echo ""
echo "=========================================="
echo "🎉 SUCCESS! Site is Live & Code is Saved."
echo "=========================================="
