# AGENTS.md — instructions for AI coding agents working on DmarcDuck

This file is the operating manual for coding agents (Claude Code, Cursor,
Codex, GLM, …) contributing to this repository. Read it fully before writing
code. It encodes decisions that were made deliberately; re-litigating them
without evidence wastes the team's time.

## What this product is (and is not)

DmarcDuck turns DMARC aggregate reports (RFC 7489 App. C XML) into
plain-language dashboards for small operators (1–5 domains). It is:

- **Deterministic.** Parsing, aggregation, storage, alerts. There is NO
  machine-learning anywhere in the product. Do not add an LLM call to any
  request path — the value is predictability and near-zero marginal cost.
- **Free-tier native.** Runs on Cloudflare Workers free + Neon free + Resend
  free (Vercel remains a supported fallback target). Any dependency that
  costs money per-request is a bug in the architecture.
- **Honest by design.** No fake logos, no inflated numbers, no dark patterns,
  no artificial urgency. The marketing voice is "boring, cheap, correct".

## Stack (do not change without discussion)

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 15, App Router, TypeScript strict | server routes + UI in one repo |
| Styling | Tailwind CSS 4 + design tokens in `globals.css` | see `docs/UI_SYSTEM.md` — the tokens are the design system |
| DB | Prisma (`PrismaNeonHTTP` on Workers); SQLite for dev, Neon Postgres for prod | two schema files; `db:push` (sqlite) / `db:push:pg` |
| Deployment | **Cloudflare Workers via vinext** (`vite build` → `wrangler deploy`) | production since 2026-10-07; Vercel fallback still works — do NOT migrate either direction without a real blocker |
| Auth | email + bcrypt + DB sessions in httpOnly cookie | no OAuth, no JWT; see `src/lib/auth.ts` |
| Email | Resend HTTP API behind `RESEND_API_KEY` | unset key = logged, not sent (graceful) |
| Billing | Lemon Squeezy webhook (`LS_SIGNATURE_SECRET`) | merchant of record; status in Subscription table |
| Tests | Vitest | parser is the crown jewel; fixtures in `tests/fixtures/` |
| CI/CD | GitHub Actions | `deploy.yml` (push to main → build → deploy → health smoke), `digest.yml` (weekly digest cron), `bootstrap-neon.yml` (idempotent DB re-provision), `ci.yml` (tests) |
| Icons | lucide-react | no emoji as UI icons, ever |

## Non-negotiable rules

1. **The parser never throws.** Real-world reports are malformed in creative
   ways. `parseFeedbackXml` returns `null` on garbage; `parseUpload` returns
   warnings. New field handling follows: read defensively, cast manually,
   default sensibly. Add a fixture for every new provider quirk you meet.
2. **Every DB write path is owned.** A user may only touch rows tied to their
   userId. Check `loadOwned`-style patterns in existing routes before adding
   new ones. Domain tokens (`mailboxToken`) are capability URLs — treat
   lookups with them as unauthenticated-but-scoped.
3. **No secrets in code, ever.** All configuration goes through env vars
   (documented in `docs/ENVIRONMENT.md`). The webhook route returns 503 when
   unconfigured — honest failure over silent acceptance.
4. **UI quality bar** (see `docs/UI_SYSTEM.md` for the full system):
   - Use the tokens (`bg-card`, `text-muted-foreground`, …) — no raw hex in
     components except inside `globals.css`.
   - Color never carries meaning alone: every verdict has a label
     (`Badge` text, `sr-only` for dots).
   - Every async surface needs loading, empty, and error states. All three
     are written before the happy path is called done.
   - Numbers align: `.tnum` (tabular numerals) on anything countable.
   - No purple/blue gradient "AI look". Warm paper, ink, one amber accent.
5. **Rate-limit every public write endpoint** via `src/lib/ratelimit.ts` and
   return 429 with `Retry-After`.
6. **Types are strict.** `npx tsc --noEmit` must pass. `npm run lint` must
   pass. Both pass before any commit.
7. **Tests for logic, not trivia.** New parsing/aggregation behavior ships
   with a fixture-based test. Test names describe provider behavior
   ("handles yahoo's missing sp field"), not function names.

## Verification loop before you claim done

```bash
npx tsc --noEmit     # types
npm run lint         # eslint
npm test             # parser + aggregation suites
npm run build        # production build must succeed
```

Then exercise the actual flow locally (`npm run dev`):

- `/analyze` with `tests/fixtures/google-report.xml` → dashboard renders.
- The same file as raw XML body: `curl -X POST :3100/api/analyze -H 'Content-Type: application/xml' --data-binary @...`
- Signup → add domain → `POST /api/ingest/<token>` with `failing-report.xml`
  → domain dashboard shows the failing source.

A passing build is not "done". A working flow is done.

## Where things live (so you don't have to guess)

- Plan limits & entitlements: `src/lib/plan.ts` (single source of truth)
- Analysis shape (the contract between parser and UI): `src/lib/dmarc/analyze.ts`
- Health scoring (pass rate, policy guidance): `analyzeReports()` — same file
- Digest idempotency window: `src/lib/digest-window.ts` (unit-tested)
- Production smoke suite (22 checks): `scripts/production-smoke.sh` — run it
  against the live URL after every deploy
- Structured logs: `log.info("event.name", {fields})` — one JSON line
- Design tokens: `src/app/globals.css` (`:root` + `.dark` blocks)

## Post-launch state (read this before proposing work — 2026-10-07)

DmarcDuck is **live in production and verified**:
https://dmarcduck.ansaribilal.com (mirror: https://dmarcduck.ansaribil1402.workers.dev).
Push to `main` auto-deploys. Scheduled digest workflow (`digest.yml`) is live
and idempotency-verified. Smoke suite 22/22. Tests 39/39.

The product phase is **USER VALIDATION, not infrastructure or feature
development**. Before building anything, check `docs/VALIDATION_LOG.md`:
features need user evidence, not taste. Specifically do NOT:

- migrate to D1, Vercel, or any other runtime without a real technical blocker
  (the current pipeline is proven end-to-end; "interesting" is not a reason);
- rebuild or parallel-implement anything that exists (digest, smoke, deploy);
- add infrastructure without a production incident that requires it;
- break the deployed auth/session/ingest contracts (`/api/auth/me` returns
  200 `{user:null}` for anonymous callers — that is the documented design).

Known-not-configured (owner-side, do not "fix" in code): `RESEND_API_KEY`
(no Resend account yet → digest emails log instead of sending) and Lemon
Squeezy billing (`LS_SIGNATURE_SECRET` unset → webhook 503s honestly).

## Product judgment

When a ticket says "add X", first ask whether X helps a 1–5 domain operator
trust their email. Feature requests from enterprise-shaped fantasies
(SSO, RBAC, multi-tenant orgs, SLAs) are out of scope on purpose. If unsure,
write it down in `docs/ROADMAP.md` under "Explicitly not building" instead of
building it.
