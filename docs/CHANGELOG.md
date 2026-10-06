# Changelog

## Unreleased

### Changed — Guided analysis notes (start of the differentiator)
- "What this means" per source no longer says one line for every passing
  source. Passing sources now explain WHICH mechanism carried the mail and
  what to harden next: SPF-only (fix DKIM), DKIM-only (add sender to SPF),
  mixed (check signing consistency), or fully aligned.
- Domain detail explains "stored but outside window": reports older than the
  plan's history window are announced with their count and latest date
  instead of a misleading empty state (found during the screenshot audit).
- Dashboard pluralization fix ("1 stored report row").

### Changed — Ingestion Ledger (no more silent failures)
- **Every ingestion attempt now writes a durable `IngestionEvent`**: status
  (processed / partial / rejected), files received, reports parsed, records
  stored, duplicates skipped, mismatched reports refused, and per-file reject
  reasons. The domain dashboard shows the last 10 attempts as "Report
  ingestion activity" — a user never has to wonder whether their report
  arrived and what happened to it.
- **Cross-request dedupe**: `Report` gained a UNIQUE (domain, reportId,
  sourceIp, window, count) constraint; re-sent reports increment
  `duplicatesSkipped` instead of double-counting email volume.
- **Honest failure codes from ingestion**: garbage payloads now return `422
  {error, event}` (permanent failure — senders should not retry) instead of
  `200 {stored: 0}`; multipart with no `files` field returns `400` instead of
  a silent success.
- Ingestion raw-body and per-file 20 MB caps (matching the analyzer).
- New fixture-derived smoke checks: domain-matched ingestion, duplicate
  re-send, mismatched-domain refusal, ledger assertions (51/51).

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
