#!/bin/bash
set -e

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${RED}⚠️  PRODUCTION DEPLOY${NC}"
echo -e "${YELLOW}Target: hhr-trailer-booking (LIVE)${NC}"
echo -e "${YELLOW}URL:    https://hhr-trailer-booking.web.app${NC}"
echo ""

# Refuse to deploy a dirty tree — prod must always match git.
if [ -n "$(git status --porcelain)" ]; then
  echo -e "${RED}✗ Working tree is dirty. Commit, stash, or discard before a prod deploy.${NC}"
  echo ""
  git status --short
  exit 1
fi

# Preview next version
CURRENT_VERSION=$(node -p "require('./package.json').version")
NEXT_VERSION=$(node -p "const v=require('./package.json').version.split('.');v[2]=+v[2]+1;v.join('.')")
echo -e "${YELLOW}Version bump: ${CURRENT_VERSION} → ${NEXT_VERSION} (patch)${NC}"
echo -e "${YELLOW}Override with: BUMP=minor|major|none ./scripts/deploy-prod.sh${NC}"
echo ""

read -p "Type 'deploy production' to continue: " CONFIRM

if [ "$CONFIRM" != "deploy production" ]; then
  echo -e "${RED}Aborted.${NC}"
  exit 1
fi

# Bump version (default: patch). Skip with BUMP=none.
BUMP=${BUMP:-patch}
if [ "$BUMP" != "none" ]; then
  echo -e "${GREEN}Bumping ${BUMP} version...${NC}"
  npm version "$BUMP" --no-git-tag-version >/dev/null
  NEW_VERSION=$(node -p "require('./package.json').version")
  git add package.json package-lock.json
  git commit -m "chore: release v${NEW_VERSION}"
  git push
  echo -e "${GREEN}✓ Released v${NEW_VERSION}${NC}"
fi

echo -e "${GREEN}Building for production...${NC}"
npm run build

echo -e "${GREEN}Deploying to prod...${NC}"
firebase deploy --project prod

echo -e "${GREEN}✓ Production deploy complete${NC}"
