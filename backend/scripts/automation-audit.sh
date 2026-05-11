#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
API="${BASE_URL%/}/api"
PASS="${PASS:-Admin@123456}"

ts_now() { date +"%H:%M:%S"; }
log() { printf '\n[%s] %s\n' "$(ts_now)" "$*"; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || { echo "Missing required command: $1"; exit 1; }
}

require_cmd curl
require_cmd python3

json_get() {
  local key="$1"
  python3 - "$key" <<'PY'
import json, sys
key = sys.argv[1]
try:
    obj = json.load(sys.stdin)
except Exception:
    print("")
    raise SystemExit(0)
print(obj.get(key, ""))
PY
}

http_code() {
  local method="$1" url="$2" token="${3:-}" body="${4:-}"
  local out="/tmp/automation_audit_$$.out"
  if [[ -n "$token" && -n "$body" ]]; then
    curl -sS -o "$out" -w "%{http_code}" -X "$method" "$url" \
      -H "Authorization: Bearer $token" -H "Content-Type: application/json" -d "$body"
  elif [[ -n "$token" ]]; then
    curl -sS -o "$out" -w "%{http_code}" -X "$method" "$url" \
      -H "Authorization: Bearer $token"
  elif [[ -n "$body" ]]; then
    curl -sS -o "$out" -w "%{http_code}" -X "$method" "$url" \
      -H "Content-Type: application/json" -d "$body"
  else
    curl -sS -o "$out" -w "%{http_code}" -X "$method" "$url"
  fi
}

get_json() {
  local url="$1" token="${2:-}"
  if [[ -n "$token" ]]; then
    curl -sS "$url" -H "Authorization: Bearer $token"
  else
    curl -sS "$url"
  fi
}

post_json() {
  local url="$1" body="$2" token="${3:-}"
  if [[ -n "$token" ]]; then
    curl -sS -X POST "$url" -H "Authorization: Bearer $token" -H "Content-Type: application/json" -d "$body"
  else
    curl -sS -X POST "$url" -H "Content-Type: application/json" -d "$body"
  fi
}

patch_json() {
  local url="$1" body="$2" token="${3:-}"
  curl -sS -X PATCH "$url" -H "Authorization: Bearer $token" -H "Content-Type: application/json" -d "$body"
}

