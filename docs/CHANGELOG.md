# Changelog

## Unreleased

### Knowledge/state synchronization + validation kickoff (2026-10-07, session 20)

- **No product code changed.** This entry is a documentation synchronization
  pass after the digest workflow shipped: every state doc was re-checked
  against the actual repository and live production, and stale claims were
  corrected.
- **AGENTS.md**: stack table now states the real deployment target
  (Cloudflare Workers via vinext + `PrismaNeonHTTP` + Neon; CI/CD workflows
  listed); new "Post-launch state" section — the phase is USER VALIDATION,
  with explicit do-nots (no D1/Vercel migration without a real blocker, no
  parallel implementations, no infra without a production incident, do not
  break the documented auth contracts) and the known-not-configured list
  (`RESEND_API_KEY`, `LS_SIGNATURE_SECRET` — owner-side accounts, not code
  bugs).
- **README.md**: production status block (live URL + mirror + user-validation
  phase); digest row corrected to deployed/verified with email explicitly
  "not configured"; email-delivery honest limit added; CHANGELOG link fixed
  (was pointing to a nonexistent root file).
- **PRODUCTION_CHECKLIST.md**: the pre-deploy "Deployment — what is ready"
  section marked SUPERSEDED (historical Vercel-era plan); a closing note
  records that the vinext-era gaps (real deploy, live Neon round-trip) and
  cron row were closed the same day; current suite documented as 39/39.
- **ENVIRONMENT.md**: free-tier table now leads with Cloudflare Workers
  (production) vs Vercel (fallback); Resend and Lemon Squeezy rows explicitly
  marked NOT configured (no accounts exist).
- **TESTING.md**: 39/39 total, digest-window boundary tests listed; cron
  endpoint note updated with the production dispatch evidence.
- **ARCHITECTURE.md**: diagram corrected to Workers (was "Next.js (Vercel)"),
  scheduler + CI/CD lines added; rate-limit and Prisma trade-offs reflect the
  Workers reality (per-isolate limiter; HTTPS-only Neon driver).
- **SECURITY.md**: the `x-forwarded-for` rate-limit-keying note now describes
  the Workers context (CF-Connecting-IP is authoritative on Cloudflare;
  first-hop XFF is poisonable — documented one-line fix, deliberately NOT
  changed during the validation phase since no abuse exists).
- **DESIGN_DECISIONS.md** (append-only): D-008 records the deployment-target
  reversal (supersedes D-004's Vercel choice) and D-009 records the phase
  decision (user validation; infrastructure frozen).
- **ROADMAP.md**: phase note (v0.2+ gated on validation evidence); the
  AnalyzeRecord cull marked DONE (shipped via the digest pass); the two
  community refinements (banner small-volume phrasing, ledger completion
  trace) recorded as queued-with-receipts.
- **VALIDATION_LOG.md**: signals #13–17 added (Whirlpool dmarcian-UI
  complaint = first USER REPORT; Shopify/Klaviyo merchant confusion; MSP
  cost-content genre; second shadow-IT sighting + "missing legitimate
  senders" verbatim; Moltbook repeat-engagement status incl. pending comment
  verification); new "Current objective: 3–5 real users" section; planned
  experiments EXP-01/EXP-02 (settlestackresearch, yuigui) opened in the
  DATE/CHANNEL/TARGET/PROBLEM/MESSAGE/RESULT format, both PENDING.
- **CUSTOMER_LANGUAGE.md**: verbatims from the session-20 search pass added
  (marked ●); raw search JSON preserved in the brain repo `product-lab/raw/`.

### Scheduled digest workflow (2026-10-07, session 19)

- **Digests are now scheduled** via `.github/workflows/digest.yml` — Mondays
  09:17 UTC + `workflow_dispatch`, authenticated POST with `CRON_SECRET`
  (repo Actions secret) to the existing `/api/cron/digest`. No new digest
  implementation; the endpoint is the only contract.
