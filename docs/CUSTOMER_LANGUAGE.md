# Customer Language — what the market actually says

updated: 2026-10-07 (session 20 pass added rows marked ●) · source: public web
pages, vendor docs, review sites, forums (searched 2026-10-07). Verbatim
phrases kept in quotes; every line traces to a public source found via search
(raw search JSON: brain repo `product-lab/raw/s20*.json`). Purpose: our
product copy should use THEIR words, not ours.

## Pain 1 — the reports are unreadable

| Who says it | Verbatim | Our copy response |
|---|---|---|
| Valimail | reports are "notoriously complex and overwhelming at first glance" | Landing hero already says "plain-language". Keep "overwhelming" out of OUR copy — describe the outcome instead: "know in one screen what failed and why". |
| EasyDMARC (own marketing!) | "XML files and email sender headers can get overwhelming. A third-party service like..." | The pain is the market's own lead message. Our free analyzer targets exactly this sentence. |
| MXToolbox | volume of reports "can quickly become overwhelming, to the point where the inbox is getting..." | Ingestion URL (not a mailbox) + ledger = "your inbox stays out of it". |
| Google Workspace docs | "Reports can be difficult to read and interpret in raw format. We recommend using a third-party service" | Google itself sells our category. Quote-shaped trust: the problem is acknowledged at the platform level. |
| ● Shopify Community | "Is DMARC record really as simple as it sounds?"; "Shopify Emails Going to Spam with DMARC Policy Quarantine Enforced" | Merchants say "simple" and mean "is it safe to touch". Enforcement without evidence breaks their own mail — our pass-rate guidance is the answer; e-commerce is a confirmed-confusion segment (signal 14). |
| ● Klaviyo Community | "We keep receiving messages from Klaviyo that we need to do the following steps: Branded Sending Domain; Aligned Domain; DMARC Setup" | Platform mandates arrive as a task list the merchant can't evaluate. Copy angle: "what these emails are actually asking of you". |

## Pain 2 — reports never arrive (the §7.1 silent failure)

| Who says it | Verbatim | Our copy response |
|---|---|---|
| Mailreach | "Always verify reports are arriving within a few days of publishing... check this authorization requirement" | Our `/tools/dmarc-record` checker turns "check this requirement" into copy-paste records. |
| Mimecast docs | "required to correctly set up external domain verification on your DMARC report receiving domain" | Enterprise vendors write KB articles; we ship the checker. That contrast IS the positioning. |
| NHIMG (blind deployment) | "the most common failure is simple: the rua or ruf destination is missing, broken, or routed to a mailbox or vendor process that nobody monitors" | Guided compliance mandate: every destination gets an authorization record + a ledger row. |

## Pain 3 — per-domain pricing explodes

| Who says it | Verbatim | Our copy response |
|---|---|---|
| emailwarmup.com review | "Pricing escalates quickly — expensive for multi-domain environments. Free tier severely limited (14-...)" | Starter $7 for 3 domains sits directly against "$24/mo for 2 domains". Say the numbers on the pricing page, not "affordable". |
| dmarcguard.io | "If your DMARC monitoring tool charges per domain, costs escalate fast" | Our pricing page should lead with the multi-domain table. |
| dmarctrust | "$24 a month for Basic (2 domains) jumps to $240 a month for Plus (8 domains)" | 10x price for 4x domains — the exact gap our $7/$19 ladder attacks. |
| Vendr (Red Sift) | "$3,000–$5,000 annually for small deployments (1–5 domains...)" | Enterprise tooling for SMB reality. |
| ● Whirlpool forums (Jan 2024) | "I have tried dmarcian – the UI leaves a lot to be desired and so I'm after suggestions for solutions with decent easy to use UI and pricing that…" | A real user publicly asking for exactly our two differentiators (usable UI + better price). Strongest individual demand quote so far (signal 13) — still one person, still not our user. |
| G2 reviews | "Users feel that the product is expensive, with limited value for larger organizations and high pricing model pressures" | "Limited value" + "expensive" co-occur — price is only a complaint when value is unclear. Guided compliance is the value answer. |
| Reddit (snippet, 2026-10-07; URL unresolved) | "DMARC reports are basically a shadow IT detector. Marketing buys some SaaS that sends mail, you see it in the aggregate…" | Admins already TELL US the value story: the report exposes senders the org didn't know it had. Never invent a feature story — mirror theirs: "see every service sending as you". (2026-10-07 MXToolbox anchor: $129/mo for 5 domains makes our $7/3 legible.) |
| ● Reddit (2nd sighting, via DmarcDkim.com mention; URL unresolved) | "DMARC reports are basically a shadow IT detector. Skip the hours of convincing, just send a checker" | Same framing twice independently = pattern. New use case verbatim: the checker as an internal selling tool — run /tools/dmarc-record for the boss, not just for DNS. |
| ● dmarcdkim.com | "Typical failure points are missing legitimate senders, broken alignment between SPF, DKIM, and From…" | "Missing legitimate senders" = the forgotten-infrastructure pain in the market's own words; our forwarder/grouping work is directly named. |

## Language rules for our copy (drawn from the above)

1. Never use "overwhelming/complex" in our own copy — name the OUTCOME the
   reader gets; let the pain stay theirs.
2. Use concrete numbers where competitors use adjectives ("$7 for 3 domains,
   not $24 for 2").
3. Say "reports" the way owners say it ("did they arrive?", "what do I do
   with them?") — not "aggregate XML telemetry".
4. The checker/ledger language mirrors the user's questions: "reports aren't
   arriving" → checker; "did you actually process my report?" → ledger.
5. MSP/agency copy (later, Studio tier): lead with the multi-domain table,
   not features.

## Where these fit in the product

- Landing hero subheadline → Pain 1 outcome phrasing (already aligned).
- New: link the §7.1 checker from the pricing page ("and the fix is free").
- Dashboard empty states already ask "reports not arriving?" — add a direct
  link to /tools/dmarc-record (small copy change, big path shortening).
