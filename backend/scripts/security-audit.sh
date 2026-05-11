#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"

A1_EMAIL="${A1_EMAIL:-admin@crm.com}"
A2_EMAIL="${A2_EMAIL:-admin2@crm.com}"
MGR_EMAIL="${MGR_EMAIL:-manager@crm.com}"
EMP_EMAIL="${EMP_EMAIL:-employee@crm.com}"
CLIENT_EMAIL="${CLIENT_EMAIL:-client@crm.com}"
PASSWORD="${PASSWORD:-Admin@123456}"

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

log() { printf "\n[%s] %s\n" "$(date +%H:%M:%S)" "$*"; }
fail() { printf "❌ %s\n" "$*" >&2; exit 1; }
pass() { printf "✅ %s\n" "$*"; }

need() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing dependency: $1"
}

need curl
need python3

login() {
  local email="$1"
  local password="$2"
  local out="$tmp_dir/login-$(echo "$email" | tr '@.' '__').json"
  curl -sS -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$password\"}" > "$out"

  python3 - "$out" <<'PY'
import json,sys
obj=json.load(open(sys.argv[1]))
tok=obj.get("accessToken") or obj.get("token")
if not tok and isinstance(obj.get("data"),dict):
    tok=obj["data"].get("accessToken") or obj["data"].get("token")
if not tok:
    print("")
    sys.exit(0)
print(tok)
PY
}

signup_admin() {
  local name="$1"
  local email="$2"
  local password="$3"
  local org="$4"
  local out="$tmp_dir/signup-$(echo "$email" | tr '@.' '__').json"
  curl -sS -X POST "$BASE_URL/api/auth/signup" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$name\",\"email\":\"$email\",\"password\":\"$password\",\"role\":\"admin\",\"organizationName\":\"$org\"}" > "$out"

  python3 - "$out" <<'PY'
import json,sys
obj=json.load(open(sys.argv[1]))
tok=obj.get("accessToken") or obj.get("token")
if not tok and isinstance(obj.get("data"),dict):
    tok=obj["data"].get("accessToken") or obj["data"].get("token")
if not tok and isinstance(obj.get("user"),dict):
    tok=obj.get("accessToken")
if not tok:
    print("")
    sys.exit(0)
print(tok)
PY
}

api() {
  local token="$1"; shift
  local method="$1"; shift
  local path="$1"; shift
  local body="${1:-}"
  if [[ -n "$body" ]]; then
    curl -sS -X "$method" "$BASE_URL$path" \
      -H "Authorization: Bearer $token" \
      -H "Content-Type: application/json" \
      -d "$body"
  else
    curl -sS -X "$method" "$BASE_URL$path" \
      -H "Authorization: Bearer $token"
  fi
}

api_code() {
  local token="$1"; shift
  local method="$1"; shift
  local path="$1"; shift
  local body="${1:-}"
  if [[ -n "$body" ]]; then
    curl -sS -o /dev/null -w "%{http_code}" -X "$method" "$BASE_URL$path" \
      -H "Authorization: Bearer $token" \
      -H "Content-Type: application/json" \
      -d "$body"
  else
    curl -sS -o /dev/null -w "%{http_code}" -X "$method" "$BASE_URL$path" \
      -H "Authorization: Bearer $token"
  fi
}

extract_ids() {
  local file="$1"
  python3 - "$file" <<'PY'
import json,sys
obj=json.load(open(sys.argv[1]))
arr=None
if isinstance(obj,list):
    arr=obj
elif isinstance(obj,dict):
    if isinstance(obj.get("data"),list): arr=obj["data"]
    elif isinstance(obj.get("leads"),list): arr=obj["leads"]
    elif isinstance(obj.get("items"),list): arr=obj["items"]
if arr is None:
    print("[]")
    sys.exit(0)
ids=[x.get("id") for x in arr if isinstance(x,dict) and "id" in x]
print(json.dumps(ids))
PY
}

overlap_size() {
  local f1="$1"
  local f2="$2"
  python3 - "$f1" "$f2" <<'PY'
import json,sys
a=set(json.loads(open(sys.argv[1]).read()))
b=set(json.loads(open(sys.argv[2]).read()))
print(len(a&b))
PY
}

log "Checking API availability"
curl -sS "$BASE_URL/api/health" >/dev/null || fail "API not reachable at $BASE_URL"

log "Logging in users"
A1_TOKEN="$(login "$A1_EMAIL" "$PASSWORD")"
A2_TOKEN="$(login "$A2_EMAIL" "$PASSWORD")"
MGR_TOKEN="$(login "$MGR_EMAIL" "$PASSWORD" || true)"
EMP_TOKEN="$(login "$EMP_EMAIL" "$PASSWORD" || true)"
CLIENT_TOKEN="$(login "$CLIENT_EMAIL" "$PASSWORD" || true)"

