# Deployment

> ## ✅ DEPLOYED — 2026-10-07
>
> **Live at https://dmarcduck.ansaribilal1402.workers.dev**
>
> Stack actually running: Cloudflare Workers (vinext) + Neon Postgres
> (project `purple-base-78747846`, region ap-southeast-1, PG 18), schema pushed
> (8 tables). Worker secrets `DATABASE_URL` + `CRON_SECRET` are set on the
> Worker; the repo also mirrors `DATABASE_URL` as an Actions secret.
>
> **CI/CD (git → site):** push to `main` → GitHub Actions `deploy.yml`
> (npm ci → `prisma generate` (pg) → `vite build` → `wrangler deploy` →
> `/api/health` smoke) → live. Verified end-to-end: run 37555920987.
> **DB bootstrap:** `bootstrap-neon.yml` (workflow_dispatch, idempotent):
> create-or-reuse Neon project → push schema → set Worker secrets. Note: it
> talks to `console.neon.tech` (the `api.neon.tech` host no longer resolves).
>
> **Production lessons encoded in code** (all hit live, all fixed — see
> CHANGELOG): Prisma must come from the generated WASM entry
> (`src/lib/prisma-client.ts`); Worker secrets live on `env` from
> `cloudflare:workers`, not `process.env` (`src/lib/db.ts`); no module-scope
> timers (`src/lib/ratelimit.ts`).
>
> The runbook below is kept for re-creating the deployment from zero.

Primary target: **Cloudflare Workers** (vinext build) + **Neon Postgres**
(free tier). Zero upfront cost. This file is the **owner runbook**: every
step, every env var, every expected result.

Why this stack (verified 2026-10-07):

- The production build is vinext (`vite build` — Next.js API surface on Vite,
  Cloudflare's own runtime for Next.js apps). All 22 routes build clean.
- The Worker bundle measures **4,691 KiB uncompressed / 1,451 KiB gzip** —
  ~7% of Cloudflare's current **64 MiB uncompressed** limit (the old 3 MiB
  gzip restriction was removed by Cloudflare in September 2026; verified
  against Cloudflare's own docs/announcements and worker-tooling reports).
  There is no size pressure to "optimize around" — bundle size is a solved
  problem for this app.
- Postgres access uses Prisma's `PrismaNeonHTTP` driver adapter (pure HTTPS
  via `@neondatabase/serverless`) — no raw TCP, no Hyperdrive, no native
  engine on the Worker (the WASM query engine is bundled automatically).
- The previous Vercel + Neon path still works and is kept at the bottom as
  a fallback — nothing was removed, only the target changed.

## Owner runbook (exact steps)

### Part 1 — Neon Postgres (~5 min)

1. Sign up at **neon.com** (GitHub login works — no card required).
2. Create a project: name `dmarcduck`, region closest to your users
   (us-east-1 is fine to start). Postgres 16 default is fine.
3. Open the project dashboard → **Connection Details** → pick the
   **pooled** connection string → copy it. It looks like:
   ```
   postgresql://<user>:<password>@<ep-name>-pooler.<region>.aws.neon.tech/neondb?sslmode=require
   ```
4. **Keep this tab open.** The Neon HTTP driver works with the pooled
   endpoint; it does not hold connections open, so there is nothing to
   exhaust.

Expected state: one project, one connection string copied.

### Part 2 — Cloudflare Workers (~10 min)

1. Sign up at **dash.cloudflare.com** (free plan is enough).
2. From your machine:

   ```bash
   git clone https://github.com/superz1402/dmarcduck && cd dmarcduck
   npm install
   npx wrangler login          # opens a browser, one click to authorize
   ```

3. Sanity-check the build locally (optional but recommended):

   ```bash
   npm run build               # vite build → dist/ (worker + static assets)
   npm test                    # 33/33
   ```

4. Set the secrets (wrangler prompts for values; secrets are per-Worker,
   encrypted, never in git):

   ```bash
   npx wrangler secret put DATABASE_URL      # paste the Neon POOLED string
   npx wrangler secret put CRON_SECRET       # openssl rand -hex 32
   # optional, only when those features go live:
   # npx wrangler secret put RESEND_API_KEY
   # npx wrangler secret put MAIL_FROM
   # npx wrangler secret put LS_SIGNATURE_SECRET
   ```

   | Secret | Required | Notes |
   |---|---|---|
   | `DATABASE_URL` | **yes** | Neon **pooled** connection string (`postgres://…`) |
   | `CRON_SECRET` | **yes for digest cron** | guards `/api/cron/digest` |
   | `RESEND_API_KEY` | no | unset = digest emails are logged, not sent |
   | `MAIL_FROM` | no | must be a Resend-verified sender domain |
   | `LS_SIGNATURE_SECRET` | no | Lemon Squeezy webhook HMAC; when billing goes live |

