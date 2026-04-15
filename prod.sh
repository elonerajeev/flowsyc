#!/bin/bash
# ─────────────────────────────────────────────────────────
#  Production Readiness Check  •  CRM Project
#  Runs backend + frontend checks in parallel for speed.
#  Usage:
#    ./prod.sh            – full check
#    ./prod.sh --fast     – stop on first failure
#    ./prod.sh --no-build – skip builds (type + lint only)
# ─────────────────────────────────────────────────────────

# -u: error on unset vars  -o pipefail: pipe failures matter
# No -e: we handle every failure ourselves
set -uo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

FAST_FAIL=false
SKIP_BUILD=false
for arg in "$@"; do
  [[ "$arg" == "--fast" ]]     && FAST_FAIL=true || true
  [[ "$arg" == "--no-build" ]] && SKIP_BUILD=true || true
done

PASSED=0; FAILED=0; WARNINGS=0
TMPDIR_LOGS=$(mktemp -d)
trap 'rm -rf "$TMPDIR_LOGS"' EXIT
START_TIME=$(date +%s)

# ── helpers ──────────────────────────────────────────────
pad()         { printf "%-38s" "$1"; }
log_section() { echo ""; echo -e "${CYAN}${BOLD}── $1 ─────────────────────────────────${NC}"; }
log_detail()  { echo -e "       ${YELLOW}↳ $1${NC}"; }

log_ok() {
  echo -e "  ${GREEN}✓${NC}  $(pad "$1") ${GREEN}${2:-}${NC}"
  PASSED=$((PASSED + 1))
}
log_fail() {
  echo -e "  ${RED}✗${NC}  $(pad "$1") ${RED}${2:-FAILED}${NC}"
  FAILED=$((FAILED + 1))
  if $FAST_FAIL; then
    echo -e "\n${RED}Stopped on first failure (--fast).${NC}"
    show_summary
    exit 1
  fi
}
log_warn() {
  echo -e "  ${YELLOW}!${NC}  $(pad "$1") ${YELLOW}${2:-}${NC}"
  WARNINGS=$((WARNINGS + 1))
}

show_log_tail() {
  # show_log_tail FILE MAX_LINES
  local file="$1" max="${2:-10}"
  local total
  total=$(wc -l < "$file" 2>/dev/null || echo 0)
  local show=$(( total < max ? total : max ))
  head -"$show" "$file" | while IFS= read -r line; do log_detail "$line"; done
  if [ "$total" -gt "$max" ]; then
    log_detail "… $((total - max)) more lines — $file"
  fi
}

check_result() {
  # check_result EXIT_CODE LABEL LOG_FILE
  local code="$1" label="$2" logfile="${3:-}"
  if [ "$code" -eq 0 ]; then
    log_ok "$label"
  else
    log_fail "$label"
    [ -n "$logfile" ] && show_log_tail "$logfile" 10
  fi
}

show_summary() {
  local END_TIME ELAPSED
  END_TIME=$(date +%s)
  ELAPSED=$(( END_TIME - START_TIME ))
  echo ""
  echo -e "${CYAN}${BOLD}── SUMMARY ─────────────────────────────${NC}"
  echo -e "  ${GREEN}Passed   : ${PASSED}${NC}"
  echo -e "  ${RED}Failed   : ${FAILED}${NC}"
  if [ "$WARNINGS" -gt 0 ]; then
    echo -e "  ${YELLOW}Warnings : ${WARNINGS}${NC}"
  fi
  echo -e "  ${BLUE}Time     : ${ELAPSED}s${NC}"
  echo ""
  if [ "$FAILED" -eq 0 ]; then
    echo -e "${GREEN}${BOLD}  ✓ ALL CHECKS PASSED — ready for production${NC}"
  else
    echo -e "${RED}${BOLD}  ✗ ${FAILED} CHECK(S) FAILED — fix before deploying${NC}"
  fi
  echo ""
}

# ════════════════════════════════════════════════════════
# 1. PRE-FLIGHT
# ════════════════════════════════════════════════════════
log_section "PRE-FLIGHT"

if command -v node >/dev/null 2>&1; then
  log_ok "Node.js" "$(node --version)"
else
  log_fail "Node.js" "not found"
fi

if command -v npm >/dev/null 2>&1; then
  log_ok "npm" "$(npm --version)"
else
  log_fail "npm" "not found"
fi

if [ -f backend/.env ]; then
  log_ok "backend/.env exists"
else
  log_warn "backend/.env missing" "(may use defaults)"
fi

if [ -f frontend/.env ] || [ -f frontend/.env.local ]; then
  log_ok "frontend .env exists"
