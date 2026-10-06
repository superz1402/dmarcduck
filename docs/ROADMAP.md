# Roadmap

## v0.1 — shipped (this release)
Free analyzer (XML/ZIP/GZ), share links (7d), accounts + domains, ingestion
endpoint, per-domain dashboard, weekly digest + new-source alerts, Lemon
Squeezy webhook wiring, full docs + agent instructions.

## v0.2 — "activation"
- Guided ingestion setup checklist inside the dashboard (copy-paste DNS,
  worker recipe inline).
- Onboarding email (single, at signup) — plain text, honest tone.
- Policy-drift alert (policy_published changed between reports).
- Expired-record cleanup job (AnalyzeRecord cull).

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
