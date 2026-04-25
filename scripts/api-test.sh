#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
#  API Health Check - CRM Project
#  Tests all API endpoints with proper status codes and error handling
# ═══════════════════════════════════════════════════════════════════════════

set -uo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
MAGENTA='\033[0;35m'

API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"
API_PREFIX="/api"
AUTH_TOKEN=""
ADMIN_TOKEN=""

PASSED=0; FAILED=0; WARNINGS=0; SKIPPED=0
START_TIME=$(date +%s)

# ── helpers ────────────────────────────────────────────────────────────────
pad()         { printf "%-45s" "$1"; }
log_section() { echo ""; echo -e "${CYAN}${BOLD}── $1 ─────────────────────────${NC}"; }
log_cat()     { echo ""; echo -e "${BLUE}${BOLD}  ▸ $1${NC}"; }
log_detail()  { echo -e "       ${YELLOW}↳ $1${NC}"; }

log_ok() {
  echo -e "  ${GREEN}✓${NC}  $(pad "$1") ${GREEN}HTTP $2${NC}"
  PASSED=$((PASSED + 1))
}

log_fail() {
  echo -e "  ${RED}✗${NC}  $(pad "$1") ${RED}HTTP $2${NC}"
  FAILED=$((FAILED + 1))
}

log_warn() {
  echo -e "  ${YELLOW}!${NC}  $(pad "$1") ${YELLOW}$2${NC}"
  WARNINGS=$((WARNINGS + 1))
}

log_skip() {
  echo -e "  ${MAGENTA}⊘${NC}  $(pad "$1") ${MAGENTA}SKIPPED${NC}"
  SKIPPED=$((SKIPPED + 1))
}

# ── HTTP helper ─────────────────────────────────────────────────────────────
# Uses -o /dev/null and -w "%{http_code}" for clean status code capture
http_get() {
  local endpoint="$1"
  local expected="${2:-200}"
  local label="${3:-GET $endpoint}"
  
  local http_code
  http_code=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE_URL$API_PREFIX$endpoint" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" 2>/dev/null)
  
  if [ "$http_code" == "$expected" ]; then
    log_ok "$label" "$http_code"
    return 0
  else
    log_fail "$label" "$http_code"
    log_detail "Expected: $expected, Got: $http_code"
    return 1
  fi
}

http_post() {
  local endpoint="$1"
  local data="$2"
  local expected="${3:-201}"
  local label="${4:-POST $endpoint}"
  
  local http_code
  http_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_BASE_URL$API_PREFIX$endpoint" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$data" 2>/dev/null)
  
  if [ "$http_code" == "$expected" ]; then
    log_ok "$label" "$http_code"
    return 0
  else
    log_fail "$label" "$http_code"
    log_detail "Expected: $expected, Got: $http_code"
    return 1
  fi
}

http_patch() {
  local endpoint="$1"
  local data="$2"
  local expected="${3:-200}"
  local label="${4:-PATCH $endpoint}"
  
  local http_code
  http_code=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$API_BASE_URL$API_PREFIX$endpoint" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$data" 2>/dev/null)
  
  if [ "$http_code" == "$expected" ]; then
    log_ok "$label" "$http_code"
    return 0
  else
    log_fail "$label" "$http_code"
    log_detail "Expected: $expected, Got: $http_code"
    return 1
  fi
}

http_delete() {
  local endpoint="$1"
  local expected="${2:-204}"
  local label="${3:-DELETE $endpoint}"
  
  local http_code
  http_code=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$API_BASE_URL$API_PREFIX$endpoint" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" 2>/dev/null)
  
  if [ "$http_code" == "$expected" ]; then
    log_ok "$label" "$http_code"
    return 0
  else
    log_fail "$label" "$http_code"
    log_detail "Expected: $expected, Got: $http_code"
    return 1
  fi
}

http_get_noauth() {
  local endpoint="$1"
  local expected="${2:-200}"
  local label="${3:-GET $endpoint}"
  
  local http_code
  http_code=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE_URL$API_PREFIX$endpoint" 2>/dev/null)
  
  if [ "$http_code" == "$expected" ]; then
    log_ok "$label" "$http_code"
    return 0
  else
    log_fail "$label" "$http_code"
    log_detail "Expected: $expected, Got: $http_code"
    return 1
  fi
}