else
  log_warn "frontend .env missing" "(optional)"
fi

if [ -d backend/node_modules ]; then
  log_ok "backend node_modules"
else
  log_fail "backend node_modules" "run: cd backend && npm install"
fi

if [ -d frontend/node_modules ]; then
  log_ok "frontend node_modules"
else
  log_fail "frontend node_modules" "run: cd frontend && npm install"
fi

if [ -f backend/prisma/schema.prisma ]; then
  log_ok "Prisma schema found"
else
  log_fail "Prisma schema" "missing"
fi

# ════════════════════════════════════════════════════════
# 2. PARALLEL: TypeScript type checking
# ════════════════════════════════════════════════════════
log_section "TYPE CHECKING (parallel)"

BE_TS_LOG="$TMPDIR_LOGS/be_types.log"
FE_TS_LOG="$TMPDIR_LOGS/fe_types.log"

( cd backend  && npx tsc --noEmit 2>&1 )               > "$BE_TS_LOG" & BE_TS_PID=$!
( cd frontend && npx tsc --noEmit --skipLibCheck 2>&1 ) > "$FE_TS_LOG" & FE_TS_PID=$!

wait $BE_TS_PID; check_result $? "Backend TypeScript"  "$BE_TS_LOG"
wait $FE_TS_PID; check_result $? "Frontend TypeScript" "$FE_TS_LOG"

# ════════════════════════════════════════════════════════
# 3. PARALLEL: Lint
# ════════════════════════════════════════════════════════
log_section "LINTING (parallel)"

BE_LINT_LOG="$TMPDIR_LOGS/be_lint.log"
FE_LINT_LOG="$TMPDIR_LOGS/fe_lint.log"

( cd backend  && npm run lint 2>&1 ) > "$BE_LINT_LOG" & BE_LINT_PID=$!
( cd frontend && npm run lint 2>&1 ) > "$FE_LINT_LOG" & FE_LINT_PID=$!

wait $BE_LINT_PID; check_result $? "Backend lint"  "$BE_LINT_LOG"
wait $FE_LINT_PID; check_result $? "Frontend lint" "$FE_LINT_LOG"

# ════════════════════════════════════════════════════════
# 4. PARALLEL: Build (skippable with --no-build)
# ════════════════════════════════════════════════════════
if $SKIP_BUILD; then
  log_section "BUILD (skipped via --no-build)"
  log_warn "Backend build"  "skipped"
  log_warn "Frontend build" "skipped"
else
  log_section "BUILD (parallel)"

  BE_BUILD_LOG="$TMPDIR_LOGS/be_build.log"
  FE_BUILD_LOG="$TMPDIR_LOGS/fe_build.log"

  ( cd backend  && npm run build 2>&1 ) > "$BE_BUILD_LOG" & BE_BUILD_PID=$!
  ( cd frontend && npm run build 2>&1 ) > "$FE_BUILD_LOG" & FE_BUILD_PID=$!

  wait $BE_BUILD_PID; check_result $? "Backend build"  "$BE_BUILD_LOG"

  wait $FE_BUILD_PID
  FE_EXIT=$?
  if [ "$FE_EXIT" -eq 0 ]; then
    SIZE=$(grep -oE '[0-9.]+ (kB|MB)' "$FE_BUILD_LOG" 2>/dev/null | tail -1 || true)
    log_ok "Frontend build" "${SIZE:+dist ~$SIZE}"
  else
    log_fail "Frontend build"
    show_log_tail "$FE_BUILD_LOG" 12
  fi
fi

# ════════════════════════════════════════════════════════
# 5. SANITY
# ════════════════════════════════════════════════════════
log_section "SANITY"

if ! $SKIP_BUILD; then
  if [ -f backend/dist/server.js ]; then
    log_ok "backend/dist/server.js"
  else
    log_fail "backend/dist/server.js" "build output missing"
  fi
fi

if [ -d backend/node_modules/@prisma/client ]; then
  log_ok "Prisma client generated"
else
  log_warn "Prisma client" "run: npx prisma generate"
fi

SECRET_LEAKS=$(grep -rE "console\.log.*(password|secret|token)" backend/src/ 2>/dev/null | wc -l || true)
if [ "$SECRET_LEAKS" -eq 0 ]; then
  log_ok "No secret leaks in logs"
else
  log_warn "Possible secret leaks" "${SECRET_LEAKS} console.log(s) contain password/secret/token"
fi

# ════════════════════════════════════════════════════════
show_summary

if [ "$FAILED" -gt 0 ]; then exit 1; else exit 0; fi
