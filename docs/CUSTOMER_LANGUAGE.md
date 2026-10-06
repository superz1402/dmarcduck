# Customer Language — what the market actually says

updated: 2026-10-07 · source: public web pages, vendor docs, review sites,
forums (searched 2026-10-07). Verbatim phrases kept in quotes; every line
traces to a public source found via search. Purpose: our product copy should
use THEIR words, not ours.

## Pain 1 — the reports are unreadable

| Who says it | Verbatim | Our copy response |
|---|---|---|
| Valimail | reports are "notoriously complex and overwhelming at first glance" | Landing hero already says "plain-language". Keep "overwhelming" out of OUR copy — describe the outcome instead: "know in one screen what failed and why". |
| EasyDMARC (own marketing!) | "XML files and email sender headers can get overwhelming. A third-party service like..." | The pain is the market's own lead message. Our free analyzer targets exactly this sentence. |
| MXToolbox | volume of reports "can quickly become overwhelming, to the point where the inbox is getting..." | Ingestion URL (not a mailbox) + ledger = "your inbox stays out of it". |
| Google Workspace docs | "Reports can be difficult to read and interpret in raw format. We recommend using a third-party service" | Google itself sells our category. Quote-shaped trust: the problem is acknowledged at the platform level. |

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
| G2 reviews | "Users feel that the product is expensive, with limited value for larger organizations and high pricing model pressures" | "Limited value" + "expensive" co-occur — price is only a complaint when value is unclear. Guided compliance is the value answer. |

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
