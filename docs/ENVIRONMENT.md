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
| Vercel Hobby | 100GB-hr serverless, 2 cron jobs | web app | fine at launch scale |
| Neon Postgres | 0.5GB storage, autosuspend | rows are tiny (XML→numbers) | months of reports fit |
| Resend | 3,000 emails/mo | 1 digest/domain/week + alerts | 100 domains ≈ 500 mails/mo |
| Lemon Squeezy | $0 fixed | 5%+50¢ per sale | costs scale WITH revenue |
| GitHub Actions (cron alt.) | 2,000 min/mo private | digest job 1/min-run | trivial |
