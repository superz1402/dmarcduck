# Market Research — DMARC monitoring (continued surveillance)

updated: 2026-10-07 · method: web-search battery (12 queries, results in
`/tmp/research/*.json` summarized here); to be re-run monthly per ROADMAP.

## Regulatory tailwind (why now — re-verified 2026-10)

- Google/Yahoo: DMARC + SPF + DKIM required for bulk senders since **Feb 1,
  2024** (5,000+ msgs/day to Gmail).
- Microsoft: same class of requirements for Outlook.com high-volume senders
  since **May 5, 2025**.
- Enforcement is active and permanent (reject policies increasingly expected).
  Every sending domain now receives aggregate XML nobody reads — the wedge
  problem is growing, not shrinking.

## Competitor pricing map (2026-10 snapshot)

| Product | Entry paid | Domains at entry | Notes |
|---|---|---|---|
| dmarcian | $19.99–24/mo | 2 (+100k msgs/mo) | Plus tier jumps to $199–240/mo (8 domains); observed SMB average spend $1,980/yr (SpendHound); enterprise $15,785/yr avg |
| EasyDMARC | €35.99–44.99/mo | 2 | Free = 1 domain, **14-day** report window; per-domain scaling; not MSP-friendly at scale (dmarcreport.com) |
| Postmark DMARC digests | $0 | 1 | Free weekly digest only — the free-tier competitor for our entry wedge |
| Valimail Monitor | $0 → quote | 1 | Free visibility, enforcement sold enterprise-style |
| DMARCReport / PowerDMARC / Palisade / PlainDMARC / dmarcguard / sendops | ~$8–250/mo | varies | Active SMB/MSP-focused entrants — the category is hot, differentiation is on clarity + price |
| Industry per-domain norm | **$14/domain/mo** | — | (Postmark's own description of the market norm) |

**The gap DmarcDuck occupies is confirmed**: 1–5 domain operators face
either a 14-day-memory free tier (EasyDMARC), a digest-only free tier
(Postmark), or $24/mo-for-2-domains entry (dmarcian). Flat $7/3 domains +
$19/10 domains with 13-month history undercuts every paid entry point while
staying above "free lead magnet" quality.

## Pain-signal evidence (quotes from the wild)

- "DMARC aggregate reports are difficult to tackle on your own. If you try to
  decipher them by yourself, you'll likely become **overwhelmed and
  frustrated** quickly." — xtoolbox.com
- "Use a service like dmarcian so that you aren't trying to read **piles of
  XML reports**." — dmarcian community forum
- "raw aggregate reports are **not designed to be read directly by humans**" —
  emailindustries.com
- HN threads on deliverability name **cost and technical complexity** as the
  biggest objections to existing stacks.
- MSP angle: per-domain pricing "**scales linearly**" and is "**not
  MSP-friendly at scale**" — multi-domain flat pricing is a wedge for
  consultants too, not just indies.

## Pricing hypothesis update (test in market, don't assume)

- $7 Starter (3 domains) sits 3× below dmarcian's 2-domain entry and ~5×
  below EasyDMARC's — believable "no-brainer" position.
- Risk found: **Postmark's free digest** covers the "cheap automation" need
  for 1-domain users. Our Starter must beat it on: multi-domain, full
  dashboard (not just email), ingestion ledger, guided notes. Free tier
  (analyzer + 1 domain manual) remains the acquisition path.
- Don't compete on price alone: the differentiator stack is simplicity +
  guided remediation (SPF-only/DKIM-only explanations, forwarder grouping
  next) + honest operations (ledger). cooperemail's feedback (Moltbook) is
  the roadmap for exactly this.

## Open questions for validation log

1. Will 1–3 domain operators actually pay $7/mo, or is Postmark-free "good
   enough" for that segment? (Needs real signups + pricing-page behavior.)
2. Do MSPs/consultants with 5–20 client domains find us (Studio $19 = 10
   domains), and is 10 domains enough for them?
3. Does the free analyzer convert to monitoring at 2–5%? (Industry-typical
   free→paid for dev tools; DMARC urgency should push higher.)
