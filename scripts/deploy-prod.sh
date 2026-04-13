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
read -p "Type 'deploy production' to continue: " CONFIRM

if [ "$CONFIRM" != "deploy production" ]; then
  echo -e "${RED}Aborted.${NC}"
  exit 1
fi

echo -e "${GREEN}Building for production...${NC}"
npm run build

echo -e "${GREEN}Deploying to prod...${NC}"
firebase deploy --project prod

echo -e "${GREEN}✓ Production deploy complete${NC}"
