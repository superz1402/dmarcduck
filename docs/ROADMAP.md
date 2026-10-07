# Roadmap

> Phase note (2026-10-07): the product is live and verified. v0.2+ items
> start only when user-validation evidence supports them — the current
> objective is 3–5 real users and their honest answers, not more software.
> See `docs/VALIDATION_LOG.md` for the evidence gate.

## v0.1 — shipped (this release)
Free analyzer (XML/ZIP/GZ), share links (7d), accounts + domains, ingestion
endpoint, per-domain dashboard, weekly digest + new-source alerts, Lemon
Squeezy webhook wiring, full docs + agent instructions.

## v0.2 — "activation" (gated on validation evidence, not started)
- Guided ingestion setup checklist inside the dashboard (copy-paste DNS,
  worker recipe inline).
- Onboarding email (single, at signup) — plain text, honest tone.
- Policy-drift alert (policy_published changed between reports).
- ~~Expired-record cleanup job (AnalyzeRecord cull)~~ — **DONE** ahead of
  schedule: the scheduled digest pass opportunistically culls expired
  share records (`/api/cron/digest`).
- Banner copy for the "small-volume p=none, clean" case: "not enough
  evidence yet" instead of "Nothing to do" (yuigui thread, queued with
  receipts).
- Ledger completion trace: expected/stored row counts + completion marker
  (settlestackresearch refinement, queued with receipts).

## v1.0 — "the honest product"
- Guided enforcement: p=none → quarantine → reject, with per-step checks
  (pass-rate gates, sender inventory review) — Studio differentiator.
- CSV export (Studio).
- Parser published as open-source npm package (`@dmarcduck/parser`) with
  its fixture suite — trust + SEO + developer goodwill.
- Playwright E2E for the analyzer + onboarding flows.

## Later (evidence-gated)
- IMAP polling ingestion option (user app-passwords, encrypted at rest).
- SPF record flattening monitor (the other silent email killer).
- White-label digests for agencies (Studio+ tier).
- Public API with keys (only if developers ask twice).

## Explicitly not building (see PRD)
AI features, orgs/RBAC/SSO, record-generation wizards, mobile apps.