5. Deploy:

   ```bash
   npm run deploy:cf           # = vite build && vinext-cloudflare deploy
   ```

   First deploy prints the workers.dev URL, e.g.
   `https://dmarcduck.<your-subdomain>.workers.dev`.

Expected result: visiting the URL shows the landing page;
`/api/health` returns `{"status":"ok","checks":{"app":"ok","db":"ok"}}`.

If health says `db: fail`, the schema is not pushed yet — do Part 3, then
re-check. If deploy itself fails with an auth error, re-run
`npx wrangler login`.

### Part 3 — Database schema (~2 min, same machine)

```bash
DATABASE_URL="<neon pooled url>" npm run db:push:pg
```

Expected result: Prisma applies the schema (tables: User, Session, Domain,
Report, AnalyzeRecord, AlertEvent, Subscription, IngestionEvent), then
re-check `/api/health` → `db: ok`.

### Part 4 — Post-deploy verification (~5 min)

Run the smoke list from `PRODUCTION_CHECKLIST.md` against the live URL:

1. `GET /api/health` → 200 ok.
2. `/analyze` with `tests/fixtures/google-report.xml` → analysis + share link.
3. Sign up → add a domain → `POST /api/ingest/<token>` with a failing
   report → dashboard shows sources + a ledger row with per-event
   **inclusion** counts (in-window / outside-window).
4. Wrong ingest token → 404. Junk payload → 422 with a ledger event.
5. `/api/cron/digest` without secret → 401.
6. 21 rapid analyzer uploads → 429 + `Retry-After`.
7. `npx wrangler tail` while clicking around → no uncaught exceptions.

### Part 5 — Digest cron

Workers cron triggers (`"triggers": {"crons": [...]}`) require a
`scheduled()` handler; vinext routes do not export one yet. Until vinext
ships first-class cron support, schedule the digest externally:

- Any free scheduler (cron-job.org, GitHub Actions schedule, UptimeRobot
  ping) hitting:
  ```
  GET https://<your-worker>.workers.dev/api/cron/digest
  Authorization: Bearer <CRON_SECRET>
  ```
- Weekly is the intended cadence (the route itself is idempotent).

Honest note: `vercel.json` still declares the Vercel cron for the fallback
path below; it is inert on Workers.

### Part 6 — Optional integrations (only when needed)

- **Email digests/alerts** (Resend): verify your sending domain → set
  `RESEND_API_KEY` + `MAIL_FROM` secrets → redeploy. Free tier: 3,000 mails/mo.
- **Billing** (Lemon Squeezy): create the store, add Starter ($7) and
  Studio ($19) products, point the webhook at
  `https://<your-worker>.workers.dev/api/webhooks/lemonsqueezy`, copy the
  signing secret into `LS_SIGNATURE_SECRET`, redeploy. Checkout links carry
  `custom_data.email` so the webhook can match the account.
- **Custom domain**: Cloudflare dashboard → Workers → dmarcduck →
  Domains → add `dmarcduck.<yourdomain>` (DNS is in the same account, so
  this is one click if the zone is already on Cloudflare).

## What the owner does NOT need to do

- No Cloudflare config beyond `wrangler login` + secrets (`wrangler.jsonc`
  and `vite.config.ts` are committed; the deploy command builds everything).
- No Hyperdrive, no D1, no R2, no KV — the Neon HTTP driver needs nothing
  but outbound HTTPS, which Workers allow by default.
- No migration step beyond Part 3 (schema push; no migration history yet).
- No Docker, no Redis, no queue. Postgres + Worker only.

## Cloudflare Email Routing recipe (free report delivery)

Per monitoring domain, in Cloudflare:

1. Email Routing: enable on a subdomain you own (e.g. `ingest.yourdomain.com`).
2. Create an Email Worker:

```js
export default {
  async email(message, env, ctx) {
    // Forward the RAW message bytes to DmarcDuck with the domain token.
    const token = env[`TOKEN_${message.to.split("@")[0]}`]; // map address->token
    const res = await fetch(`${env.DMARC_DUCK_URL}/api/ingest/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/xml" },
      body: message.raw,
    });
    if (!res.ok) message.setRejectStatus(false); // keep provider retry
  },
};
```
3. Route `dmarc@ingest.yourdomain.com` → this worker.
4. Point the monitored domain's DMARC `rua=` at that address.

(The worker code ships in `examples/` too — kept short here on purpose.)

---

## Fallback: Vercel + Neon (still supported)

If Cloudflare is unavailable for any reason, the previous runbook works
unchanged: import the repo on Vercel (Framework preset: Next.js), add the
same env vars from the table above as project environment variables, deploy,
then push the schema with `npm run db:push:pg`. `vercel.json` (headers +
cron) is still committed. The codebase supports both targets from the same
branch — local dev and tests run identically under either.
