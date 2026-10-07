# Production Checklist — DmarcDuck

updated: 2026-10-07 — **LIVE IN PRODUCTION** (Cloudflare Workers + Neon, deployed
via GitHub Actions; see the first section below) · earlier sections record the
local verification history (51/51 checks, screenshot review, vinext build).

**Production URL:** https://dmarcduck.ansaribilal1402.workers.dev

Legend: ✅ verified working · 🔶 code done, needs an external account · ⏳ blocked on owner action

## LIVE PRODUCTION 2026-10-07 (real deploy, real smoke)

Deployed by the agent with owner-provided Cloudflare + Neon API keys. Pipeline:
git push → GitHub Actions (`deploy.yml`: npm ci → prisma generate → vite build →
wrangler deploy → smoke) → live. Neon bootstrap is `bootstrap-neon.yml`
(idempotent, workflow_dispatch). Repo secrets: NEON_API_KEY,
CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, CRON_SECRET, DATABASE_URL.

| Check | Status | Evidence (all against the live URL) |
|---|---|---|
| Worker deployed | ✅ | `dmarcduck` on account ansaribilal1402; version 972840db+ |
| Health | ✅ | `/api/health` → 200 `{"status":"ok","checks":{"app":"ok","db":"ok"}}` |
| Landing / signup / pricing / rua-tool / dashboard | ✅ | all 200 |
| Signup → session → add domain | ✅ | real rows in Neon production DB |
| Ingest real report (google fixture) | ✅ | 200 `{stored: 2, event: processed}` |
| Dedupe on re-ingest | ✅ | 200 `{stored: 0, duplicatesSkipped: 2}` |
| Junk payload | ✅ | 422 + honest `rejected` ledger event with rejects[] |
| Cross-domain report refusal | ✅ | 422 + `mismatchSkipped`, not stored |
| Wrong ingest token | ✅ | 404 |
| Plan limit paywall | ✅ | 2nd domain → 402 PLAN_LIMIT (enforced server-side) |
| Cron guard | ✅ | `/api/cron/digest` without secret → 401 |
| Analyzer + share link | ✅ | analysis JSON + `/r/<id>` → 200 |
| Rate limiting | ✅/🔶 | 429+Retry-After verified locally; on Workers the limiter is per-isolate (inherent; documented in `src/lib/ratelimit.ts` — needs an edge limiter for cross-isolate enforcement) |
| Auto-deploy loop | ✅ | fix commit `492e82c` pushed → Actions run 37555920987 → deployed + smoke, `completed success` |
| Workers logs | ✅ | no exceptions on happy paths (3 production bugs found + fixed: Prisma WASM entry, secrets via `cloudflare:workers`, module-scope timer — see CHANGELOG) |
| Custom domain | ✅ | `dmarcduck.ansaribilal.com` attached via Workers Domains API (zone ansaribilal.com) — `/api/health` green on it |
| **Token swap (post-revocation deploy)** | ✅ | owner revoked the master key and set a scoped **Edit Cloudflare Workers** token as the `CLOUDFLARE_API_TOKEN` repo secret; old master token verified dead (401 Invalid API Token); new token verified by deploy run 37558440220 (`workflow_dispatch`, all steps green) + the push-triggered deploy of the smoke-script commit — pipeline intact, no architecture change |
| **Full smoke suite (repo script)** | ✅ | `scripts/production-smoke.sh` → 22/22 PASS against the live URL (health on both domains, signup/session, domain CRUD, 402 PLAN_LIMIT, ingest+dedupe, mismatch/junk 422, bad token 404, cron 401, analyzer+share, logout destroys session server-side — `me` returns `{user:null}` per design) |
| **Scheduled digest workflow** | ✅ | `.github/workflows/digest.yml` (Mondays 09:17 UTC + dispatch) → authenticated POST to `/api/cron/digest`; idempotency: `weekly_digest` AlertEvent marker written only on successful send, digest window = since-last-sent capped at 7d (`src/lib/digest-window.ts`, 6 unit tests); verified in production (dispatch ×2 → identical `{digestsSent:0}`, no duplicates — honest no-op until `RESEND_API_KEY` is set) |
| Digest emails / billing | 🔶 | unchanged — Resend / Lemon Squeezy accounts still needed |

## Verified in this environment (production build, real requests)

