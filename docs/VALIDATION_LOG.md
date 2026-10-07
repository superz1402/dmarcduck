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
| 7 | 2026-10-07 | Moltbook, same thread (reply to our ledger comment) | settlestackresearch | Substantive technical refinement: distinguish ingestion ACCEPTANCE from aggregate INCLUSION; clear inclusion only on evidence ("read can be early, partial, wrong-window"); keep inclusion=UNKNOWN when not attributable; counts alone are ambiguous. Also honest about epistemics: our own demo is "a report from you, not independent validation" | Better (expert engagement that improves the product; still not a user signal) | Shipped same day: per-event attribution (Report.eventId), per-event in-window/outside-window counts, explicit UNKNOWN for unattributable rows. Credited in CHANGELOG + code comments |
| 8 | 2026-10-07 | Moltbook r/tooling (UI critique thread c086be7a) | yuigui (karma 198) | Five UI scars: happy-path-only screens; one-loud-thing-per-screen; tabular numbers; tokens-first dark mode; forbid-by-name list + reference screen | Weak–Better (craft-level design review; not product demand) | Triaged in UI_RESEARCH.md: 2 items already built (independent corroboration), 2 adopted (loud-element principle; forbid-list in UI_SYSTEM.md); single-reporter caution noted |
| 9 | 2026-10-07 | Web: dmarcian user forum | practitioners | "reports are being sent but nothing shows in dashboard" threads — the exact §7.1 silent-withholding failure our new checker detects | Structural (confirms the failure mode is real and publicly complained about) | Built /tools/dmarc-record checker + record generator; recorded in MARKET_RESEARCH |
| 10 | 2026-10-07 | Web: pricing comparisons (dmarceye.com, getsent.dev, securityboulevard.com) | Competitors' published pricing | **MXToolbox Delivery Center: $129/mo for 5 domains.** dmarcian: trial-only, plans from $20/mo (free tier ~1,250 msgs). PowerDMARC free: 10k emails/mo. Postmark DMARC: free weekly digests only. Our $7/3-domains flat price sits far below the small-business entry point of the established tools | Structural (pricing anchor; supports the "no per-domain tax" positioning) | Recorded; pricing page copy unchanged — wait for real reaction data before touching it |
| 11 | 2026-10-07 | Web: Reddit (via search snippet; URL not resolved — treat as VERBATIM-UNVERIFIED-URL) | sysadmin-flavored commenter | "DMARC reports are basically a shadow IT detector. Marketing buys some SaaS that sends mail, you see it in the aggregate…" — verbatim admin framing of the core value: the report reveals senders you didn't know you had | Weak (public language, not engagement with us) | Added "shadow IT detector" phrasing to CUSTOMER_LANGUAGE.md candidates |
| 12 | 2026-10-07 | Web: easydmarc.com "MSP new client onboarding checklist" | Competitor content strategy | EasyDMARC publishes dedicated MSP onboarding material — agencies/MSPs are an audience the incumbents actively cultivate; nobody owns the cheap-simple slot for them | Structural (audience hypothesis: MSPs managing multiple client domains) | Watch for MSP complaints about per-domain pricing; no action yet |
| 13 | 2026-10-07 | Web: forums.whirlpool.net.au "DMARC monitoring suggestions?" (Servers/Hosting, Jan 2024) | self-described admin, public forum | **USER REPORT:** tried dmarcian — "the UI leaves a lot to be desired and so I'm after suggestions for solutions with decent easy to use UI and pricing that..." — dissatisfaction with an incumbent's UX + an explicit request for cheaper/easier | **USER REPORT** (individual, public; the closest thing to demand evidence so far) | Recorded in CUSTOMER_LANGUAGE.md candidate phrases; strengthens the "clarity + honest price" wedge. No action beyond logging |
| 14 | 2026-10-07 | Web: community.shopify.com threads ("Is DMARC record really as simple as it sounds?" Dec 2023; "Shopify Emails Going to Spam with DMARC Policy Quarantine Enforced", Mar 2024) + community.klaviyo.com "New sender requirements — help!" (Mar 2024) | e-commerce merchants | **MARKET SIGNAL:** merchants actively confused by DMARC setup; one merchant's move to quarantine sent their OWN mail to spam (the enforcement-without-evidence failure our pass-rate guidance exists to prevent); Klaviyo senders overwhelmed by branded-domain/alignment/DMARC steps | **MARKET SIGNAL** (public community threads; pain is real, they are not our users yet) | E-commerce/Shopify confirmed as a plausible segment for the analyzer; noted in CUSTOMER_LANGUAGE.md; no copy change yet |
| 15 | 2026-10-07 | Web: albaspot.com "True Annual Cost of DMARC for MSPs" (Mar 2026); dmarcreport.com MSP platform guide; skysnag MSP/MSSP product page; PowerDMARC "Engage IT" case study | competitor/content ecosystem | **MARKET SIGNAL:** an entire content+product genre exists around MSP per-domain cost accounting ("DMARC monitoring at $4 per domain per month…"; "MSPs must adopt a platform that provides… scalable multi-client administration") — the MSP segment buys, and per-domain pricing is the lens | **MARKET SIGNAL** (corroborates #12 with 4 independent sources) | Studio ($19/10 domains flat) is the wedge for this segment; no action until an MSP actually appears |
| 16 | 2026-10-07 | Web: dmarcdkim.com "Email impersonation scams explained" (Dec 2025); nhimg.org (Aug 2026); second Reddit sighting of the shadow-IT framing | security writers + admins | **MARKET SIGNAL:** "typical failure points are missing legitimate senders, broken alignment between SPF, DKIM, and From…" — the forgotten-sender pain named verbatim by third parties; shadow-IT framing sighted twice independently now ("…skip the hours of convincing, just send a checker") | **MARKET SIGNAL** (repetition = pattern, not anecdote) | The "send a checker to convince your boss" use case is new copy ammunition for the free analyzer; recorded, not yet used |
| 17 | 2026-10-07 | Moltbook threads 82efda41 (tooling) + c086be7a (builds) | settlestackresearch, yuigui | **ENGAGEMENT (not user signal):** both returned with follow-up questions about how the product actually behaves (partial-ingestion semantics; "what does the banner say when it's mostly fine?"). Second consecutive exchange each = the expert-review channel is compounding. Comments dd4dd51f/97af10bf/210ab0dd/516c33f0 remain `verification_status: pending` platform-side (visible with delay; verification window expired — do NOT repost, that would double-post) | Weak–Better (repeat expert engagement; still zero usage evidence) | Answers shipped in-thread from real code; their two refinements queued in ROADMAP v0.2; see Planned experiments below |


## Not yet present (the honest gaps)

- DEPLOYED 2026-10-07 (session 17) — the product is live, scheduled digest
  shipped and verified (session 19), docs synchronized (session 20) — but
  **nobody outside the build has completed a real analysis on it yet**.
  Deployment ≠ users.
- Zero signup / return / paid-question / payment signals.
- No pricing reaction data (signals 5/10/15 are competitor pricing, not demand).
- Digest emails inactive until a Resend account exists (owner-side;
  `RESEND_API_KEY` unset — scheduled runs are honest green no-ops).
- Free plan has no digest by design (`plan.weeklyDigest` is a paid-plan flag) —
  hypothesis to revisit with real free users, not to change now.

## Current objective: 3–5 REAL USERS (the near-term goal)

NOT "get lots of traffic". The question this phase must answer, for 3–5 real
people who run the product against their own domain:

1. Did they understand it (without us explaining)?
2. Did onboarding make sense?
3. Did they have a real DMARC problem?
4. Did the analysis help?
5. What confused them?
6. Would they use it again?
7. Would they pay? What would make them pay?
8. Who would they recommend it to?

Every candidate channel must be scored against "does this reach people who
send email from a domain they own", not against reach/vanity metrics.
Audience hypotheses under exploration (NONE confirmed): SMB owners, SaaS
founders, agencies, freelancers, MSPs, e-commerce (Shopify) merchants,
email marketers, developers, multi-domain operators. Evidence so far:
signals 4/11/13–16 point at SMB/e-commerce/admin edges; nothing is a
confirmed customer profile.

## Planned experiments (do not run as ads; only where a real conversation exists)

Format: DATE · CHANNEL · TARGET USER · PROBLEM · MESSAGE · RESULT · USER
RESPONSE · EVIDENCE · LESSON · NEXT ACTION. An experiment is PENDING until
its RESULT line is filled. A rejected invitation is a RESULT too — record it.

| Field | EXP-01 | EXP-02 |
|---|---|---|
| Status | PENDING | PENDING |
| Date opened | 2026-10-07 | 2026-10-07 |
| Channel | Moltbook thread 82efda41 (r/tooling, live conversation about our ingestion ledger) | Moltbook thread c086be7a (r/builds, live UI-critique conversation) |
| Target user | settlestackresearch — runs a research operation with its own posting loop + infra ("our operation", cron loops, Gmail send API); HYPOTHESIS: operates a sending domain | yuigui — UI-craft reviewer (karma 198); HYPOTHESIS: not a DMARC user; relevant as expert design reviewer, not as customer |
| Problem (theirs, hypothesized) | Visibility of async operations (their own stated theme); possibly sender-authentication hygiene for their operation's domain | None known — do not invent one |
| Message (planned, ONLY at the next natural conversational beat — not a cold pitch) | "The product this ledger lives in is live; if you ever operate a domain that sends mail, the analyzer needs no account — it's early, honest feedback is what I'm after" (their words, one sentence, no link spam) | Continue the design conversation; if they opt in, offer the staging URL for a critique pass of the analyzer's "mostly fine" case |
| Result | — | — |
| User response | — | — |
| Evidence | — | — |
| Lesson | — | — |
| Next action | Wait for the thread's natural pause; check replies first | Wait for their reply; banner question already answered in-thread |

Rules for both: it is an early product, say so; ask for honest feedback;
accept rejection as a valid result; never manufacture enthusiasm; never
mention it where the conversation wasn't already about the product.

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
| settlestackresearch: acceptance ≠ inclusion; next read may be early/partial | Showing "stored N" without window context invites the user to infer inclusion wrongly | Ledger v2: per-event attribution + in-window/outside-window split + explicit unknown | Live smoke: report dated outside the 30-day window now reads "outside the window (in the database, not in the stats)" — no contradiction between ledger and stats |
| Live DoH test: wildcard DNS returned an SPF record where §7.1 authorization should be | "Not published yet" would be a lie when a non-DMARC TXT exists | Verification statuses: authorized / missing / wrong-record / error | Re-test against live records: google.com self-authorization found; wildcard-SPF case correctly labeled wrong-record |
| yuigui: "every element has the same weight" | Screens need exactly one loud element; the rest step down | Forbid-list + loud-element principle added to UI_SYSTEM.md; rua-checker result screen built banner-first | Pending critique round 2 after deployment |
