#!/bin/bash
set -e

GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${GREEN}Building for development (dev Firebase project)...${NC}"
npx vite build --mode development
node -e "require('fs').writeFileSync('dist/meta.json', JSON.stringify({version: require('./package.json').version}))"

echo -e "${GREEN}Deploying to dev...${NC}"
firebase deploy --project dev

echo -e "${GREEN}✓ Dev deploy complete → https://hhr-trailer-booking-dev.web.app${NC}"
