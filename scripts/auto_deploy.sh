#!/bin/bash

# Configuration
NODE_BIN="/Users/bryanhudson/.gemini/antigravity/scratch/tools/node/bin"
PROJECT_DIR="/Users/bryanhudson/dev/honeymoon-haven"

# Setup Environment
export PATH="$NODE_BIN:$PATH"

echo "=========================================="
echo "🚀 HHR Auto-Deploy & Update"
echo "=========================================="
echo "Using Node: $(which node) ($(node -v))"
echo "Using NPM: $(which npm) ($(npm -v))"
echo ""

# 1. Bump Version
echo "📈 Step 1: Bumping Version..."
node scripts/bump.cjs
if [ $? -ne 0 ]; then
    echo "❌ Version Bump Failed."
    exit 1
fi
echo "✅ Version Bumped."
echo ""

# Get new version
NEW_VERSION=$(node -p "require('./package.json').version")

# 2. Build
echo "🏗️  Step 2: Building Project..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build Failed."
    exit 1
fi
echo "✅ Build Complete."
echo ""

# 3. Deploy
echo "☁️  Step 3: Deploying to Firebase..."
# Using firebase from local node_modules
if [ -f "./node_modules/.bin/firebase" ]; then
    ./node_modules/.bin/firebase deploy
else
    echo "⚠️  Local firebase binary not found. using npx..."
    npx firebase-tools deploy
fi
if [ $? -ne 0 ]; then
    echo "❌ Deployment Failed."
    exit 1
fi
echo "✅ Deployed to Firebase."
echo ""

# 4. Commit & Push
echo "💾 Step 4: Saving to GitHub (v$NEW_VERSION)..."
git add .
git commit -m "Auto-deploy v$NEW_VERSION"
git push origin main
if [ $? -ne 0 ]; then
    echo "❌ Git Push Failed."
    exit 1
fi

echo ""
echo "=========================================="
echo "🎉 SUCCESS! v$NEW_VERSION is Live."
echo "=========================================="
