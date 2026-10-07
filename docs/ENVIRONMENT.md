# Environment

Everything is optional in dev (app degrades gracefully) except DATABASE_URL
for the API routes that touch the DB.

| Var | Required | Used for | Notes |
|---|---|---|---|
| `DATABASE_URL` | prod: yes | Prisma | Postgres conn string in prod; dev uses schema file default |
| `LOG_LEVEL` | no | structured logs | debug/info/warn/error (default info) |
| `RESEND_API_KEY` | no | digests/alerts | unset = emails logged, not sent (free tier: resend.com 3k/mo) |
| `MAIL_FROM` | no | email From header | must be a verified sender domain |
| `CRON_SECRET` | prod: yes for cron | guards `/api/cron/digest` | long random string |
| `LS_SIGNATURE_SECRET` | for billing | Lemon Squeezy webhook HMAC | signing secret from LS dashboard |

## Free-tier dependency limits (do not assume "unlimited")

| Service | Free tier | Our usage | Ceiling |
|---|---|---|---|
| **Cloudflare Workers (production)** | 100k req/day free | web app + API (vinext) | far above launch scale |
| Vercel Hobby (fallback target) | 100GB-hr serverless, 2 cron jobs | not used in production; code kept compatible | n/a while on Workers |
| Neon Postgres | 0.5GB storage, autosuspend | rows are tiny (XML→numbers) | months of reports fit |
| GitHub Actions (CI/CD + digest cron) | 2,000 min/mo private | deploy ~1/min-run, digest 1×/week | trivial |
| Resend (NOT configured yet — no account exists) | 3,000 emails/mo when set | digests/alerts are logged, not sent, until `RESEND_API_KEY` is set on the Worker | 100 domains ≈ 500 mails/mo |
| Lemon Squeezy (NOT configured yet) | $0 fixed | 5%+50¢ per sale | costs scale WITH revenue |
