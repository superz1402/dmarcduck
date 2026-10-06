# PRD — DmarcDuck

## Problem

DMARC aggregate reports are unreadable XML that every sending domain now
needs to care about (Google/Yahoo 2024, Microsoft 2025 sender requirements).
Small operators either ignore them (email lands in spam, spoofing goes
unnoticed) or pay enterprise prices ($14/domain/mo and up) for dashboards
designed for MSPs.

## Target customer

- Indie SaaS founder with 1–3 sending domains
- Small agency managing client domains
- Consultant / creator with a personal domain + newsletter
- Agent operator with their own domain

Non-customer (by choice): enterprise IT, MSPs, compliance teams.

## Job to be done

"When email I send lands in spam, or someone spoofs my domain, I need to
know what's broken and what to fix — without becoming an email deliverability
engineer."

## Competitive landscape (2026)

| Segment | Players | Gap we fill |
|---|---|---|
| Free one-shot parsers | dmarcian XML-to-Human, EasyDMARC upload, MXToolbox, mailtani | No history, no monitoring, no clarity — lead magnets |
| Enterprise platforms | dmarcian, EasyDMARC, PowerDMARC, DMARC Report, Valimail | Price ($14-40+/mo), complexity, per-domain tax |
| **Middle (1-5 domains, honest pricing)** | — | **empty** |

## Scope

### v0.1 (this release) — "the wedge"
- Free analyzer (XML/ZIP/GZ upload → plain-language dashboard)
- Shareable results (7-day expiry)
- Accounts, domain registration, private ingestion URL
- Automated ingestion endpoint + domain dashboard
- Weekly digest + new-source alerts
- Lemon Squeezy webhook wiring (Starter $7 / Studio $19)

### v1.0 — "the honest product"
- Guided enforcement flow (p=none → quarantine → reject with per-step checks)
- CSV export (Studio)
- Policy drift alerts (policy_published changes between reports)
- Onboarding email course ("DMARC in plain language", 5 emails)
- Free open-source parser npm package (trust + SEO + developer goodwill)

### Explicitly not building
- AI/LLM features (parsing is deterministic; cost and unpredictability are anti-features)
- Multi-tenant orgs / RBAC / SSO (enterprise-shaped; not our customer)
- SPF/DKIM record generation wizards (many good free tools exist)
- Mobile apps (web is enough at this stage)

## Validation ladder (owner directive #18)

| Stage | Question | Metric | Target |
|---|---|---|---|
| 1 | Problem real? | mandates + complaint evidence + market density | ✅ done (research) |
| 2 | People care? | analyzer uploads/month after launch | ≥100/mo |
| 3 | Buildable? | v0.1 shipped | ✅ done |
| 4 | Will they use it? | upload → account conversion | ≥5% |
| 5 | Will they pay? | first paid checkout | 1 within 6 weeks of launch |
| 6 | Acquisition? | build-in-public (Moltbook), SEO long-tail, parser OSS | 3 channels active |
| 7 | Retention? | 4-week domain-monitor retention | ≥40% |

Kill criteria: zero analyzer usage after 4 weeks of honest distribution, or
upload→account conversion <2% after onboarding fixes — revisit the wedge,
not the pricing page.