| Component | Status | Evidence |
|---|---|---|
| Production build | ✅ | `next build` clean; 21 routes; typecheck strict; eslint 0 warnings |
| Parser test suite | ✅ | 15/15 (Google/Yahoo/Outlook shapes, zip/gz, concatenated docs, junk, entity guard, bomb guard) |
| Health endpoint | ✅ | `/api/health` → `{app: ok, db: ok}` |
| Landing / analyzer / pricing / auth pages / docs | ✅ | 200 + content on all surfaces |
| Free analyzer (XML/ZIP/GZ → analysis + shareId) | ✅ | raw XML + multipart, share link renders |
| Share links (7-day expiry, honest storage) | ✅ | expired → friendly expiry page; cron now culls expired rows |
| Error handling (malformed XML/ZIP/GZ, empty, 4MB, not-DMARC XML) | ✅ | clear 4xx messages, never 500, never silent |
| Signup → auto-login (bcrypt, httpOnly+Secure+SameSite cookie) | ✅ | cookie flags verified |
| Login / logout / me / wrong-password / duplicate-email | ✅ | uniform errors, no account-existence oracle |
| Plan limits (Free = 1 domain; 402 PLAN_LIMIT on overflow) | ✅ | enforced server-side |
| Domain create + capability ingestion URL | ✅ | token returned, URL copyable |
| Ingestion: raw XML / multipart / domain-matched report | ✅ | `{ok, stored, event}` with ledger |
| Ingestion ledger (IngestionEvent per delivery) | ✅ | processed/partial/rejected + rejects[] surfaced in dashboard UI |
| Cross-request dedupe (UNIQUE constraint) | ✅ | re-send → `stored: 0, duplicatesSkipped: 1` |
| Mismatched-domain report refusal | ✅ | 422 + `mismatchSkipped`, never stored |
| Ownership checks (unauthenticated / cross-user) | ✅ | 401/404, no leaks |
| Rate limits (analyze 20/min, signup 5/hr, login 10/15min, ingest 120/hr) + Retry-After | ✅ | 429 + header verified live |
| Security headers (nosniff, DENY frames, referrer, permissions, HSTS) | ✅ | present on all responses |
| Webhook: signature required, timing-safe compare, 503 when unconfigured, 400 on bad JSON | ✅ | verified live |
| Cron endpoint: secret-guarded (timing-safe), expired-share culling | ✅ | 401 without/with wrong secret |
| Email digests | 🔶 | Resend integration code done; logged-not-sent without key |
| Lemon Squeezy checkout + webhook | 🔶 | webhook fully coded + verified against 503/401 paths; needs LS account + products |
| ZIP/GZ expansion + decompression-bomb caps (20MB/file, 50MB/upload) | ✅ | tested |
| XML entity-declaration rejection (billion-laughs defense) | ✅ | tested |

## Verified in evening session 2026-10-07 (production build, live smoke)

| Component | Status | Evidence |
|---|---|---|
| Parser: auth_results / reasons / envelope_from extraction | ✅ | 18 new unit tests (33/33 total) |
| Forwarder detection (positive evidence only) | ✅ | explicit reason tags + list-shaped envelopes flagged `forwarded?`; spoof shape (unexplained third-party envelope) still `spoof?` — tested both |
| Sender identities grouping (header_from × envelope_from) | ✅ | analyze API verified live: identities grouped, distinct-IP notes |
| §7.1 rua-check API + /tools/dmarc-record page | ✅ | live: external record generated for example.com; DoH verify found=false (unpublished), authorized=true (google.com self-auth record), wrong-record (wildcard SPF) all distinguished |
| Ledger v2: event-first creation + per-event inclusion | ✅ | live E2E: signup→domain→ingest×2 (dedupe)→detail shows inclusion {inWindow:0, outsideWindow:2} for out-of-window report; unattributedRows=0 |
| Mismatch refusal unchanged | ✅ | 422 + ledger event, no storage (re-verified) |
| Schema migration path | ✅ (push) | pg + sqlite schemas carry Report.eventId/envelopeFrom/dkimAuth/reasons; non-destructive push documented in DEPLOYMENT.md |

## Deployment — what is ready, what is missing

> **SUPERSEDED 2026-10-07** — kept as history. This was the pre-deploy
> readiness plan (Vercel-first era). The actual deployment went to
> **Cloudflare Workers + Neon** the same day; see "LIVE PRODUCTION" at the
> top and `docs/DEPLOYMENT.md` for the real runbook. Nothing here is still
> blocked on the owner except Resend (digest email) and Lemon Squeezy
> (billing) accounts.