median3() {
  local url="$1" token="$2"
  {
    curl -s -o /dev/null -w "%{time_total}\n" "$url" -H "Authorization: Bearer $token"
    curl -s -o /dev/null -w "%{time_total}\n" "$url" -H "Authorization: Bearer $token"
    curl -s -o /dev/null -w "%{time_total}\n" "$url" -H "Authorization: Bearer $token"
  } | python3 - <<'PY'
import sys
vals=[float(x.strip()) for x in sys.stdin if x.strip()]
vals.sort()
print(vals[len(vals)//2] if vals else 0)
PY
}

log "Checking API availability"
curl -sS -o /tmp/automation_audit_health.json -w "%{http_code}" "$BASE_URL/health" | grep -q "^200$" || {
  echo "❌ Backend health check failed at $BASE_URL/health"
  exit 1
}

RUN_ID="$(date +%s)"
A1_EMAIL="auto.audit.a1.${RUN_ID}@example.com"
A2_EMAIL="auto.audit.a2.${RUN_ID}@example.com"
A1_ORG="Auto Audit Org One ${RUN_ID}"
A2_ORG="Auto Audit Org Two ${RUN_ID}"

RULE_ID=""
JOB_ID=""

cleanup() {
  if [[ -n "${A1_TOKEN:-}" && -n "$RULE_ID" ]]; then
    http_code DELETE "$API/automation/rules/$RULE_ID" "$A1_TOKEN" >/dev/null || true
  fi
  if [[ -n "${A1_TOKEN:-}" && -n "$JOB_ID" ]]; then
    http_code DELETE "$API/automation/scheduled/$JOB_ID" "$A1_TOKEN" >/dev/null || true
  fi
}
trap cleanup EXIT

log "Creating demo admins"
post_json "$API/auth/signup" "{\"name\":\"Auto Audit A1\",\"email\":\"$A1_EMAIL\",\"password\":\"$PASS\",\"role\":\"admin\",\"organizationName\":\"$A1_ORG\"}" >/tmp/automation_a1_signup.json
post_json "$API/auth/signup" "{\"name\":\"Auto Audit A2\",\"email\":\"$A2_EMAIL\",\"password\":\"$PASS\",\"role\":\"admin\",\"organizationName\":\"$A2_ORG\"}" >/tmp/automation_a2_signup.json

log "Logging in demo admins"
A1_TOKEN="$(post_json "$API/auth/login" "{\"email\":\"$A1_EMAIL\",\"password\":\"$PASS\"}" | json_get "accessToken")"
A2_TOKEN="$(post_json "$API/auth/login" "{\"email\":\"$A2_EMAIL\",\"password\":\"$PASS\"}" | json_get "accessToken")"
[[ -n "$A1_TOKEN" && -n "$A2_TOKEN" ]] || { echo "❌ Failed to obtain tokens"; exit 1; }

log "Rules CRUD + isolation"
RULE_CREATE="$(post_json "$API/automation/rules" \
  '{"name":"AUTO_AUDIT_RULE","description":"automation audit rule","trigger":"lead_created","conditions":[],"actions":[{"type":"create_task","config":{"title":"audit task"}}],"isActive":true,"priority":5}' \
  "$A1_TOKEN")"
RULE_ID="$(printf "%s" "$RULE_CREATE" | json_get "id")"
[[ -n "$RULE_ID" ]] || { echo "❌ Failed to create rule"; exit 1; }

RULE_GET_A1="$(http_code GET "$API/automation/rules/$RULE_ID" "$A1_TOKEN")"
RULE_PATCH_A1="$(http_code PATCH "$API/automation/rules/$RULE_ID" "$A1_TOKEN" '{"name":"AUTO_AUDIT_RULE_UPDATED"}')"
RULE_TOGGLE_A1="$(http_code POST "$API/automation/rules/$RULE_ID/toggle" "$A1_TOKEN")"

RULE_GET_A2="$(http_code GET "$API/automation/rules/$RULE_ID" "$A2_TOKEN")"
RULE_PATCH_A2="$(http_code PATCH "$API/automation/rules/$RULE_ID" "$A2_TOKEN" '{"name":"x"}')"
RULE_DELETE_A2="$(http_code DELETE "$API/automation/rules/$RULE_ID" "$A2_TOKEN")"

log "Scheduled CRUD + isolation"
SCHED_FOR="$(date -u -d '+30 minutes' +%Y-%m-%dT%H:%M:%SZ)"
JOB_CREATE="$(post_json "$API/automation/scheduled" \
  "{\"jobType\":\"task\",\"name\":\"AUTO_AUDIT_JOB\",\"description\":\"audit job\",\"scheduledFor\":\"$SCHED_FOR\",\"payload\":{\"title\":\"Audit Scheduled Task\"},\"isRecurring\":false}" \
  "$A1_TOKEN")"
JOB_ID="$(printf "%s" "$JOB_CREATE" | json_get "id")"
[[ -n "$JOB_ID" ]] || { echo "❌ Failed to create scheduled job"; exit 1; }

A1_JOBS="$(get_json "$API/automation/scheduled" "$A1_TOKEN" | python3 -c 'import sys,json; print(len(json.load(sys.stdin)))')"
A2_JOBS="$(get_json "$API/automation/scheduled" "$A2_TOKEN" | python3 -c 'import sys,json; print(len(json.load(sys.stdin)))')"

JOB_DELETE_A2="$(http_code DELETE "$API/automation/scheduled/$JOB_ID" "$A2_TOKEN")"
JOB_DELETE_A1="$(http_code DELETE "$API/automation/scheduled/$JOB_ID" "$A1_TOKEN")"
JOB_ID=""

log "Alerts / logs / activities endpoint checks"
ALERTS_STATUS="$(http_code GET "$API/automation/alerts" "$A1_TOKEN")"
ALERT_SUM_STATUS="$(http_code GET "$API/automation/alerts/summary" "$A1_TOKEN")"
LOGS_STATUS="$(http_code GET "$API/automation/logs?limit=10&offset=0" "$A1_TOKEN")"
ACT_STATUS="$(http_code GET "$API/automation/activities?limit=10" "$A1_TOKEN")"

log "Quick performance sampling (median of 3)"
P_RULES="$(median3 "$API/automation/rules" "$A1_TOKEN")"
P_SCHEDULED="$(median3 "$API/automation/scheduled" "$A1_TOKEN")"
P_LOGS="$(median3 "$API/automation/logs?limit=10&offset=0" "$A1_TOKEN")"
P_ALERTS="$(median3 "$API/automation/alerts/summary" "$A1_TOKEN")"

log "Cleanup automation demo data"
RULE_DELETE_A1="$(http_code DELETE "$API/automation/rules/$RULE_ID" "$A1_TOKEN")"
RULE_ID=""

echo ""
echo "=== AUTOMATION AUDIT RESULT ==="
echo "Rule CRUD (A1): GET=$RULE_GET_A1 PATCH=$RULE_PATCH_A1 TOGGLE=$RULE_TOGGLE_A1"
echo "Rule isolation (A2 against A1): GET=$RULE_GET_A2 PATCH=$RULE_PATCH_A2 DELETE=$RULE_DELETE_A2 (expect 404/403)"
echo "Scheduled isolation: A1 jobs=$A1_JOBS, A2 jobs=$A2_JOBS"
echo "Scheduled delete isolation: A2 delete A1 job=$JOB_DELETE_A2 (expect 404/403), A1 delete own job=$JOB_DELETE_A1 (expect 204)"
echo "Automation endpoints status: alerts=$ALERTS_STATUS summary=$ALERT_SUM_STATUS logs=$LOGS_STATUS activities=$ACT_STATUS"
echo "Performance medians (s): rules=$P_RULES scheduled=$P_SCHEDULED logs=$P_LOGS alerts=$P_ALERTS"
echo "Cleanup: rule delete A1=$RULE_DELETE_A1"
echo ""
echo "Demo admin accounts created:"
echo " - $A1_EMAIL"
echo " - $A2_EMAIL"
echo "Note: Accounts are not auto-deleted by API; only automation demo artifacts are cleaned."
