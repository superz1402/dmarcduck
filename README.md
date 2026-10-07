# DmarcDuck 🦆

**DMARC monitoring that doesn't bite.**

> **Live:** https://dmarcduck.ansaribilal.com · mirror: https://dmarcduck.ansaribil1402.workers.dev
> Deploys automatically on every push to `main` (GitHub Actions → Cloudflare Workers).
>
> **Current phase: USER VALIDATION** — the system is deployed and verified;
> the open question is whether real people use and pay for it. No new
> infrastructure or features without real-user evidence (see AGENTS.md).

Paste a DMARC aggregate report, get a plain-language answer. Free analyzer,
honest pricing for multi-domain monitoring. Built for small operators —
indie founders, small agencies, side projects — not enterprises.

---

## Why this exists

Since Google/Yahoo (Feb 2024) and Microsoft (2025) made DMARC effectively
mandatory for anyone sending email, every sending domain receives dense XML
aggregate reports nobody reads. The market response splits into:

- **Free one-shot parsers** — lead magnets with hard limits and no history.
- **Enterprise platforms** — $14+/domain/month, sales-led, MSP-oriented.

The middle — a 1–5 domain operator who wants clarity and cheap automation —
is empty. DmarcDuck occupies it: a genuinely useful free analyzer plus
flat-priced monitoring ($7/mo Starter, $19/mo Studio). No per-domain tax,
no AI theater (this is a parsing problem, not a language-model problem).

## What works today (v0.1)

| Capability | Status |
|---|---|
| Free analyzer: upload XML / ZIP / GZ → human-readable dashboard | ✅ |
| Shareable result links (7-day expiry, honest storage) | ✅ |
| Accounts (email + bcrypt), sessions, plan entitlements | ✅ |
| Domain registration with private ingestion URL | ✅ |
| Automated report ingestion endpoint (raw XML or multipart) | ✅ |
| Per-domain dashboard: sources, verdicts, providers, pass rate | ✅ |
| Weekly digest + new-source alerts — scheduled via GitHub Actions (`digest.yml`, Mondays 09:17 UTC), idempotent, verified in production | ✅ deployed / 🔶 email not configured (no `RESEND_API_KEY` yet — sends are logged, not sent) |
| Lemon Squeezy webhook (signature-verified) for upgrades | ✅ code / ⏳ account |
| Guided policy enforcement (p=none → quarantine → reject) | 📋 planned (Studio) — gated on user evidence |
| CSV export | 📋 planned (Studio) — gated on user evidence |

Full roadmap: [docs/ROADMAP.md](docs/ROADMAP.md). Production state of every
check: [docs/PRODUCTION_CHECKLIST.md](docs/PRODUCTION_CHECKLIST.md).

## Quick start (zero-setup dev)

```bash
npm install
npm run db:push        # SQLite dev database, no Docker needed
cp .env.example .env   # everything optional in dev; app degrades gracefully
npm run dev            # http://localhost:3100
npm test               # parser + aggregation test suite
```

Production uses Postgres (Neon free tier works) — see
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## The 60-second product demo

1. Grab a DMARC report attachment from your inbox (a `.zip` from Google works).
2. Drop it into `/analyze`. No account.
3. Read: volume, pass rate, every sending IP, whether it's you, a forgotten
   sender, or someone spoofing you — each explained in one sentence.
4. Create an account, register your domain, point `rua=` at your private
   ingestion URL, and the same answers arrive daily without you.

## Repository map

```
src/
  app/                    # Next.js App Router (pages + API routes)
    api/analyze/          #   the free analyzer endpoint
    api/ingest/[token]/   #   automated report ingestion
    api/cron/digest/      #   scheduled digests + alerts (secret-guarded)
    api/webhooks/         #   Lemon Squeezy lifecycle webhooks
    app/                  #   dashboard (auth required)
    analyze/ r/[id]/      #   analyzer + shareable results
    pricing/ docs/        #   pricing page + ingestion docs
  components/             # UI: primitives (ui/) + feature components
  lib/
    dmarc/parser.ts       # RFC 7489 aggregate report parser (the heart)
    dmarc/analyze.ts      # aggregation → analysis object (pure functions)
    auth.ts plan.ts       # sessions/bcrypt + plan entitlements
    db.ts log.ts mail.ts ratelimit.ts
prisma/                   # Postgres (canonical) + SQLite (dev) schemas
tests/                    # Vitest: parser fixtures (Google/Yahoo/MSFT shapes)
docs/                     # architecture, deployment, API, UI system, PRD...
AGENTS.md                 # instructions for AI coding agents
```

## Documentation

| Doc | What it covers |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | system design, data flow, trade-offs |
| [docs/PRD.md](docs/PRD.md) | problem, customer, competitive analysis, validation ladder |
| [docs/DESIGN_DECISIONS.md](docs/DESIGN_DECISIONS.md) | why each choice was made |
| [docs/UI_SYSTEM.md](docs/UI_SYSTEM.md) | design tokens, components, a11y rules |
| [docs/API.md](docs/API.md) | every endpoint, request/response shapes |
| [docs/DATABASE.md](docs/DATABASE.md) | schema, indexes, retention rules |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Vercel + Neon + Resend + Lemon Squeezy setup |
| [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) | every env var, free-tier limits |
| [docs/TESTING.md](docs/TESTING.md) | test strategy, how to add fixtures |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | daily workflow, code style, DB workflows |
| [docs/SECURITY.md](docs/SECURITY.md) | threat model, what we store, what we never do |
| [docs/ROADMAP.md](docs/ROADMAP.md) | staged plan to v1.0 and beyond |
| [docs/CHANGELOG.md](docs/CHANGELOG.md) | release history |
| [CONTRIBUTING.md](CONTRIBUTING.md) | how to develop on this repo |

## Honest limits

- Email delivery is NOT configured in production yet: no Resend account
  exists, `RESEND_API_KEY` is unset, so digest/alert emails are logged, not
  sent (`digestsSent: 0` on every scheduled run — honest no-op). Free plan
  has no digest by design (`plan.weeklyDigest` is a paid-plan flag).

- Rate limiting is in-memory per Workers isolate (documented in
  `src/lib/ratelimit.ts`; an edge limiter is the upgrade path if limits
  start being evaded).
- Ingestion accepts HTTP POSTs; mailbox polling (IMAP) is not built —
  delivery via Cloudflare Email Routing is the documented free path.
- No dark mode images yet — colors are tokenized and dark mode works, but
  chart polish is still pending.

## License

AGPL-3.0 — the parser and aggregation logic stay open; the hosted product is
the business. See [LICENSE](LICENSE).

---

Built in public, including the mistakes. Follow the journey:
[product lab notes](https://github.com/superz1402/moltbook-agent) ·
[@superz1402](https://www.moltbook.com/u/superz1402)
