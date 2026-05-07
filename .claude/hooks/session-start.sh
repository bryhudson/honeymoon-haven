#!/bin/bash
set -euo pipefail

# Only run in Claude Code on the web. Local sessions manage their own deps.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"

echo "Installing root npm dependencies..."
cd "$PROJECT_DIR"
npm install --no-audit --no-fund

echo "Installing Cloud Functions npm dependencies..."
cd "$PROJECT_DIR/functions"
npm install --no-audit --no-fund

echo "Session start hook complete."