# ── Auth Setup ───────────────────────────────────────────────────────────────
setup_auth() {
  echo -e "${CYAN}Setting up authentication...${NC}"
  
  # Try to get existing tokens
  local http_code
  local body
  
  # Try login
  body=$(curl -s -X POST "$API_BASE_URL$API_PREFIX/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@crmpro.com","password":"Password123!"}' 2>/dev/null)
  http_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_BASE_URL$API_PREFIX/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@crmpro.com","password":"Password123!"}' 2>/dev/null)
  
  if [ "$http_code" == "200" ] || [ "$http_code" == "201" ]; then
    AUTH_TOKEN=$(echo "$body" | grep -o '"accessToken":"[^"]*"' | head -1 | cut -d'"' -f4)
    if [ -n "$AUTH_TOKEN" ]; then
      ADMIN_TOKEN="$AUTH_TOKEN"
      log_ok "Auth Setup" "Login successful"
      return 0
    fi
  fi
  
  # Try signup
  body=$(curl -s -X POST "$API_BASE_URL$API_PREFIX/auth/signup" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@api.com","password":"Test123!@#","name":"API Test","role":"admin"}' 2>/dev/null)
  http_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_BASE_URL$API_PREFIX/auth/signup" \
    -H "Content-Type: application/json" \
    -d '{"email":"test@api.com","password":"Test123!@#","name":"API Test","role":"admin"}' 2>/dev/null)
  
  if [ "$http_code" == "201" ]; then
    AUTH_TOKEN=$(echo "$body" | grep -o '"accessToken":"[^"]*"' | head -1 | cut -d'"' -f4)
    if [ -n "$AUTH_TOKEN" ]; then
      ADMIN_TOKEN="$AUTH_TOKEN"
      log_ok "Auth Setup" "Signup successful"
      return 0
    fi
  fi
  
  log_warn "Auth Setup" "Using unauthenticated mode (some tests will be skipped)"
  AUTH_TOKEN=""
  return 1
}

# ── 1. DASHBOARD ────────────────────────────────────────────────────────────
test_dashboard() {
  log_section "1. DASHBOARD"
  if [ -z "$AUTH_TOKEN" ]; then
    log_skip "Dashboard GET /" "No auth"
  else
    http_get "/dashboard"
  fi
}

# ── 2. WORKSPACE ────────────────────────────────────────────────────────────
test_workspace() {
  log_section "2. WORKSPACE"
  
  if [ -z "$AUTH_TOKEN" ]; then
    log_skip "Workspace endpoints" "No auth"
    return
  fi
  
  log_cat "Tasks"
  http_get "/tasks"
  http_get "/tasks?column=todo"
  
  log_cat "Projects"
  http_get "/projects"
  http_get "/projects?status=active"
  
  log_cat "Calendar"
  http_get "/calendar"
}

# ── 3. CRM ──────────────────────────────────────────────────────────────────
test_crm() {
  log_section "3. CRM"
  
  if [ -z "$AUTH_TOKEN" ]; then
    log_skip "CRM endpoints" "No auth"
    return
  fi
  
  log_cat "Leads"
  http_get "/leads"
  http_get "/leads?limit=10"
  http_get "/leads/filters/hot"
  http_get "/leads/filters/cold"
  
  log_cat "Clients"
  http_get "/clients"
  http_get "/clients/pipeline"
  
  log_cat "Deals"
  http_get "/deals"
  
  log_cat "Contacts"
  http_get "/contacts"
}

# ── 4. HIRING ──────────────────────────────────────────────────────────────
test_hiring() {
  log_section "4. HIRING"
  
  if [ -z "$AUTH_TOKEN" ]; then
    log_skip "Hiring endpoints" "No auth"
    return
  fi
  
  log_cat "Jobs"
  http_get "/hiring"
  
  log_cat "Candidates"
  http_get "/candidates"
}

# ── 5. TEAMS ────────────────────────────────────────────────────────────────
test_teams() {
  log_section "5. TEAMS"
  
  if [ -z "$AUTH_TOKEN" ]; then
    log_skip "Teams endpoints" "No auth"
    return
  fi
  
  log_cat "Teams"
  http_get "/teams"
  
  log_cat "Team Members"
  http_get "/team-members"
  
  log_cat "Attendance"
  http_get "/attendance"
}

# ── 6. FINANCE ──────────────────────────────────────────────────────────────
test_finance() {
  log_section "6. FINANCE"
  
  if [ -z "$AUTH_TOKEN" ]; then
    log_skip "Finance endpoints" "No auth"
    return
  fi
  
  log_cat "Invoices"
  http_get "/invoices"
  
  log_cat "Payroll"
  http_get "/payroll"
}

# ── 7. MEETINGS ─────────────────────────────────────────────────────────────
test_meetings() {
  log_section "7. MEETINGS"
  
  if [ -z "$AUTH_TOKEN" ]; then
    log_skip "Meetings endpoints" "No auth"
    return
  fi
  
  http_get "/meetings"
  http_get "/meetings/upcoming"
}

# ── 8. NOTES ───────────────────────────────────────────────────────────────
test_notes() {
  log_section "8. NOTES"
  
  if [ -z "$AUTH_TOKEN" ]; then
    log_skip "Notes endpoints" "No auth"
    return
  fi
  
  http_get "/notes"
}

# ── 9. SYSTEM ──────────────────────────────────────────────────────────────
test_system() {
  log_section "9. SYSTEM"
  
  if [ -z "$AUTH_TOKEN" ]; then
    log_skip "System endpoints" "No auth"
    return
  fi
  
  log_cat "Preferences"
  http_get "/preferences"
  
  log_cat "Integrations"
  http_get "/system/integrations"
  http_get "/system/theme-previews"
  
  log_cat "Search"
  http_get "/system/search?q=test"
  
  log_cat "Audit"
  http_get "/system/audit"
  
  log_cat "Alerts"
  http_get "/automation/alerts"
  http_get "/automation/alerts/summary"
  
  log_cat "CSV Import"
  http_get "/csv-import"
}

# ── 10. AUTOMATION ──────────────────────────────────────────────────────────
test_automation() {
  log_section "10. AUTOMATION"
  
  if [ -z "$AUTH_TOKEN" ]; then
    log_skip "Automation endpoints" "No auth"
    return
  fi
  
  log_cat "GTM Overview"
  http_get "/automation/gtm/overview"
  
  log_cat "Automation Rules"
  http_get "/automation/rules"
  http_get "/automation/logs"
  http_get "/automation/stats"
  http_get "/automation/scheduled"
  
  log_cat "Activities"
  http_get "/automation/activities"
}

# ── 11. AUTH ────────────────────────────────────────────────────────────────
test_auth() {
  log_section "11. AUTH"
  
  if [ -z "$AUTH_TOKEN" ]; then
    log_skip "GET /auth/me" "No auth"
  else
    http_get "/auth/me"
  fi
  
  # Test invalid login
  local http_code
  http_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_BASE_URL$API_PREFIX/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"invalid@test.com","password":"wrong"}' 2>/dev/null)
  if [ "$http_code" == "401" ] || [ "$http_code" == "400" ]; then
    log_ok "Invalid Login" "$http_code"
  else
    log_warn "Invalid Login" "Got $http_code"
  fi
}

