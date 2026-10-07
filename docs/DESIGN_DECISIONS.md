# Design Decisions

Append-only. Each entry: decision, context, alternatives, consequences.

## D-001: No AI features (2026-10-06)
Parsing DMARC reports is deterministic. An LLM adds latency, cost, and
unpredictability to a problem solved by a 300-line parser with tests.
"AI-powered" branding would attract the wrong user and violate the owner's
directive #20. Consequence: marketing leans on clarity/honesty, not novelty.

## D-002: Capability-URL ingestion over inbound SMTP (2026-10-06)
Receiving email for users requires paid infra (or heavy vendor lock-in).
Instead each domain gets a tokenized POST endpoint. Free delivery path:
Cloudflare Email Routing (free) + a 20-line Email Worker (documented).
Alternatives rejected: IMAP polling (credential risk, fragile), S3-drop
(projects cost onto users). Consequence: docs must carry the worker recipe.

## D-003: Freemium with flat pricing, Lemon Squeezy as MoR (2026-10-06)
$0 free (analyzer + 1 domain, manual), $7 Starter (3 domains, automation,
alerts), $19 Studio (10 domains, enforcement guide, export). Flat pricing
is the wedge against per-domain incumbents; Lemon Squeezy = zero upfront
(only revenue share), which satisfies the owner's zero-investment constraint.

## D-004: Next.js single app, not separate API (2026-10-06)
One deploy unit on Vercel free tier; server routes are adequate for the
traffic stage. Rejected: separate NestJS API (ops burden without benefit
at this scale), Cloudflare Workers full-stack (Postgres/Prisma story
weaker at the time of decision).

## D-005: Hand-rolled UI primitives over component library install (2026-10-06)
The design system IS the differentiator; hand-rolled primitives (Button/
Card/Badge/Table, ~400 LOC) with token-driven styling give exact control
and zero dependency risk. Rejected: full shadcn install (fine, but drags
Radix deps for surfaces we don't need yet). If scope grows, migrating the
primitive APIs to shadcn is mechanical — they were designed for it.

## D-006: Aggregate-on-read (2026-10-06)
Store raw report rows; compute per-domain dashboards on read with a
2000-row window. Rejected: materialized daily rollups (premature; write
complexity, off-by-one bugs, and the read path is fast at this volume).

## D-007: 7-day-expiring share links, not permanent public pages (2026-10-06)
Analyzer results can contain infrastructure details (IPs, providers).
Bounded retention respects privacy and keeps storage honest. Consequence:
expired links explain themselves and offer a one-click re-run.

## D-008: Deployment target reversed to Cloudflare Workers via vinext (2026-10-07) — supersedes D-004's target choice
D-004 chose Vercel because the Workers/Prisma story was weaker "at the time".
It stopped being true: vinext (Cloudflare's Next.js runtime) built all 22
routes; Prisma's WASM engine + `PrismaNeonHTTP` (HTTPS-only driver) removed
the TCP/native-engine blockers; the bundle measures ~7% of the 64 MiB limit.
Production deployed 2026-10-07 (Workers + Neon, custom domain, GitHub Actions
CI/CD). Why it stayed: the pipeline is verified end-to-end (push → deploy →
smoke 22/22; scoped-token rotation proven one-step; digest cron verified
idempotent). Consequence: Vercel remains a compatible fallback, but **do not
migrate in either direction without a real technical blocker** — the
migration cost is now pure risk with no user-visible payoff. The codebase
keeps both targets green from one tree (Node paths + `cloudflare:workers`
branch in `db.ts`).

## D-009: Product phase = user validation; infrastructure frozen (2026-10-07)
After the scheduled digest workflow shipped and verified, the owner directive
made it explicit: the bottleneck is no longer software. Zero real users
exist. Every unit of effort now goes to evidence (who has the pain, do they
understand the product, would they pay) instead of features. Consequence:
new code requires a user-evidence justification in `docs/VALIDATION_LOG.md`;
new infrastructure requires a production incident; architecture changes
require a real blocker (see AGENTS.md "Post-launch state").
