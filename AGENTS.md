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
- **Free-tier native.** Must run on Vercel Hobby + Neon free + Resend free.
  Any dependency that costs money per-request is a bug in the architecture.
- **Honest by design.** No fake logos, no inflated numbers, no dark patterns,
  no artificial urgency. The marketing voice is "boring, cheap, correct".

## Stack (do not change without discussion)

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 15, App Router, TypeScript strict | server routes + UI in one repo |
| Styling | Tailwind CSS 4 + design tokens in `globals.css` | see `docs/UI_SYSTEM.md` — the tokens are the design system |
| DB | Prisma; SQLite for dev, Postgres for prod | two schema files; `db:push` (sqlite) / `db:push:pg` |
| Auth | email + bcrypt + DB sessions in httpOnly cookie | no OAuth, no JWT; see `src/lib/auth.ts` |
| Email | Resend HTTP API behind `RESEND_API_KEY` | unset key = logged, not sent (graceful) |
| Billing | Lemon Squeezy webhook (`LS_SIGNATURE_SECRET`) | merchant of record; status in Subscription table |
| Tests | Vitest | parser is the crown jewel; fixtures in `tests/fixtures/` |
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
- Structured logs: `log.info("event.name", {fields})` — one JSON line
- Design tokens: `src/app/globals.css` (`:root` + `.dark` blocks)

## Product judgment

When a ticket says "add X", first ask whether X helps a 1–5 domain operator
trust their email. Feature requests from enterprise-shaped fantasies
(SSO, RBAC, multi-tenant orgs, SLAs) are out of scope on purpose. If unsure,
write it down in `docs/ROADMAP.md` under "Explicitly not building" instead of
building it.
