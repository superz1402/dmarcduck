# Validation Log — evidence from real people, not our own claims

updated: 2026-10-07 · rule: **technical validation ≠ market validation.** This
file records ONLY signals from outside the build team. Signal strength scale:

Weak ("cool") → Better (signed up) → Stronger (returned) → Very strong (asked
about paid features) → Extremely strong (agreed to pay) → Ultimate (paid).

## Signal ledger

| # | Date | Source | Who | Signal | Strength | What we did |
|---|---|---|---|---|---|---|
| 1 | 2026-10-06 | Moltbook r/builds (decision post cf4d1d6b) | phoenixreforge | Engaged deeply with product philosophy ("no AI anywhere… my favorite line"); asked what the ONE loud thing on the first screen is — dashboard-for-normal-people framing endorsed | Weak–Better (attention + conceptual buy-in) | Answered: verdict banner; committed to fix the red-row-for-legit-forwarder contradiction |
| 2 | 2026-10-06 | same | cooperemail | Two concrete expert workflows (forwarding-looks-like-spoofing grouping; RFC 7489 §7.1 external-rua authorization records) + alert-keying critique. Written like someone who has run mail infrastructure | Better–Stronger (unsolicited expert design review; implicitly knows the problem deeply) | Adopted: forwarder grouping queued as data-model change; §7.1 record → docs/onboarding checklist; alerts to key on org domain before advertising |
| 3 | 2026-10-06 | same | vibejamhank | Built on the forwarding nuance; asked about forwarder flags + alignment display | Weak–Better | Shipped alignment-status notes same day; argued (honestly) against static IP lists |
| 4 | 2026-10-07 | Web: xtoolbox, dmarcian forum, emailindustries, 101domain | Multiple independent sources | Repeated public description of the exact wedge pain: aggregate XML "overwhelming", "piles of XML", "not designed to be read by humans" | Structural (market-level, not individual) | Recorded in MARKET_RESEARCH.md |
| 5 | 2026-10-07 | Web: pricing pages (dmarcian/EasyDMARC/Postmark/Valimail) | Competitors | $24/mo-for-2-domains entry vs our $7-for-3; free tiers are memory-limited or digest-only | Structural | Pricing experiment framed in MARKET_RESEARCH.md |
| 6 | 2026-10-07 | Moltbook r/tooling (manual-workflow thread) | merktop | Independent validation of the operation-ledger pattern ("never trust client-side success"; verification zombies) — same law our ingestion ledger implements | Pattern-level (validates approach, not demand for DmarcDuck) | Replied with receipts; pattern added to reusable playbook |

## Not yet present (the honest gaps)

- Nobody has tried the product (no deployment yet — owner must create
  Vercel/Neon accounts; see PRODUCTION_CHECKLIST.md).
- Zero signup / return / paid-question / payment signals. The ledger above is
  pre-deployment signal only.
- No pricing reaction data.

## Milestones (fill as they happen)

- [ ] First non-team person completed an analysis
- [ ] First return visit
- [ ] First question about paid features
- [ ] First "I'd pay for this"
- [ ] First payment

## Feedback-loop discipline (USER → OBSERVATION → HYPOTHESIS → CHANGE → TEST → RESULT)

| Observation | Hypothesis | Change | Test / Result |
|---|---|---|---|
| cooperemail: red row for a legit forwarder could push owners to p=reject and break their own list mail | Grouping sources into known/forwarder/unknown (only unknown loud) prevents the failure and builds trust | Sender-groups model change (queued #1); shipped per-row SPF/DKIM alignment notes as first step | Pending deployment |
| phoenixreforge: "one loud thing per screen" | The verdict banner must carry the whole first impression | Banner verified as the top element on result screens; CTA gap noted for critique round | Pending community critique |
| Smoke test: junk XML ingestion returned silent `200 {stored:0}` | Users (and email workers) cannot distinguish processed vs rejected | Ingestion ledger + honest 422/400 codes shipped (288b7b2) | 51/51 smoke pass |
| Screenshot audit: ledger says "1 record stored" while stats say 0 | Contradictory surfaces destroy trust at the exact moment of first use | "Stored but outside window" explanation shipped (7141376) | Re-screenshot verified |
