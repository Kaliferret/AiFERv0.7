#!/usr/bin/env bash
# smoke-test.sh — Verify v11 PopOS build compiles
# Usage: ./smoke-test.sh

set -e

ORANGE='\033[38;5;208m'
GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo -e "${ORANGE}🦝${NC} ${BOLD}AiFER v11 Smoke Test${NC}"
echo -e "${GRAY}Checks: file presence → syntax → imports → build${NC}"
echo ""

PASS=0
FAIL=0

ok() { echo -e "${GREEN}  ✓${NC} $1"; PASS=$((PASS + 1)); }
fail() { echo -e "${RED}  ✗${NC} $1"; FAIL=$((FAIL + 1)); }
section() { echo ""; echo -e "${CYAN}▶${NC} ${BOLD}$1${NC}"; }

# ─── File presence ───────────────────────────────────────
section "Phase 1 — UI Foundation"
for f in popos-tokens.js PopShell.jsx popos-primitives.jsx; do
  [ -f "src/components/ui/$f" ] && ok "$f" || fail "$f MISSING"
done

section "Phase 2 — Core Pages"
for f in Dashboard AppLauncher Chat Feed Wallet Profile; do
  if [ -f "src/pages/$f.jsx" ]; then
    grep -q "PopShell" "src/pages/$f.jsx" && ok "$f.jsx (uses PopShell)" || fail "$f.jsx (no PopShell)"
  else
    fail "$f.jsx MISSING"
  fi
done

section "Phase 3 — Ferret Apps"
for f in FerretTasks FerretWeather FerretFitness FerretFiles FerretNotes FerretTerminal FerretMail FerretGallery FerretCalendar FerretMedia; do
  if [ -f "src/pages/$f.jsx" ]; then
    grep -q "PopShell" "src/pages/$f.jsx" && ok "$f.jsx" || fail "$f.jsx (no PopShell)"
  else
    fail "$f.jsx MISSING"
  fi
done

section "Phase 4 — Dashboards"
for f in MLDashboard PhysicsDashboard PredictiveDashboard OptimizationDashboard ValidationDashboard AIFInspector FERCodeV2 MeshNetwork AifMarketplace; do
  if [ -f "src/pages/$f.jsx" ]; then
    grep -q "PopShell" "src/pages/$f.jsx" && ok "$f.jsx" || fail "$f.jsx (no PopShell)"
  else
    fail "$f.jsx MISSING"
  fi
done

# ─── Route registration ────────────────────────────────
section "Route Registration"
for f in AppLauncher FerretTasks FerretWeather FerretFitness FERCodeV2 ValidationDashboard AIFInspector OptimizationDashboard PredictiveDashboard MLDashboard; do
  if grep -q "lazy(() => import(\"./$f\"))" src/pages/index.jsx; then
    ok "/$f route"
  else
    fail "/$f route NOT registered"
  fi
done

# ─── Syntax check ────────────────────────────────────────
section "JSX Syntax (basic)"
JSX_FILES=$(find src/pages src/components/ui -name "*.jsx" -o -name "popos-tokens.js" 2>/dev/null)
SYNTAX_ISSUES=0
for f in $JSX_FILES; do
  open_b=$(grep -o '{' "$f" | wc -l)
  close_b=$(grep -o '}' "$f" | wc -l)
  if [ "$open_b" != "$close_b" ]; then
    fail "$(basename $f): unbalanced braces ($open_b vs $close_b)"
    SYNTAX_ISSUES=$((SYNTAX_ISSUES + 1))
  fi
done
[ $SYNTAX_ISSUES -eq 0 ] && ok "All braces balanced ($(echo "$JSX_FILES" | wc -l) files)"

# ─── Import check ────────────────────────────────────────
section "Import Resolution (PopShell + primitives)"
# Check v11 key targets exist
[ -f "src/components/ui/PopShell.jsx" ] && ok "PopShell.jsx target exists" || fail "PopShell.jsx target MISSING"
[ -f "src/components/ui/popos-primitives.jsx" ] && ok "popos-primitives.jsx target exists" || fail "popos-primitives.jsx target MISSING"
[ -f "src/components/ui/popos-tokens.js" ] && ok "popos-tokens.js target exists" || fail "popos-tokens.js target MISSING"

# ─── npm install check ──────────────────────────────────
section "Build Environment"
if [ -d "node_modules" ]; then
  ok "node_modules present"
  if [ -f "node_modules/.bin/vite" ]; then
    ok "vite installed"
  else
    fail "vite missing — run: npm install --legacy-peer-deps"
  fi
else
  fail "node_modules missing — run: npm install --legacy-peer-deps"
fi

# ─── Real build test ────────────────────────────────────
if [ -f "node_modules/.bin/vite" ]; then
  section "Production Build Test"
  echo -e "${GRAY}  Running vite build... (kan 30-60s duren)${NC}"
  if npm run build > /tmp/aifer-smoke-build.log 2>&1; then
    BUNDLE_SIZE=$(du -sh dist 2>/dev/null | cut -f1)
    ok "Build succesvol! Bundle size: $BUNDLE_SIZE"
    rm -rf dist
  else
    fail "Build FAILED — log:"
    echo ""
    tail -30 /tmp/aifer-smoke-build.log
    echo ""
    echo -e "${ORANGE}Volledige log: /tmp/aifer-smoke-build.log${NC}"
  fi
fi

# ─── Summary ─────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
TOTAL=$((PASS + FAIL))
if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}  ✓ ALL CHECKS PASSED${NC} ($PASS/$TOTAL)"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo -e "  Klaar om te testen: ${CYAN}npm run dev${NC}"
  echo ""
  exit 0
else
  echo -e "${RED}  ✗ $FAIL/$(echo $TOTAL) checks failed${NC}"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  exit 1
fi
