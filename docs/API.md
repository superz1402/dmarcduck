# API Reference

Base URL: `/api`. All bodies JSON unless stated. Auth = session cookie
(httpOnly, set by signup/login). Ingestion = capability token in the path.
Cron/webhook = bearer secret / HMAC signature.

## POST /api/analyze  (public, rate-limited 20/min/IP)
The free analyzer. 422 with a human-readable message when no reports found —
the UI shows this text verbatim.
- Request: `multipart/form-data` field `files` (.xml/.zip/.gz, ≤25 files,
  ≤20MB each) — OR raw body `application/xml` / `text/xml`.
- Response 200:
```json
{ "analysis": { "parsedAt", "reportCount", "recordCount", "volume",
    "publishedDomain", "policy": {"p","sp","adkim","aspf","pct"},
    "dateRange": {"begin","end"},
    "dmarcPassVolume", "dmarcFailVolume",
    "sources": [{"ip","volume","dmarc","spf","dkim","headerFrom","orgs",
                 "suspicion","note"}],
    "providers": [{"org","reports","volume"}],
    "warnings": [{"file","reason"}],
    "health": "healthy|attention|critical", "healthReason" },
  "shareId": "nanoid12|null" }
```

## GET /r/[shareId] (page)
Renders a stored analysis. Expires after 7 days (page explains this).

## POST /api/auth/signup  {email, password}  (5/hr/IP)
Creates user + session. 409 uses non-revealing copy.

## POST /api/auth/login  {email, password}  (10/15min/IP)
Uniform 401 for bad email or bad password.

## POST /api/auth/logout — clears session.
## GET  /api/auth/me — {user: {email, plan, domains}} or {user: null}.

## GET /api/domains  (auth)
`{domains: [{id, name, policy, mailboxToken, reportCount}]}`

## POST /api/domains  {name}  (auth, 402 when plan limit hit)
Validates hostname shape; unique per user. Returns domain incl. token.

## GET /api/domains/[id]  (auth, ownership enforced)
Per-domain aggregation (same source-row shape as the analyzer, plus
providers and plan info). Window = plan history days.

## DELETE /api/domains/[id]  (auth, ownership enforced)
Deletes domain + reports (DB cascade). Data is gone; documented.

## POST /api/ingest/[mailboxToken]  (capability URL, 120/hr/token)
Accepts raw XML body or multipart `files`. Skips reports whose
policy_published domain doesn't match the registered domain (logged).
Returns `{ok: true, stored: <rows>}`.

## GET|POST /api/cron/digest  (Authorization: Bearer CRON_SECRET)
Weekly pass: per active-plan domain — weekly digest email (Resend) and
new-source AlertEvent creation (deduped per week).

## POST /api/webhooks/lemonsqueezy  (X-Signature HMAC-SHA256)
Handles order/subscription lifecycle; sets Subscription.status/plan.
503 when unconfigured, 401 on bad signature, unknown emails are logged
and ignored (200 with note).

## GET /api/health  (public)
`{status: "ok"|"degraded", checks: {app, db}, time}` for uptime monitors.
