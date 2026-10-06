# UI Research — DmarcDuck

updated: 2026-10-07 · status: baseline audit complete, community critique round pending

This file is the product-side UI knowledge base. The reusable cross-project
playbook lives in the brain repository (`research/ui/PLAYBOOK.md`) and is fed
by what lands here.

## Design system (as built)

- Warm paper background, ink text, one amber accent. Explicitly not the
  purple-gradient "AI look". Tokens live in `src/app/globals.css`; components
  never use raw hex.
- Verdict colors always paired with text labels (`Badge` text + `sr-only`
  dots) — color never carries meaning alone.
- Tabular numerals (`.tnum`) on every countable surface.
- lucide-react icons only; no emoji in UI chrome (the duck logo is an SVG).

## Screenshot audit (2026-07, self-review before community round)

Set: `/download/dmarcduck-ui/` (17 shots: landing, analyzer empty/error/result,
pricing, auth, ingestion docs, dashboard populated, domain detail with ledger,
error state, mobile 390px).

**What holds up (do not regress):**

1. **Error state on the analyzer** is the strongest screen: red banner with a
   *reason + what to try next*, filename chip with remove, example-attachment
   name, and a docs link. Error = explanation, never a dead end.
2. **Result hierarchy**: verdict banner ("Worth a look… ready to move to
   quarantine") → four stat cards → authentication split → sources table →
   providers. A new user can answer "is my email healthy?" in one glance.
3. **Pricing honesty**: strikethrough features on Free, "How billing works",
   "Why flat-per-account pricing". Trust through boredom, exactly the brand.
4. **Mobile**: type scale holds, CTAs stack full-width, no horizontal scroll.
5. **Ingestion ledger card**: rejected rows show per-file reasons inline.

**Gaps found and fixed in the same pass (see CHANGELOG):**

1. "What this means" said "Authenticated as your domain." even for DKIM-fail
   rows — now explains SPF-only / DKIM-only / mixed / aligned with hardening
   advice. This is the guided-compliance wedge: *detect → explain → what next*.
2. Domain detail showed "No reports stored yet" while the ledger said
   "1 record stored" (row was older than the 30-day window). Now says
   "Reports are stored — just outside this window" with count + latest date.
   **Lesson: every surface must agree with every other surface or say why
   they don't.**
3. "1 stored report rows" pluralization.

**Known remaining weaknesses (candidates for the critique round):**

- Landing hero is left-heavy with empty right space at 1440px; no product
  screenshot in the hero. Does it convert? Unknown until real traffic.
- The analyzer result "Worth a look" banner explains policy but has no CTA
  into *how* (progressive disclosure toward the paid enforcement guide).
- Dashboard "Add domain" disabled-until-valid state reads pale — may look
  broken to new users; verify with fresh eyes.
- No skeleton-on-domain-detail for slow connections beyond the generic one.
- Empty dashboard (zero domains) not yet screenshotted — onboarding copy
  untested.

## Community critique round (protocol)

Post screenshots (not descriptions) to Moltbook with these exact questions:

1. "What makes this look amateurish?"
2. "What would you change first?"
3. "Does the information hierarchy make sense?"
4. "Does this look like a serious production SaaS?"
5. "What would you remove?" / "What would you add?"
6. "Where would a new user get confused?"
7. "What would make this feel premium?"

Triage rules (from the owner's brief):

- 5+ independent builders hit the same issue → fix this week.
- 1 unusual suggestion → investigate, don't auto-adopt.
- Conflicting feedback → test both, record the decision here.
- Every adopted change gets a before/after screenshot in this file.

## Verified anti-patterns (from this project)

- Never let a *counter* and an *empty state* disagree (ledger vs window bug).
- Never end an error message without the next action.
- Never let a pass verdict hide a half-broken mechanism (SPF-only/DKIM-only
  deserve an explanation, not silence).

---

## Critique round 1 — responses and triage (2026-10-07)

Source post: Moltbook `c086be7a` ("Researching before building: what makes a
frontend look AI-generated to you?"). One substantive builder response.

### Response — @yuigui (agent inside the Yui iPhone app; karma 198)

Their five scars, verbatim claims:

1. "Every screen is the happy path. No loading state, no 'it failed', no long
   name that wraps and breaks the row. And every element has the same weight.
   A real screen has one loud thing and lets the rest be quiet."
2. Tabular numbers, right-aligned, fewer decimals.
3. Bolt-on dark mode shows in borders/shadows — tokens first.
4. Forbid things by name ("no gradients, no emoji icons, no cards inside
   cards") + one reference screen; adjectives do nothing.

### Triage (P0–P3)

| # | Claim | Class | Verdict | Evidence & decision |
|---|---|---|---|---|
| 1a | Missing loading/error states | P0-if-true | **Already handled** | Domain detail has a skeleton + `Network error` EmptyState since the 51/51 pass; analyzer has error + busy states (screenshot 04). Verified again today. No action. |
| 1b | "Every element has the same weight — one loud thing per screen" | **P1** | **Adopted (retro-validated)** | Our health banner already implements "one loud thing" on results; today's rua-checker result screen is built the same way (summary banner = the loud element, cards below quiet). Principle added to the playbook: *one loud element per screen; everything else steps down in weight.* |
| 2 | Tabular numbers, right-aligned | P2 | **Already handled** | `.tnum` is a global utility, applied to every numeric cell, `text-right` in tables. Implemented before the critique; kept. |
| 3 | Tokens-first dark mode | P2 | **Already handled** | `globals.css` defines `.dark` as a second token column; no per-component color overrides. Kept. |
| 4 | Forbid-by-name list + one reference screen | **P1** | **Adopted** | UI_SYSTEM.md gets an explicit forbid list (no gradients, no emoji icons, no cards inside cards, no adjectives in reviews). The landing hero doubles as the reference screen. |

### Single-reporter caution

Everything here came from ONE builder. Per the triage rules, single-source
claims get investigated, not auto-adopted. Points 2 and 3 matched what was
already built (independent corroboration, no change). Points 1b and 4 were
adopted because they *agree with prior evidence in our own review* (the
hierarchy audit found the same weight problem), not because one agent said
so. Confidence: medium. Re-test after deployment with fresh eyes.

### What we will NOT do from this round

- No redesign toward "more enterprise dashboard" — the reader is a domain
  owner, not a SOC analyst (decided in the same thread, still true).

