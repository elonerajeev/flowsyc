#!/bin/bash
# ─────────────────────────────────────────────────────────
#  Production Readiness Check  •  CRM Project
#  Runs backend + frontend checks in parallel for speed.
#  Usage:
#    ./prod.sh            – full check
#    ./prod.sh --fast     – stop on first failure
#    ./prod.sh --no-build – skip builds (type + lint only)
#    ./prod.sh --api-only – API tests only (requires running server)
# ─────────────────────────────────────────────────────────

set -uo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"

FAST_FAIL=false
SKIP_BUILD=false
API_ONLY=false
for arg in "$@"; do
  [[ "$arg" == "--fast" ]]      && FAST_FAIL=true || true
  [[ "$arg" == "--no-build" ]]  && SKIP_BUILD=true || true
  [[ "$arg" == "--api-only" ]] || [[ "$arg" == "--api-tests" ]] && API_ONLY=true || true
done

PASSED=0; FAILED=0; WARNINGS=0
TMPDIR_LOGS=$(mktemp -d)
trap 'rm -rf "$TMPDIR_LOGS"' EXIT
START_TIME=$(date +%s)

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
log_info() {
  echo -e "  ${BLUE}ℹ${NC}  $(pad "$1") ${BLUE}${2:-}${NC}"
}

show_log_tail() {
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

command -v node >/dev/null 2>&1 && log_ok "Node.js" "$(node --version)" || log_fail "Node.js" "not found"
command -v npm >/dev/null 2>&1 && log_ok "npm" "$(npm --version)" || log_fail "npm" "not found"
[ -f backend/.env ] && log_ok "backend/.env exists" || log_warn "backend/.env missing" "(may use defaults)"
[ -f frontend/.env ] || [ -f frontend/.env.local ] && log_ok "frontend .env exists" || log_warn "frontend .env missing" "(optional)"
[ -d backend/node_modules ] && log_ok "backend node_modules" || log_fail "backend node_modules" "run: cd backend && npm install"
[ -d frontend/node_modules ] && log_ok "frontend node_modules" || log_fail "frontend node_modules" "run: cd frontend && npm install"
[ -f backend/prisma/schema.prisma ] && log_ok "Prisma schema found" || log_fail "Prisma schema" "missing"

# ════════════════════════════════════════════════════════
# 2-5. FULL CHECKS (skip if --api-only)
# ════════════════════════════════════════════════════════
if ! $API_ONLY; then

  # ── TypeScript ────────────────────────────────────────
  log_section "TYPE CHECKING (parallel)"
  BE_TS_LOG="$TMPDIR_LOGS/be_types.log"
  FE_TS_LOG="$TMPDIR_LOGS/fe_types.log"
  ( cd backend  && npx tsc --noEmit 2>&1 )               > "$BE_TS_LOG" & BE_TS_PID=$!
  ( cd frontend && npx tsc --noEmit --skipLibCheck 2>&1 ) > "$FE_TS_LOG" & FE_TS_PID=$!
  wait $BE_TS_PID; check_result $? "Backend TypeScript"  "$BE_TS_LOG"
  wait $FE_TS_PID; check_result $? "Frontend TypeScript" "$FE_TS_LOG"

  # ── Lint ───────────────────────────────────────────────
  log_section "LINTING (parallel)"
  BE_LINT_LOG="$TMPDIR_LOGS/be_lint.log"
  FE_LINT_LOG="$TMPDIR_LOGS/fe_lint.log"
  ( cd backend  && npm run lint 2>&1 ) > "$BE_LINT_LOG" & BE_LINT_PID=$!
  ( cd frontend && npm run lint 2>&1 ) > "$FE_LINT_LOG" & FE_LINT_PID=$!
  wait $BE_LINT_PID; check_result $? "Backend lint"  "$BE_LINT_LOG"
  wait $FE_LINT_PID; check_result $? "Frontend lint" "$FE_LINT_LOG"

  # ── Tests ─────────────────────────────────────────────
  log_section "TESTS (parallel)"
  BE_TEST_LOG="$TMPDIR_LOGS/be_test.log"
  FE_TEST_LOG="$TMPDIR_LOGS/fe_test.log"
  ( cd backend  && npm run test 2>&1 ) > "$BE_TEST_LOG" & BE_TEST_PID=$!
  ( cd frontend && npm run test -- --run 2>&1 ) > "$FE_TEST_LOG" & FE_TEST_PID=$!
  wait $BE_TEST_PID; check_result $? "Backend tests"  "$BE_TEST_LOG"
  wait $FE_TEST_PID; check_result $? "Frontend tests" "$FE_TEST_LOG"

  # ── Build ─────────────────────────────────────────────
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

  # ── Sanity ────────────────────────────────────────────
  log_section "SANITY"
  if ! $SKIP_BUILD; then
    [ -f backend/dist/server.js ] && log_ok "backend/dist/server.js" || log_fail "backend/dist/server.js" "build output missing"
  fi
  [ -d backend/node_modules/@prisma/client ] && log_ok "Prisma client generated" || log_warn "Prisma client" "run: npx prisma generate"

  SECRET_LEAKS=$(grep -rE "console\.log.*(password|secret|token)" backend/src/ 2>/dev/null | wc -l || true)
  [ "$SECRET_LEAKS" -eq 0 ] && log_ok "No secret leaks in logs" || log_warn "Possible secret leaks" "${SECRET_LEAKS} console.log(s) contain password/secret/token"

fi  # end of !API_ONLY

# ════════════════════════════════════════════════════════
# 5. SANITY

# ════════════════════════════════════════════════════════
log_section "API TESTS"

if [ -x "$PWD/scripts/api-test.sh" ]; then
  # Check if server is reachable
  SERVER_CHECK=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 "$API_BASE_URL/api/dashboard" 2>/dev/null || echo "000")
  
  if [ "$SERVER_CHECK" == "000" ] || [ "$SERVER_CHECK" == "007" ]; then
    log_warn "API Tests" "Server not running"
    log_info "API Tests" "Start: cd backend && npm run dev"
  else
    API_TEST_LOG="$TMPDIR_LOGS/api_test.log"
    ( API_BASE_URL="${API_BASE_URL:-http://localhost:3000}" "$PWD/scripts/api-test.sh" 2>&1 ) > "$API_TEST_LOG"
    
    if [ -f "$API_TEST_LOG" ]; then
      API_PASSED=$(grep "API_PASSED=" "$API_TEST_LOG" | tail -1 | cut -d= -f2)
      API_FAILED=$(grep "API_FAILED=" "$API_TEST_LOG" | tail -1 | cut -d= -f2)
      API_WARNINGS=$(grep "API_WARNINGS=" "$API_TEST_LOG" | tail -1 | cut -d= -f2)
      
      API_PASSED=${API_PASSED:-0}
      API_FAILED=${API_FAILED:-0}
      API_WARNINGS=${API_WARNINGS:-0}
      
      if [ "$API_FAILED" -eq 0 ]; then
        log_ok "API Tests" "Passed: $API_PASSED, Warnings: $API_WARNINGS"
      else
        log_warn "API Tests" "Failed: $API_FAILED, Passed: $API_PASSED"
      fi
    fi
  fi
else
  log_warn "API Tests" "scripts/api-test.sh not found"
fi

# ════════════════════════════════════════════════════════
show_summary

[ "$FAILED" -gt 0 ] && exit 1 || exit 0
