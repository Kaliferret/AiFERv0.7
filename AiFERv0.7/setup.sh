#!/usr/bin/env bash
# setup.sh — One-command install voor AiFER v11
# Usage: ./setup.sh [web|android|ios|all]

set -e

ORANGE='\033[38;5;208m'
GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
BOLD='\033[1m'
NC='\033[0m'

ok() { echo -e "${GREEN}  ✓${NC} $1"; }
warn() { echo -e "${ORANGE}  ⚠${NC} $1"; }
err() { echo -e "${RED}  ✗${NC} $1"; }
step() { echo ""; echo -e "${CYAN}▶${NC} ${BOLD}$1${NC}"; }

MODE="${1:-web}"

echo ""
echo -e "${ORANGE}    🦝${NC}"
echo -e "${BOLD}  AiFER v11 PopOS Setup${NC}"
echo -e "${GRAY}  Mode: ${MODE}${NC}"
echo ""

# Prerequisites
step "Checking prerequisites..."
if ! command -v node &> /dev/null; then
  err "Node.js niet gevonden — install vanaf https://nodejs.org (v18+)"
  exit 1
fi
NODE_V=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_V" -lt 18 ]; then
  err "Node.js v$NODE_V te oud — heb v18+ nodig"
  exit 1
fi
ok "Node.js $(node -v)"
ok "npm $(npm -v)"

# Install
step "Installing dependencies..."
if [ -d "node_modules" ] && [ "$2" != "--force" ]; then
  warn "node_modules bestaat al — skip (gebruik --force voor re-install)"
else
  [ "$2" = "--force" ] && rm -rf node_modules package-lock.json
  npm install --legacy-peer-deps
  ok "Dependencies geïnstalleerd"
fi

# Smoke test build
step "Smoke test: probeer build..."
if npm run build > /tmp/aifer-build.log 2>&1; then
  ok "Build succesvol"
  rm -rf dist
else
  err "Build faalde — laatste 30 regels:"
  echo ""
  tail -30 /tmp/aifer-build.log
  echo ""
  warn "Volledige log: /tmp/aifer-build.log"
  warn "'npm run dev' kan nog steeds werken voor dev mode"
fi

# Android
if [ "$MODE" = "android" ] || [ "$MODE" = "all" ]; then
  step "Android (Capacitor) setup..."
  if [ ! -d "android" ]; then
    npm install --save-dev @capacitor/android @capacitor/cli --legacy-peer-deps
    npx cap add android
    ok "Android platform toegevoegd"
  else
    ok "Android platform bestaat al"
  fi
  npm run build > /tmp/aifer-build.log 2>&1 || warn "Build had issues"
  npx cap sync android && ok "Synced naar Android"
  echo ""
  warn "Volgende stappen:"
  echo "    1. Install Android Studio (https://developer.android.com/studio)"
  echo -e "    2. Run: ${CYAN}npx cap open android${NC}"
fi

# iOS
if [ "$MODE" = "ios" ] || [ "$MODE" = "all" ]; then
  step "iOS (Capacitor) setup..."
  if [[ "$OSTYPE" != "darwin"* ]]; then
    warn "iOS build vereist macOS — skipping"
  else
    if [ ! -d "ios" ]; then
      npm install --save-dev @capacitor/ios --legacy-peer-deps
      npx cap add ios
      ok "iOS platform toegevoegd"
    fi
    npm run build > /tmp/aifer-build.log 2>&1 || warn "Build had issues"
    npx cap sync ios && ok "Synced naar iOS"
    echo ""
    warn "Volgende: ${CYAN}npx cap open ios${NC} (Xcode)"
  fi
fi

# Done
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✓ Setup voltooid${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  Web preview:"
echo -e "    ${CYAN}npm run dev${NC}"
echo ""
echo "  Android (na ./setup.sh android):"
echo -e "    ${CYAN}npx cap open android${NC}"
echo ""
echo -e "${ORANGE}🦝 ga ervoor SEM!${NC}"
echo ""
