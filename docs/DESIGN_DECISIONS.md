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