# ── 12. COMMENTS & ATTACHMENTS ─────────────────────────────────────────────
test_comments_attachments() {
  log_section "12. COMMENTS & ATTACHMENTS"
  
  if [ -z "$AUTH_TOKEN" ]; then
    log_skip "Comments endpoints" "No auth"
    return
  fi
  
  http_get "/comments"
  http_get "/attachments"
}

# ── 13. REPORTS ────────────────────────────────────────────────────────────
test_reports() {
  log_section "13. REPORTS"
  
  if [ -z "$AUTH_TOKEN" ]; then
    log_skip "Reports endpoints" "No auth"
    return
  fi
  
  http_get "/reports"
  http_get "/reports/analytics"
}

# ── 14. COMMUNICATION ───────────────────────────────────────────────────────
test_communication() {
  log_section "14. COMMUNICATION"
  
  if [ -z "$AUTH_TOKEN" ]; then
    log_skip "Communication endpoints" "No auth"
    return
  fi
  
  http_get "/conversations"
  http_get "/messages"
}

# ── 15. SALES ────────────────────────────────────────────────────────────────
test_sales() {
  log_section "15. SALES"
  
  if [ -z "$AUTH_TOKEN" ]; then
    log_skip "Sales endpoints" "No auth"
    return
  fi
  
  http_get "/sales-metrics"
}

