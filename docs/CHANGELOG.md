# Changelog

## 0.1.0 — 2026-10-06
First build. The wedge, end to end.

### Added
- Free analyzer: XML / ZIP / GZ upload → plain-language dashboard
  (volume, pass rate, source-by-source verdicts with suspicion notes,
  provider rollup, policy guidance, parsing warnings).
- Shareable analysis links with 7-day honest expiry.
- Accounts (email + bcrypt + DB sessions), plan entitlements
  (Free / Starter $7 / Studio $19) with Lemon Squeezy webhook (HMAC-verified).
- Domain monitoring: registration, private capability-URL ingestion,
  per-domain dashboard (sources, providers, pass rate, 2000-row window).
- Weekly digest + new-source alerts via Resend (logged-not-sent fallback).
- Cron endpoint (secret-guarded) for Vercel Cron / GitHub Actions.
- Health endpoint; structured JSON logging; rate limits on public writes.
- Docs: architecture, PRD, UI system, API, DB, deployment, environment,
  security, testing, development, roadmap + AGENTS.md for coding agents.
- Tests: 12 fixture-based parser/aggregation tests (Google/Yahoo/Outlook
  shapes, zip/gz, concatenated docs, junk handling, health scoring).