- **Idempotent by construction:** the route now records a successful digest
  as an `AlertEvent(type="weekly_digest", emailedAt=now)` and computes the
  digest window as **since the last actually-sent digest, capped at the
  trailing 7 days** (`src/lib/digest-window.ts`). Retries, overlapping runs
  and double triggers cannot duplicate a digest (no new data after the
  marker → volume 0 → no send); failed sends write no marker and retry
  naturally. Workflow-level `concurrency: digest-production` serializes
  runs on top.
- **Tests:** `tests/digest-window.test.ts` (6 boundary tests: no marker,
  recent/old/exactly-7d marker, future-marker clock-skew clamp, window
  inclusivity). Suite: 39/39.
- **Honest state:** without `RESEND_API_KEY` the scheduled run is a green
  no-op (`digestsSent: 0`, no markers) — digests activate the moment the
  Resend key is set on the Worker. Free plan remains digest-less by design
  (`plan.weeklyDigest` is a paid-plan flag).

### Post-revocation deploy verification (2026-10-07, session 18)

- **Token swap verified end-to-end.** The owner revoked the master Cloudflare
  key (confirmed dead: `401 Invalid API Token`) and set a scoped
  **Edit Cloudflare Workers** token as the `CLOUDFLARE_API_TOKEN` repo secret.
  Deploy run 37558440220 (`workflow_dispatch`) + a push-triggered deploy both
  green with it — the git → Actions → Workers pipeline needs nothing else.
  No architecture change.
- **`scripts/production-smoke.sh`** — the ad-hoc deploy smoke suite is now a
  repo script (22 checks: health on both domains, auth/session, domain CRUD +
  402 paywall, ingest + dedupe + honest 422s, cron guard, analyzer/share,
  logout server-side invalidation). One finding while writing it, kept as
  design: `/api/auth/me` returns 200 `{user:null}` for anonymous callers by
  explicit contract; logout destroys the session row AND clears the cookie
  (verified by replaying the original cookie → `{user:null}`).

### Deployed — live in production (2026-10-07)