# ── 16. STATUS CODES ───────────────────────────────────────────────────────
test_status_codes() {
  log_section "16. STATUS CODES VALIDATION"
  
  log_cat "Error Responses"
  
  # Test 401 Unauthorized
  local http_code
  http_code=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE_URL$API_PREFIX/dashboard" 2>/dev/null)
  if [ "$http_code" == "401" ]; then
    log_ok "401 Unauthorized" "$http_code"
  else
    log_warn "401 Unauthorized" "Got $http_code"
  fi
  
  # Test 400 Bad Request
  http_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_BASE_URL$API_PREFIX/auth/login" \
    -H "Content-Type: application/json" -d '{}' 2>/dev/null)
  if [ "$http_code" == "400" ]; then
    log_ok "400 Validation Error" "$http_code"
  else
    log_warn "400 Validation Error" "Got $http_code"
  fi
  
  # Test 404 Not Found
  if [ -n "$AUTH_TOKEN" ]; then
    http_code=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE_URL$API_PREFIX/tasks/999999999" \
      -H "Authorization: Bearer $AUTH_TOKEN" 2>/dev/null)
    if [ "$http_code" == "404" ]; then
      log_ok "404 Not Found" "$http_code"
    else
      log_warn "404 Not Found" "Got $http_code"
    fi
  fi
  
  log_cat "Rate Limiting"
  local rate_limited=0
  for i in {1..20}; do
    http_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_BASE_URL$API_PREFIX/auth/login" \
      -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"test"}' 2>/dev/null)
    if [ "$http_code" == "429" ]; then
      rate_limited=$((rate_limited + 1))
    fi
  done
  
  if [ "$rate_limited" -gt 0 ]; then
    log_ok "Rate Limiting" "Triggered ($rate_limited/20)"
  else
    log_warn "Rate Limiting" "Not triggered"
  fi
}

# ── 17. RESPONSE FORMAT ────────────────────────────────────────────────────
test_response_format() {
  log_section "17. RESPONSE FORMAT"
  
  if [ -z "$AUTH_TOKEN" ]; then
    log_skip "Response format tests" "No auth"
    return
  fi
  
  local body
  
  log_cat "JSON Validation"
  
  body=$(curl -s "$API_BASE_URL$API_PREFIX/dashboard" \
    -H "Authorization: Bearer $AUTH_TOKEN" 2>/dev/null)
  if echo "$body" | grep -qE '^\s*\{' 2>/dev/null; then
    log_ok "Dashboard JSON" "Valid"
  else
    log_warn "Dashboard JSON" "Invalid"
  fi
  
  body=$(curl -s "$API_BASE_URL$API_PREFIX/leads" \
    -H "Authorization: Bearer $AUTH_TOKEN" 2>/dev/null)
  if echo "$body" | grep -qE '(data|\[)' 2>/dev/null; then
    log_ok "Leads JSON" "Valid"
  else
    log_warn "Leads JSON" "Invalid"
  fi
  
  body=$(curl -s "$API_BASE_URL$API_PREFIX/tasks" \
    -H "Authorization: Bearer $AUTH_TOKEN" 2>/dev/null)
  if echo "$body" | grep -qE '(todo|in-progress|done)' 2>/dev/null; then
    log_ok "Tasks JSON" "Valid"
  else
    log_warn "Tasks JSON" "Invalid"
  fi
}

# ── 18. SECURITY HEADERS ──────────────────────────────────────────────────
test_security() {
  log_section "18. SECURITY HEADERS"
  
  local headers
  headers=$(curl -sI "$API_BASE_URL$API_PREFIX/dashboard" 2>/dev/null)
  
  if echo "$headers" | grep -qi "X-Content-Type-Options"; then
    log_ok "X-Content-Type-Options" "Set"
  else
    log_warn "X-Content-Type-Options" "Missing"
  fi
  
  if echo "$headers" | grep -qi "X-Frame-Options"; then
    log_ok "X-Frame-Options" "Set"
  else
    log_warn "X-Frame-Options" "Missing"
  fi
  
  if echo "$headers" | grep -qi "X-XSS-Protection"; then
    log_ok "X-XSS-Protection" "Set"
  else
    log_warn "X-XSS-Protection" "Missing"
  fi
  
  if echo "$headers" | grep -qi "Content-Security-Policy"; then
    log_ok "CSP Header" "Set"
  else
    log_warn "CSP Header" "Missing"
  fi
  
  if echo "$headers" | grep -qi "Strict-Transport-Security"; then
    log_ok "HSTS" "Set"
  else
    log_warn "HSTS" "Missing"
  fi
}

