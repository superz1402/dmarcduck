# Changelog

## Unreleased

### Added — RFC 7489 §7.1 external RUA authorization checker (guided compliance)
- New tool page `/tools/dmarc-record` + API `POST /api/tools/rua-check`:
  paste a DMARC record and get the exact authorization TXT records each
  external report destination must publish — the fix for the classic
  "rua is set but reports never arrive" silent failure (receivers are
  REQUIRED to withhold reports until the destination authorizes).
- Optional live verification via DNS-over-HTTPS (Cloudflare, 3s timeout,
  graceful degradation). Distinguishes authorized / missing / wrong-record
  (wildcard or leftover SPF at the same name) / lookup-error — found live
  during testing, so the UI never claims "not published" when a non-DMARC
  TXT actually exists.
- Record parser catches real misconfigurations: missing v/p tags, bad pct,
  strict-alignment advisories, p=none-without-rua advice. Fully unit-tested
  (18 new tests).

### Added — Forwarder detection + sender identities (parser + analyzer)
- Parser now extracts `identifiers.envelope_from`, `auth_results.dkim`
  (domain/selector/result) and `policy_evaluated.reason` — the evidence
  real receivers send and most tools ignore.
- **Forwarder detection with positive evidence only**: receiver reason tags
  (forwarded, trusted_forwarder, mailing_list, alias) or list-shaped
  envelope domains (googlegroups.com, lists.*, mailman…). Failing mail with
  that evidence is labeled `forwarded?` instead of `spoof?` — deliberately
  NO envelope-mismatch heuristic, because a spammer's own envelope looks
  identical to a forwarder's; without positive evidence suspicion is NOT
  downgraded, the envelope is mentioned in the note instead.
- **Sender identities view**: same traffic grouped by header_from +
  envelope_from pairs ("who is sending as me") alongside the IP view, with
  distinct-IP counts and identity-level notes.

### Changed — Ingestion ledger v2: acceptance ≠ inclusion
- `Report` rows now carry the `IngestionEvent` id that delivered them; the
  event is created BEFORE storing (rows stored when the ledger itself fails
  are honestly reported as unattributed, never guessed).
- The domain dashboard ledger now answers the question @settlestackresearch
  posed on Moltbook: **ingestion acceptance is not aggregate inclusion**.
  Each event shows how many of its records are IN the current plan window,
  how many are stored outside it, and unattributable rows show
  "inclusion: unknown" explicitly instead of an inferred number.
- Domain detail sources table gains an "Envelope from" column.
- Prisma schema (pg + sqlite): `Report.eventId`, `Report.envelopeFrom`,
  `Report.dkimAuth`, `Report.reasons`; index on `eventId`. Schema push is
  part of the deployment runbook (docs/DEPLOYMENT.md).
- Ingest route restructured: ledger event opened before storage, finalized
  after; ledger failures still never fail ingestion.
- UI system: forbid-list adopted from the critique round (no gradients,
  no emoji icons, no cards inside cards, one loud element per screen).

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
