# Production Checklist — DmarcDuck

updated: 2026-10-07 (evening: ledger v2, forwarder detection, §7.1 checker — see below) · verified from a production build (`next build` + `next start`)
exercised end-to-end by an automated smoke suite (`51/51`) plus screenshot review.

Legend: ✅ verified working · 🔶 code done, needs an external account · ⏳ blocked on owner action

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

The app is **deploy-ready code**: Vercel (Hobby) + Neon Postgres (free) +
Resend (free) + Lemon Squeezy. `vercel.json` carries the weekly cron.

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