if [[ -z "$A1_TOKEN" || -z "$A2_TOKEN" ]]; then
  ts="$(date +%s)"
  [[ -n "$A1_TOKEN" ]] || A1_EMAIL="audit.a1.${ts}@example.com"
  [[ -n "$A2_TOKEN" ]] || A2_EMAIL="audit.a2.${ts}@example.com"
  [[ -n "$A1_TOKEN" ]] || A1_TOKEN="$(signup_admin "Audit Admin A1" "$A1_EMAIL" "$PASSWORD" "Audit Org A1 ${ts}")"
  [[ -n "$A2_TOKEN" ]] || A2_TOKEN="$(signup_admin "Audit Admin A2" "$A2_EMAIL" "$PASSWORD" "Audit Org A2 ${ts}")"
fi

[[ -n "$A1_TOKEN" ]] || fail "A1 auth failed (login+signup)"
[[ -n "$A2_TOKEN" ]] || fail "A2 auth failed (login+signup)"
pass "Admin tokens acquired"

log "Identity context"
api "$A1_TOKEN" GET "/api/auth/me" > "$tmp_dir/a1-me.json"
api "$A2_TOKEN" GET "/api/auth/me" > "$tmp_dir/a2-me.json"
python3 - "$tmp_dir/a1-me.json" "$tmp_dir/a2-me.json" <<'PY'
import json,sys
def extract(obj):
    if isinstance(obj,dict) and isinstance(obj.get("data"),dict):
        obj=obj["data"]
    if isinstance(obj,dict) and isinstance(obj.get("user"),dict):
        obj=obj["user"]
    if isinstance(obj,dict):
        return obj.get("email"), obj.get("role"), obj.get("organizationId")
    return None,None,None
a1=extract(json.load(open(sys.argv[1])))
a2=extract(json.load(open(sys.argv[2])))
print(f" - A1: email={a1[0]} role={a1[1]} org={a1[2]}")
print(f" - A2: email={a2[0]} role={a2[1]} org={a2[2]}")
print(f" - same_org={a1[2] == a2[2]}")
PY

log "Tenant isolation checks (list overlap should be low/zero across orgs)"
declare -a endpoints=(
  "/api/clients"
  "/api/leads"
  "/api/contacts"
  "/api/deals"
  "/api/projects"
  "/api/tasks"
  "/api/team-members"
  "/api/hiring"
  "/api/candidates"
  "/api/invoices"
)

for ep in "${endpoints[@]}"; do
  f1="$tmp_dir/a1$(echo "$ep" | tr '/' '_').json"
  f2="$tmp_dir/a2$(echo "$ep" | tr '/' '_').json"
  api "$A1_TOKEN" GET "$ep" > "$f1" || true
  api "$A2_TOKEN" GET "$ep" > "$f2" || true
  extract_ids "$f1" > "$f1.ids"
  extract_ids "$f2" > "$f2.ids"
  ov="$(overlap_size "$f1.ids" "$f2.ids")"
  printf " - %s overlap ids: %s\n" "$ep" "$ov"
  if [[ "$ov" != "0" ]]; then
    fail "Isolation breach on $ep (overlap ids: $ov)"
  fi
done

log "Dashboard isolation quick check"
api "$A1_TOKEN" GET "/api/dashboard" > "$tmp_dir/a1-dashboard.json"
api "$A2_TOKEN" GET "/api/dashboard" > "$tmp_dir/a2-dashboard.json"
if ! python3 - "$tmp_dir/a1-dashboard.json" "$tmp_dir/a2-dashboard.json" <<'PY'
import json,sys
a1=json.load(open(sys.argv[1]))
a2=json.load(open(sys.argv[2]))
violations=0
def names(obj,key):
    arr=obj.get(key,[])
    return sorted([x.get("name") for x in arr if isinstance(x,dict) and x.get("name")])
def ids(obj,key):
    arr=obj.get(key,[])
    return sorted([str(x.get("id")) for x in arr if isinstance(x,dict) and x.get("id") is not None])
for key in ("collaborators","focusClients","atRiskClients"):
    s1=set(names(a1,key)); s2=set(names(a2,key))
    i1=set(ids(a1,key)); i2=set(ids(a2,key))
    print(f" - {key} overlap by id: {len(i1&i2)}")
    print(f" - {key} overlap by name: {len(s1&s2)}")
    if (i1 & i2) or (s1 & s2):
        violations += 1
if violations:
    sys.exit(2)
PY
then
  fail "Dashboard isolation breach detected"
fi

log "Cross-admin CRUD abuse test on leads"
LEAD_PAYLOAD='{"firstName":"Isolation","lastName":"Probe","email":"isolation.probe.'$(date +%s)'@example.com","company":"AuditCo","source":"website","status":"new","score":50}'
create_code="$(api_code "$A1_TOKEN" POST "/api/leads" "$LEAD_PAYLOAD")"
[[ "$create_code" == "201" || "$create_code" == "200" ]] || fail "A1 lead create failed with $create_code"

