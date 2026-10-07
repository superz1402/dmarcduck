#!/usr/bin/env bash
# DmarcDuck production smoke suite (session 18: post-token-swap deployment test)
# Usage: bash production_smoke.sh [BASE_URL]
# Default BASE: https://dmarcduck.ansaribilal1402.workers.dev
set -u
BASE="${1:-https://dmarcduck.ansaribilal1402.workers.dev}"
CUSTOM="https://dmarcduck.ansaribilal.com"
JAR="$(mktemp)"
TS="$(date +%s)"
EMAIL="smoke-${TS}@example.com"
DOMAIN="smoke-${TS}.example.com"
PW="smokepass-${TS}-long"
FIXDIR="$(cd "$(dirname "$0")/.." && pwd)/tests/fixtures"
PASS=0; FAIL=0

say() { printf '%s\n' "$*"; }
chk() { # chk <name> <expected> <actual>
  if [ "$2" = "$3" ]; then PASS=$((PASS+1)); say "PASS  $1 (got $3)"; else FAIL=$((FAIL+1)); say "FAIL  $1 (want $2, got $3)"; fi
}
jq_get() { python3 -c "import json,sys;d=json.load(sys.stdin);print(eval(sys.argv[1]))" "$1" 2>/dev/null; }

# ---- valid aggregate report for THIS smoke domain (unique id) ----
XML="$(mktemp --suffix=.xml)"
python3 - "$XML" "$DOMAIN" "$TS" <<'PY'
import sys
xml, domain, ts = sys.argv[1], sys.argv[2], sys.argv[3]
begin = int(ts) - 3600
open(xml, "w").write(f"""<feedback>
  <report_metadata>
    <org_name>smoke.test</org_name>
    <email>smoke@smoke.test</email>
    <report_id>SMOKE-{ts}</report_id>
    <date_range><begin>{begin}</begin><end>{begin+3599}</end></date_range>
  </report_metadata>
  <policy_published>
    <domain>{domain}</domain><adkim>r</adkim><aspf>r</aspf><p>none</p><pct>100</pct>
  </policy_published>
  <record>
    <row><source_ip>203.0.113.7</source_ip><count>12</count>
      <policy_evaluated><disposition>none</disposition><dkim>pass</dkim><spf>fail</spf></policy_evaluated>
    </row>
    <identifiers><header_from>{domain}</header_from></identifiers>
    <auth_results><dkim><domain>{domain}</domain><result>pass</result><selector>s1</selector></dkim></auth_results>
  </record>
  <record>
    <row><source_ip>203.0.113.8</source_ip><count>5</count>
      <policy_evaluated><disposition>quarantine</disposition><dkim>fail</dkim><spf>fail</spf></policy_evaluated>
    </row>
    <identifiers><header_from>{domain}</header_from></identifiers>
    <auth_results/>
  </record>
</feedback>""")
PY

say "== 1. Health: workers.dev + custom domain =="
R=$(curl -sS -m 20 "$BASE/api/health"); chk "health workers.dev app" ok "$(echo "$R" | jq_get "d['checks']['app']")"
chk "health workers.dev db" ok "$(echo "$R" | jq_get "d['checks']['db']")"
R=$(curl -sS -m 20 "$CUSTOM/api/health"); chk "health custom domain db" ok "$(echo "$R" | jq_get "d['checks']['db']")"

say "== 2. Signup + session =="
CODE=$(curl -sS -m 20 -o /tmp/sm_signup.json -w "%{http_code}" -c "$JAR" -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\",\"password\":\"$PW\"}" "$BASE/api/auth/signup")
chk "signup 200" 200 "$CODE"
CODE=$(curl -sS -m 20 -o /tmp/sm_me.json -w "%{http_code}" -b "$JAR" "$BASE/api/auth/me")
chk "me with session 200" 200 "$CODE"