# ── 19. PERFORMANCE ───────────────────────────────────────────────────────
test_performance() {
  log_section "19. PERFORMANCE"
  
  if [ -z "$AUTH_TOKEN" ]; then
    log_skip "Performance tests" "No auth"
    return
  fi
  
  log_cat "Response Times"
  
  local endpoints=("/dashboard" "/tasks" "/projects" "/calendar" "/leads" "/clients")
  
  for endpoint in "${endpoints[@]}"; do
    local start_time=$(date +%s%N)
    curl -s "$API_BASE_URL$API_PREFIX$endpoint" \
      -H "Authorization: Bearer $AUTH_TOKEN" -o /dev/null 2>/dev/null
    local end_time=$(date +%s%N)
    local duration=$(( (end_time - start_time) / 1000000 ))
    
    if [ "$duration" -lt 200 ]; then
      log_ok "GET $endpoint" "${duration}ms"
    elif [ "$duration" -lt 1000 ]; then
      log_warn "GET $endpoint" "${duration}ms"
    else
      log_fail "GET $endpoint" "${duration}ms"
    fi
  done
}

# ── SUMMARY ─────────────────────────────────────────────────────────────────
show_summary() {
  local END_TIME ELAPSED
  END_TIME=$(date +%s)
  ELAPSED=$(( END_TIME - START_TIME ))
  echo ""
  echo -e "${CYAN}${BOLD}── API TEST SUMMARY ────────────────────────${NC}"
  echo -e "  ${GREEN}Passed  : ${PASSED}${NC}"
  echo -e "  ${RED}Failed  : ${FAILED}${NC}"
  echo -e "  ${YELLOW}Warnings: ${WARNINGS}${NC}"
  echo -e "  ${MAGENTA}Skipped : ${SKIPPED}${NC}"
  echo -e "  ${BLUE}Time    : ${ELAPSED}s${NC}"
  echo ""
  
  if [ "$FAILED" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
    echo -e "${GREEN}${BOLD}  ✓ ALL API CHECKS PASSED${NC}"
  elif [ "$FAILED" -eq 0 ]; then
    echo -e "${YELLOW}${BOLD}  ✓ API CHECKS PASSED (${WARNINGS} warnings)${NC}"
  else
    echo -e "${RED}${BOLD}  ✗ ${FAILED} API CHECK(S) FAILED${NC}"
  fi
  
  echo ""
  
  # Output for parent script
  echo "API_PASSED=$PASSED"
  echo "API_FAILED=$FAILED"
  echo "API_WARNINGS=$WARNINGS"
  echo "API_SKIPPED=$SKIPPED"
}

# ══════════════════════════════════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════════════════════════════════

echo ""
echo -e "${CYAN}${BOLD}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}${BOLD}║           API HEALTH CHECK - Focal Point CRM                   ║${NC}"
echo -e "${CYAN}${BOLD}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}API Base URL: ${API_BASE_URL}${NC}"

# Check server availability
echo -e "${BLUE}Checking server...${NC}"
http_code=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE_URL$API_PREFIX/dashboard" 2>/dev/null)
if [ "$http_code" == "200" ] || [ "$http_code" == "401" ]; then
  echo -e "${GREEN}✓ Server is running${NC}"
else
  echo -e "${YELLOW}⚠ Server may not be running ($http_code)${NC}"
  echo -e "${YELLOW}  Tests will run but may fail${NC}"
fi

# Setup authentication
setup_auth

# Run all tests
test_dashboard
test_workspace
test_crm
test_hiring
test_teams
test_finance
test_meetings
test_notes
test_system
test_automation
test_auth
test_comments_attachments
test_reports
test_communication
test_sales
test_status_codes
test_response_format
test_security
test_performance

# Show summary
show_summary

# Exit with appropriate code
if [ "$FAILED" -gt 0 ]; then
  exit 1
else
  exit 0
fi