api "$A1_TOKEN" GET "/api/leads?limit=1&page=1&search=Isolation" > "$tmp_dir/a1-created-lead.json"
LEAD_ID="$(python3 - "$tmp_dir/a1-created-lead.json" <<'PY'
import json,sys
obj=json.load(open(sys.argv[1]))
arr=obj.get("data") or obj.get("leads") or []
for x in arr:
    if isinstance(x,dict) and x.get("firstName")=="Isolation":
        print(x.get("id"))
        break
PY
)"
[[ -n "$LEAD_ID" ]] || fail "Could not resolve created lead id"

read_code="$(api_code "$A2_TOKEN" GET "/api/leads/$LEAD_ID")"
update_code="$(api_code "$A2_TOKEN" PATCH "/api/leads/$LEAD_ID" '{"notes":"hijack"}')"
delete_code="$(api_code "$A2_TOKEN" DELETE "/api/leads/$LEAD_ID")"
printf " - A2 read/update/delete A1 lead => %s / %s / %s\n" "$read_code" "$update_code" "$delete_code"
[[ "$read_code" == "403" && "$update_code" == "403" && "$delete_code" == "403" ]] || fail "Cross-admin lead CRUD not blocked"

log "Cross-admin CRUD abuse test on hiring"
JOB_TITLE="Isolation Audit Role $(date +%s)"
JOB_PAYLOAD="{\"title\":\"$JOB_TITLE\",\"department\":\"Security\",\"location\":\"Remote\",\"description\":\"Audit posting\",\"status\":\"open\"}"
job_create_code="$(api_code "$A1_TOKEN" POST "/api/hiring" "$JOB_PAYLOAD")"
[[ "$job_create_code" == "201" || "$job_create_code" == "200" ]] || fail "A1 hiring create failed with $job_create_code"
api "$A1_TOKEN" GET "/api/hiring" > "$tmp_dir/a1-hiring-after-create.json"
JOB_ID="$(python3 - "$tmp_dir/a1-hiring-after-create.json" "$JOB_TITLE" <<'PY'
import json,sys
obj=json.load(open(sys.argv[1]))
title=sys.argv[2]
arr=obj.get("data") if isinstance(obj,dict) else []
for x in arr:
    if isinstance(x,dict) and x.get("title")==title:
        print(x.get("id"))
        break
PY
)"
[[ -n "$JOB_ID" ]] || fail "Could not resolve created hiring job id"
job_read_code="$(api_code "$A2_TOKEN" GET "/api/hiring/$JOB_ID")"
job_update_code="$(api_code "$A2_TOKEN" PATCH "/api/hiring/$JOB_ID" '{"title":"hijack"}')"
job_delete_code="$(api_code "$A2_TOKEN" DELETE "/api/hiring/$JOB_ID")"
printf " - A2 read/update/delete A1 hiring job => %s / %s / %s\n" "$job_read_code" "$job_update_code" "$job_delete_code"
[[ "$job_read_code" == "403" && "$job_update_code" == "403" && "$job_delete_code" == "403" ]] || fail "Cross-admin hiring CRUD not blocked"

log "RBAC checks"
if [[ -n "$EMP_TOKEN" ]]; then
  c1="$(api_code "$EMP_TOKEN" POST "/api/clients" '{"name":"E","email":"e@example.com"}')"
  c2="$(api_code "$EMP_TOKEN" DELETE "/api/invoices/1")"
  printf " - Employee create client: %s (expected 403/401)\n" "$c1"
  printf " - Employee delete invoice: %s (expected 403/401)\n" "$c2"
  [[ "$c1" == "403" || "$c1" == "401" ]] || fail "RBAC breach: employee can create client ($c1)"
  [[ "$c2" == "403" || "$c2" == "401" ]] || fail "RBAC breach: employee can delete invoice ($c2)"
fi

if [[ -n "$CLIENT_TOKEN" ]]; then
  c3="$(api_code "$CLIENT_TOKEN" GET "/api/team-members")"
  c4="$(api_code "$CLIENT_TOKEN" GET "/api/reports")"
  printf " - Client read team-members: %s (expected 403/401)\n" "$c3"
  printf " - Client read reports: %s (expected 403/401)\n" "$c4"
  [[ "$c3" == "403" || "$c3" == "401" ]] || fail "RBAC breach: client can read team-members ($c3)"
  [[ "$c4" == "403" || "$c4" == "401" ]] || fail "RBAC breach: client can read reports ($c4)"
fi

pass "Security audit run complete. Review overlaps and non-403 cross-admin CRUD responses carefully."
