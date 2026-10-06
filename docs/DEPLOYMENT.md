# Deployment

Target: Vercel (free tier) + Neon Postgres (free tier). Zero upfront cost.

## One-time setup

1. **Neon**: create project → copy pooled connection string.
2. **Vercel**: import this repo → add env vars (see ENVIRONMENT.md):
   `DATABASE_URL`, `CRON_SECRET`, (later) `RESEND_API_KEY`, `MAIL_FROM`,
   `LS_SIGNATURE_SECRET`.
3. **Schema push**: locally run `DATABASE_URL="<neon url>" npm run db:push:pg`.
4. **First deploy**: Vercel auto-deploys on push. Verify `GET /api/health`.
5. **Cron** (pick one):
   - Vercel Cron: add to `vercel.json`:
     ```json
     { "crons": [{ "path": "/api/cron/digest", "schedule": "0 9 * * 1" }] }
     ```
     (Vercel sets the authorization header from `CRON_SECRET` automatically.)
   - GitHub Actions: schedule a workflow that curls the endpoint with
     `Authorization: Bearer $CRON_SECRET` (secret stored in repo settings).
6. **Lemon Squeezy**: create Starter/Studio products; add a webhook to
   `https://your-domain/api/webhooks/lemonsqueezy` with signing secret;
   checkout links carry `custom_data.email` (prefill from the session email).
7. **Email sending**: verify your sending domain in Resend; set
   `RESEND_API_KEY` + `MAIL_FROM`.

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