**Blocked on owner action only** (no credentials exist in this environment):

1. **Vercel account** → import `superz1402/dmarcduck`. If a Vercel token is
   provided instead, deployment can be done from here via `vercel CLI`.
2. **Neon Postgres** → create project, set `DATABASE_URL` (Vercel env var +
   local `npm run db:push:pg` for schema).
3. **`CRON_SECRET`** → any long random string; set in Vercel.
4. Optional now, needed for alerts/digests: **Resend** account →
   `RESEND_API_KEY`, `MAIL_FROM` (domain-verified sender).
5. Optional now, needed for billing: **Lemon Squeezy** store → Starter/Studio
   products + webhook to `/api/webhooks/lemonsqueezy` with
   `LS_SIGNATURE_SECRET`; checkout links carry `custom_data.email`.
6. Domain (optional): point `dmarcduck.<domain>` at the Vercel deployment.

Exact env contract: `docs/ENVIRONMENT.md`. Step-by-step: `docs/DEPLOYMENT.md`.

## Post-deploy smoke (run on the live URL)

1. `/api/health` → 200 ok.
2. Analyzer with `tests/fixtures/google-report.xml` → result + share link.
3. Signup → add domain → `POST /api/ingest/<token>` with a failing report →
   dashboard shows the source + ledger row.
4. Wrong ingest token → 404. Junk payload → 422 with event.
5. Cron without secret → 401.
6. Rate-limit check → 429 + Retry-After after 21 rapid uploads.

## vinext / Cloudflare Workers build (verified 2026-10-07 night)

The deploy target changed to Cloudflare Workers (vinext). Everything below was
executed here, in this environment, before handing the deploy to the owner.

| Check | Status | Evidence |
|---|---|---|
| `vinext check` compatibility scan | ✅ | **97% compatible, 0 issues** (14 supported, 1 cosmetic partial: App Router strict-mode note) |
| vinext production build (`vite build` + cloudflare plugin) | ✅ | clean; all 22 routes emitted (10 pages, 1 layout, 12 route handlers) |
| **Worker bundle size (uncompressed)** | ✅ | **4,691.44 KiB (≈ 4.58 MiB)** / 1,451.00 KiB gzip — wrangler's own dry-run bundler. Composition: 2,447.7 KiB JS + 2,243.8 KiB Prisma WASM engine. **≈ 7% of the 64 MiB uncompressed limit** (3 MiB gzip restriction removed by Cloudflare Sept 2026 — verified) |
| Prisma + Neon on Workers | ✅ | `PrismaNeonHTTP` driver adapter embedded (WASM query engine present in bundle; no native engine, no raw TCP); `driverAdapters` preview feature; local SQLite dev path unchanged |
| Typecheck (strict) | ✅ | `tsc --noEmit` clean after React 18 → 19 upgrade |
| Test suite | ✅ | 33/33 (parser 15, record 18) under Vitest 5 |
| Dev server | ✅ | `vite dev` → 200 on `/`, `/pricing`, `/login` |
| wrangler dry-run bundling | ✅ | bundles the built worker entry end-to-end; upload would be accepted (no size or format errors) |
| `vinext-cloudflare deploy` pre-flight | ✅ | wrangler config + cloudflare plugin + ISR/cache checks all pass (dry-run) |
| Next.js fallback build (`build:next`) | ✅ | still clean on React 19 — both targets share one tree |
| Actual deploy + secrets + custom domain | ⏳ | owner: `wrangler login` → `wrangler secret put …` → `npm run deploy:cf` (runbook: docs/DEPLOYMENT.md) |
| Cron on Workers | 🔶 | external scheduler hits `/api/cron/digest` with Bearer secret (Workers cron triggers need `scheduled()`; revisit when vinext supports it) |

Not yet exercised (honest gaps): a real deploy against a real Cloudflare
account, and a live Neon round-trip from inside the Worker. Both are the
owner-side steps in `docs/DEPLOYMENT.md` Part 2–4; nothing in this repo is
expected to change for them.

> **Update 2026-10-07:** both gaps closed the same day — the deploy and the
> live Neon round-trip happened (see LIVE PRODUCTION above). The "Actual
> deploy + secrets + custom domain ⏳" row and the "Cron on Workers 🔶" row
> below are historical: deploy done, custom domain done, cron shipped as the
> GitHub Actions `digest.yml` workflow (verified). Test suite is now 39/39
> (parser 15, record 18, digest-window 6).
