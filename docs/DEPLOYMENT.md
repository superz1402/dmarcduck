# Deployment

Target: Vercel (free tier) + Neon Postgres (free tier). Zero upfront cost.
This file is the **owner runbook**: every step, every env var, every expected
result. If you can create two accounts, you can deploy this app in ~20 minutes.

## Owner runbook (exact steps)

### Part 1 — Neon Postgres (~5 min)

1. Sign up at **neon.com** (GitHub login works — no card required).
2. Create a project: name `dmarcduck`, region closest to your users
   (us-east-1 is fine to start). Postgres 16 default is fine.
3. Open the project dashboard → **Connection Details** → pick the
   **pooled** connection string → copy it.
   It looks like:
   ```
   postgresql://<user>:<password>@<ep-name>-pooler.<region>.aws.neon.tech/neondb?sslmode=require
   ```
4. **Keep this tab open.** The pooled string is what Vercel serverless
   functions should use (pooled avoids connection exhaustion).

Expected state: one project, one connection string copied.

### Part 2 — Vercel (~10 min)

1. Sign up at **vercel.com** with the GitHub account that owns
   `superz1402/dmarcduck` (import is one click).
2. **Add New → Project** → Import the `dmarcduck` repository.
3. Framework preset: **Next.js** (auto-detected). Build command, output
   and install defaults need no changes.
4. Before clicking Deploy, open **Environment Variables** and add:

   | Name | Value | Required | Notes |
   |---|---|---|---|
   | `DATABASE_URL` | the Neon **pooled** connection string | **yes** | app will not start without it |
   | `CRON_SECRET` | any long random string (`openssl rand -hex 32`) | **yes for cron** | guards `/api/cron/digest`; Vercel Cron sends it automatically |
   | `RESEND_API_KEY` | from resend.com (later) | no | unset = digest emails are logged, not sent; everything else works |
   | `MAIL_FROM` | e.g. `DmarcDuck <reports@yourdomain.com>` | no | must be a Resend-verified sender domain |
   | `LS_SIGNATURE_SECRET` | from Lemon Squeezy (later) | no | billing webhook HMAC; leave unset until billing goes live |

   Add each to **Production, Preview, and Development**.
5. Click **Deploy**. First build takes ~2 minutes.

Expected result: deployment succeeds; visiting the URL shows the landing
page; `https://<your-app>.vercel.app/api/health` returns
`{"status":"ok","checks":{"app":"ok","db":"ok"}}`.

If health says `db: fail`, the connection string is wrong or the DB schema
is not pushed yet — do Part 3.

### Part 3 — Database schema (~2 min, from your machine)

```bash
git clone https://github.com/superz1402/dmarcduck && cd dmarcduck
npm install
DATABASE_URL="<neon pooled url>" npm run db:push:pg
```

Expected result: Prisma applies the schema (tables: User, Session, Domain,
Report, AnalyzeRecord, AlertEvent, Subscription, IngestionEvent), then
re-check `/api/health` → `db: ok`.

Alternative with zero local setup: add a temporary GitHub Action that runs
the same command with the secret stored in repo settings — ask, and the
workflow file will be provided.

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

### Part 5 — Cron (2 min)

`vercel.json` already declares the weekly cron. On Vercel Hobby, crons run
automatically once the project is deployed; `CRON_SECRET` is passed through
by Vercel Cron as `Authorization: Bearer`.

### Part 6 — Optional integrations (only when needed)

- **Email digests/alerts** (Resend): verify your sending domain → set
  `RESEND_API_KEY` + `MAIL_FROM` → redeploy. Free tier: 3,000 mails/mo.
- **Billing** (Lemon Squeezy): create the store, add Starter ($7) and
  Studio ($19) products, point the webhook at
  `https://<your-app>/api/webhooks/lemonsqueezy`, copy the signing secret
  into `LS_SIGNATURE_SECRET`, redeploy. Checkout links carry
  `custom_data.email` so the webhook can match the account.
- **Custom domain**: add `dmarcduck.<yourdomain>` in Vercel → Project →
  Domains; DNS CNAME is shown there.

## What the owner does NOT need to do

- No Vercel config beyond env vars (vercel.json is committed).
- No migration step beyond Part 3 (schema push; no migration history yet).
- No Docker, no Redis, no queue. Postgres + serverless only.

## Cloudflare Email Routing recipe (free report delivery)

Per monitoring domain, in Cloudflare:

1. Email Routing: enable on a subdomain you own (e.g. `ingest.yourdomain.com`).
2. Create an Email Worker:

```js
export default {
  async email(message, env, ctx) {
    // Forward the RAW message bytes to DmarcDuck with the domain token.
    const token = env[`TOKEN_${message.to.split("@")[0]}`]; // map address->token
    const res = await fetch(`${env.DMARCduck_URL}/api/ingest/${token}`, {
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

## Monitoring our own deployment

- `/api/health` is the uptime probe (app + db checks).
- Structured JSON logs stream to `vercel logs`; alert on
  `mail.provider_error` / `analyze.store_error` rates if you add a
  log drain.

## Backups

Neon free tier has point-in-time restore within its retention window. At
paid scale: nightly `pg_dump` to object storage (documented, not needed yet).

## Schema note (added 2026-10-07)

The current schema includes `Report.eventId` (ingestion-event attribution),
`Report.envelopeFrom`, `Report.dkimAuth`, `Report.reasons`. If you pushed
the schema before 2026-10-07, re-run `npm run db:push:pg` — Prisma will add
the new nullable columns and the `eventId` index non-destructively.
