# Architecture

## System shape

One Next.js application (App Router) serves marketing pages, the analyzer,
the authenticated dashboard, and the API. No microservices. One deploy unit.

```
                    ┌──────────────────────────────────────────────┐
                    │   Cloudflare Workers (vinext build)          │
  Browser ────────▶ │  /analyze  /r/[id]  /app  /pricing  /docs    │
                    │       ▲            ▲                         │
                    │  /api/analyze    /api/domains[/id]           │
                    │       │            ▲                         │
  Report pipeline ──┼─▶ /api/ingest/[token]                         │
  (CF Email Worker, │       │            ▲                         │
   n8n, cron, curl) │       │            │                         │
                    │  /api/cron/digest ──▶ Resend (digests/alerts) │
                    │  /api/webhooks/lemonsqueezy                  │
                    └──────────┬───────────────────────────────────┘
                               │ Prisma (PrismaNeonHTTP driver)
                        ┌──────▼──────┐
                        │ Neon Postgres│  (prod; SQLite in dev)
                        └─────────────┘

  Scheduler: GitHub Actions digest.yml (Mondays 09:17 UTC + manual dispatch)
  POSTs /api/cron/digest with Bearer CRON_SECRET. CI/CD: deploy.yml on push
  to main → build → wrangler deploy → /api/health smoke.
```

## The two data paths

1. **Stateless-ish analyzer (free wedge).** Files upload to `/api/analyze`,
   parse in-process, aggregate to an `Analysis` object, render client-side.
   A shareable copy is stored with a 7-day expiry (`AnalyzeRecord`) — bounded
   storage, honest expiry, no account required.
2. **Monitoring (paid).** Reports POST to `/api/ingest/[token]` (capability
   URL per domain). Each row lands in `Report`, aggregated on read by
   `/api/domains/[id]`. `/api/cron/digest` runs weekly from GitHub Actions
   (`digest.yml`), sends digests and queues new-source alerts; idempotent
   via the `weekly_digest` AlertEvent marker (since-last-sent window).

## Key trade-offs (and why)

- **Aggregate-on-read, not materialized rollups.** 2000 most-recent rows per
  domain per query is enough for a 1-5 domain operator on free tiers; keeps
  the write path dumb and idempotent-ish. Revisit if p95 exceeds ~200ms.
- **Capability-URL ingestion instead of inbound SMTP.** Real email receiving
  costs money or vendors; a tokenized POST endpoint is free and works with
  Cloudflare Email Routing (free), n8n, GitHub Actions, anything that POSTs.
  Documented pattern, no lock-in.
- **DB sessions over JWT.** Sessions are revocable (logout deletes row),
  simple to reason about, and the user count is small. Cookie is httpOnly,
  SameSite=Lax, Secure in prod.
- **In-memory rate limiting.** Honest about the limit in README. In
  production each Workers isolate has its own map (per-isolate, not
  global) — acceptable until limits are actually evaded. Edge limiting is
  the documented upgrade path, not premature infrastructure.
- **Two Prisma schemas.** SQLite makes local dev zero-setup; Postgres is the
  production provider (Neon, accessed over HTTPS via `PrismaNeonHTTP` — no
  TCP, no native engine on the Worker). The schemas are kept identical apart
  from the provider block. This is a deliberate ergonomic trade-off; if it
  ever drifts, delete the SQLite one and require docker.

## Error handling philosophy

Public endpoints return human-readable error strings (they are shown in the
UI verbatim). Internal failures log one JSON line (`src/lib/log.ts`) and
degrade gracefully (mail not configured → logged; share storage fails →
analysis still returns). The health endpoint checks app + db.

## Security posture summary

Details in `docs/SECURITY.md`. Short version: bcrypt(11), httpOnly session
cookies, uniform auth errors (no account-existence oracle), HMAC-verified
Lemon Squeezy webhook, secret-guarded cron endpoint, capability tokens for
ingestion, security headers via `next.config.mjs`, uploads capped at 20MB
and 25 files, no executable content stored.