say "== 3. Domain CRUD + plan limit =="
CODE=$(curl -sS -m 20 -o /tmp/sm_dom.json -w "%{http_code}" -b "$JAR" -H 'Content-Type: application/json' -d "{\"name\":\"$DOMAIN\"}" "$BASE/api/domains")
chk "create domain 200" 200 "$CODE"
TOKEN=$(cat /tmp/sm_dom.json | jq_get "d['domain']['mailboxToken']")
say "      mailboxToken: ${TOKEN:0:12}..."
CODE=$(curl -sS -m 20 -o /tmp/sm_dom2.json -w "%{http_code}" -b "$JAR" -H 'Content-Type: application/json' -d '{"name":"smoke2-'"$TS"'.example.com"}' "$BASE/api/domains")
chk "2nd domain 402 PLAN_LIMIT" 402 "$CODE"
chk "  plan code" PLAN_LIMIT "$(cat /tmp/sm_dom2.json | jq_get "d['code']")"

say "== 4. Ingest: valid report + dedupe =="
CODE=$(curl -sS -m 30 -o /tmp/sm_ing1.json -w "%{http_code}" -H 'Content-Type: application/xml' --data-binary "@$XML" "$BASE/api/ingest/$TOKEN")
chk "ingest valid 200" 200 "$CODE"
chk "  records stored" 2 "$(cat /tmp/sm_ing1.json | jq_get "d['stored']")"
CODE=$(curl -sS -m 30 -o /tmp/sm_ing2.json -w "%{http_code}" -H 'Content-Type: application/xml' --data-binary "@$XML" "$BASE/api/ingest/$TOKEN")
chk "re-ingest 200" 200 "$CODE"
chk "  duplicates skipped" 2 "$(cat /tmp/sm_ing2.json | jq_get "d['event']['duplicatesSkipped']")"

say "== 5. Ingest: honest rejections =="
CODE=$(curl -sS -m 30 -o /tmp/sm_mis.json -w "%{http_code}" -H 'Content-Type: application/xml' --data-binary "@$FIXDIR/failing-report.xml" "$BASE/api/ingest/$TOKEN")
chk "domain-mismatch 422" 422 "$CODE"
CODE=$(curl -sS -m 30 -o /tmp/sm_junk.json -w "%{http_code}" -H 'Content-Type: application/xml' --data-binary "@$FIXDIR/not-dmarc.xml" "$BASE/api/ingest/$TOKEN")
chk "non-DMARC junk 422" 422 "$CODE"
CODE=$(curl -sS -m 30 -o /dev/null -w "%{http_code}" -H 'Content-Type: application/xml' --data-binary "@$XML" "$BASE/api/ingest/not-a-real-token-xyz")
chk "bad mailbox token 404" 404 "$CODE"

say "== 6. Cron auth =="
CODE=$(curl -sS -m 20 -o /dev/null -w "%{http_code}" "$BASE/api/cron/digest")
chk "cron without secret 401" 401 "$CODE"

say "== 7. Analyzer + share link =="
CODE=$(curl -sS -m 30 -o /tmp/sm_an.json -w "%{http_code}" -F "files=@$FIXDIR/google-report.xml" "$BASE/api/analyze")
chk "analyze 200" 200 "$CODE"
SHARE=$(cat /tmp/sm_an.json | jq_get "d['shareId']")
[ -n "$SHARE" ] && [ "$SHARE" != "None" ] && chk "analyze shareId set" 0 0 || chk "analyze shareId set" 0 1
CODE=$(curl -sS -m 20 -o /dev/null -w "%{http_code}" "$BASE/r/$SHARE")
chk "share page /r/<id> 200" 200 "$CODE"

say "== 8. Logout invalidates session =="
SID=$(grep dd_session "$JAR" | awk '{print $NF}')
CODE=$(curl -sS -m 20 -o /dev/null -w "%{http_code}" -b "$JAR" -c "$JAR" -X POST "$BASE/api/auth/logout")
chk "logout 200" 200 "$CODE"
# Designed contract: me returns 200 {"user":null} for dead sessions.
# Replaying the ORIGINAL cookie must NOT yield a user (session row destroyed).
R=$(curl -sS -m 20 -H "Cookie: dd_session=$SID" "$BASE/api/auth/me")
chk "me after logout: user null" "None" "$(echo "$R" | jq_get "d['user']")"
chk "me after logout 200 (design)" 200 "$(curl -sS -m 20 -o /dev/null -w "%{http_code}" -H "Cookie: dd_session=$SID" "$BASE/api/auth/me")"

say ""
say "RESULT: $PASS passed, $FAIL failed  (base: $BASE)"
rm -f "$JAR" "$XML"
[ "$FAIL" -eq 0 ]