- **DmarcDuck is live**: https://dmarcduck.ansaribilal.com
  (also https://dmarcduck.ansaribilal1402.workers.dev). Cloudflare Workers +
  Neon Postgres (ap-southeast-1, PG 18). Full smoke suite green against the
  live URL — see `docs/PRODUCTION_CHECKLIST.md` ("LIVE PRODUCTION").
- **CI/CD: git → site.** Push to `main` runs GitHub Actions `deploy.yml`
  (install → `prisma generate` (pg) → `vite build` → `wrangler deploy` →
  `/api/health` smoke). Verified end-to-end (run 37555920987).
  `bootstrap-neon.yml` re-provisions the database idempotently; it talks to
  `console.neon.tech` (`api.neon.tech` no longer resolves) and applies schema
  over the HTTPS SQL endpoint (`scripts/apply_neon_schema.mjs`), because the
  Prisma CLI needs IPv6 first and CI runners are IPv4-only.
- **Three production bugs found and fixed on first deploy** (each verified
  live):
  1. Prisma client on workerd: the default `@prisma/client` entry hardwires
     the native binary engine → "could not locate the Query Engine". New
     `src/lib/prisma-client.ts` imports the generated WASM entry
     (`.prisma/client/wasm.js`, wiring `query_engine_bg.wasm`); the
     `@prisma/client/wasm` exports path is broken in 6.19.3 (missing
     `wasm.mjs`).
  2. Worker secrets are not on `process.env` under vinext: `src/lib/db.ts`
     reads `DATABASE_URL` from `env` on `cloudflare:workers` inside the
     Workers branch (workerd-safe dynamic import + top-level await; Node
     paths unchanged).
  3. `ratelimit.ts` started a `setInterval` at module scope — workerd forbids
     timers in the global scope ("Disallowed operation called within global
     scope"). Cleanup timer is now lazy, started inside the first rate-limit
     check.
- Ingest duplicate detection made runtime-agnostic (structural P2002 /
  unique-violation message check instead of `instanceof` across different
  client runtime classes). Verified live: re-ingest →
  `{stored: 0, duplicatesSkipped: 2}`.
- Custom domain `dmarcduck.ansaribilal.com` attached via the Workers Domains
  API (zone `ansaribilal.com`); workers.dev + observability enabled in
  `wrangler.jsonc`.

### Changed — deployment target: Cloudflare Workers via vinext (build verified)
- **The production build is now vinext** (Cloudflare's Next.js-on-Vite
  runtime; `vite build` → workerd bundle + static assets). `vinext check`
  scored the app **97% compatible, 0 issues** before migration; the full
  build emits all 22 routes (10 pages, 1 layout, 12 route handlers).
- **Measured Worker bundle: 4,691.44 KiB uncompressed / 1,451 KiB gzip**
  (wrangler's own dry-run bundler). Composition: 2,447.7 KiB app JS +
  2,243.8 KiB Prisma WASM query engine. Against Cloudflare's current
  **64 MiB uncompressed** script limit (the old 3 MiB gzip restriction was
  removed in September 2026), that is **~7% of the budget** — no size
  optimization is needed or planned.
- **Postgres on Workers via Prisma driver adapter**: `PrismaNeonHTTP`
  (Neon serverless HTTP driver, pure fetch — no raw TCP, no native engine).
  `prisma/schema.prisma` gained `previewFeatures = ["driverAdapters"]`;
  `src/lib/db.ts` picks the adapter for every Neon URL and for the Workers
  runtime, and keeps the plain native-engine client for local SQLite dev.
- Stack upgrades this required: React/React-DOM 18 → **19.3** (vinext peer;
  also the documented Next 15 App Router path), `@types/react` 19, Vite 8,
  Vitest 2 → **5** (33/33 pass), Tailwind wired through **`@tailwindcss/vite`**
  instead of the PostCSS plugin (the PostCSS route breaks in the
  cloudflare()-configured `rsc` environment: vite's postcss-import cannot
  resolve the bare `@import "tailwindcss"` specifier there).
- New files: `vite.config.ts` (vinext + cloudflare plugin with the required
  `viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] }`),
  `wrangler.jsonc` (worker entry, `nodejs_compat`, static assets binding).
- Scripts: `dev`/`build`/`start` now run vinext (Vite); the Next.js CLI
  remains as `dev:next`/`build:next`/`start:next`, and `deploy:cf` wraps
  `vite build && vinext-cloudflare deploy`. Both deploy targets share one
  source tree; `docs/DEPLOYMENT.md` documents both, Cloudflare first.
- Local verification for this change: `vite build` clean, `tsc --noEmit`
  clean, 33/33 tests, `vite dev` serves 200s on `/`, `/pricing`, `/login`,
  `vinext-cloudflare deploy` pre-flight checks pass (dry-run), wrangler
  dry-run bundling succeeds from the built worker entry.

### Added — RFC 7489 §7.1 external RUA authorization checker (guided compliance)
- New tool page `/tools/dmarc-record` + API `POST /api/tools/rua-check`:
  paste a DMARC record and get the exact authorization TXT records each
  external report destination must publish — the fix for the classic
  "rua is set but reports never arrive" silent failure (receivers are
  REQUIRED to withhold reports until the destination authorizes).
- Optional live verification via DNS-over-HTTPS (Cloudflare, 3s timeout,
  graceful degradation). Distinguishes authorized / missing / wrong-record
  (wildcard or leftover SPF at the same name) / lookup-error — found live
  during testing, so the UI never claims "not published" when a non-DMARC
  TXT actually exists.
- Record parser catches real misconfigurations: missing v/p tags, bad pct,
  strict-alignment advisories, p=none-without-rua advice. Fully unit-tested
  (18 new tests).

### Added — Forwarder detection + sender identities (parser + analyzer)
- Parser now extracts `identifiers.envelope_from`, `auth_results.dkim`
  (domain/selector/result) and `policy_evaluated.reason` — the evidence
  real receivers send and most tools ignore.
- **Forwarder detection with positive evidence only**: receiver reason tags
  (forwarded, trusted_forwarder, mailing_list, alias) or list-shaped
  envelope domains (googlegroups.com, lists.*, mailman…). Failing mail with
  that evidence is labeled `forwarded?` instead of `spoof?` — deliberately
  NO envelope-mismatch heuristic, because a spammer's own envelope looks
  identical to a forwarder's; without positive evidence suspicion is NOT
  downgraded, the envelope is mentioned in the note instead.
- **Sender identities view**: same traffic grouped by header_from +
  envelope_from pairs ("who is sending as me") alongside the IP view, with
  distinct-IP counts and identity-level notes.

### Changed — Ingestion ledger v2: acceptance ≠ inclusion
- `Report` rows now carry the `IngestionEvent` id that delivered them; the
  event is created BEFORE storing (rows stored when the ledger itself fails
  are honestly reported as unattributed, never guessed).
- The domain dashboard ledger now answers the question @settlestackresearch
  posed on Moltbook: **ingestion acceptance is not aggregate inclusion**.
  Each event shows how many of its records are IN the current plan window,
  how many are stored outside it, and unattributable rows show
  "inclusion: unknown" explicitly instead of an inferred number.
- Domain detail sources table gains an "Envelope from" column.
- Prisma schema (pg + sqlite): `Report.eventId`, `Report.envelopeFrom`,
  `Report.dkimAuth`, `Report.reasons`; index on `eventId`. Schema push is
  part of the deployment runbook (docs/DEPLOYMENT.md).
- Ingest route restructured: ledger event opened before storage, finalized
  after; ledger failures still never fail ingestion.
- UI system: forbid-list adopted from the critique round (no gradients,
  no emoji icons, no cards inside cards, one loud element per screen).

### Changed — Guided analysis notes (start of the differentiator)
- "What this means" per source no longer says one line for every passing
  source. Passing sources now explain WHICH mechanism carried the mail and
  what to harden next: SPF-only (fix DKIM), DKIM-only (add sender to SPF),
  mixed (check signing consistency), or fully aligned.
- Domain detail explains "stored but outside window": reports older than the
  plan's history window are announced with their count and latest date
  instead of a misleading empty state (found during the screenshot audit).
- Dashboard pluralization fix ("1 stored report row").

### Changed — Ingestion Ledger (no more silent failures)
- **Every ingestion attempt now writes a durable `IngestionEvent`**: status
  (processed / partial / rejected), files received, reports parsed, records
  stored, duplicates skipped, mismatched reports refused, and per-file reject
  reasons. The domain dashboard shows the last 10 attempts as "Report
  ingestion activity" — a user never has to wonder whether their report
  arrived and what happened to it.
- **Cross-request dedupe**: `Report` gained a UNIQUE (domain, reportId,
  sourceIp, window, count) constraint; re-sent reports increment
  `duplicatesSkipped` instead of double-counting email volume.
- **Honest failure codes from ingestion**: garbage payloads now return `422
  {error, event}` (permanent failure — senders should not retry) instead of
  `200 {stored: 0}`; multipart with no `files` field returns `400` instead of
  a silent success.
- Ingestion raw-body and per-file 20 MB caps (matching the analyzer).
- New fixture-derived smoke checks: domain-matched ingestion, duplicate
  re-send, mismatched-domain refusal, ledger assertions (51/51).

## 0.1.0 — 2026-10-06
First build. The wedge, end to end.

### Added
- Free analyzer: XML / ZIP / GZ upload → plain-language dashboard
  (volume, pass rate, source-by-source verdicts with suspicion notes,
  provider rollup, policy guidance, parsing warnings).
- Shareable analysis links with 7-day honest expiry.
- Accounts (email + bcrypt + DB sessions), plan entitlements
  (Free / Starter $7 / Studio $19) with Lemon Squeezy webhook (HMAC-verified).
- Domain monitoring: registration, private capability-URL ingestion,
  per-domain dashboard (sources, providers, pass rate, 2000-row window).
- Weekly digest + new-source alerts via Resend (logged-not-sent fallback).
- Cron endpoint (secret-guarded) for Vercel Cron / GitHub Actions.
- Health endpoint; structured JSON logging; rate limits on public writes.
- Docs: architecture, PRD, UI system, API, DB, deployment, environment,
  security, testing, development, roadmap + AGENTS.md for coding agents.
- Tests: 12 fixture-based parser/aggregation tests (Google/Yahoo/Outlook
  shapes, zip/gz, concatenated docs, junk handling, health scoring).
