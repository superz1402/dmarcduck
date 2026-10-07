# Testing

Runner: Vitest (`npm test`). Philosophy: logic gets fixtures; flows get
manual verification; UI gets browser smoke (see DEVELOPMENT.md loop).

## What is covered

- `tests/parser.test.ts` — the crown jewels:
  - well-formed Google/Yahoo/Outlook-shaped reports (fixtures)
  - multiple `<record>` rows, missing optional fields
  - concatenated `<feedback>` documents
  - non-DMARC XML → null + warning (never throws)
  - ZIP and GZ expansion
  - aggregation: volume, per-IP rollup, provider rollup, health scoring,
    spoof-suspicion logic, p=none move-to-quarantine hint, empty uploads
- `tests/record.test.ts` — report record parsing: auth_results / reasons /
  envelope_from extraction, forwarder detection shapes
- `tests/digest-window.test.ts` — digest idempotency boundaries (6 tests):
  no marker, recent/old/exactly-7d marker, future-marker clock-skew clamp,
  window inclusivity

Suite total: **39/39** under Vitest 5.

## Adding a fixture (when real-world parsers break)

1. Capture the raw XML into `tests/fixtures/<provider>-<quirk>.xml`
   (anonymize: swap customer domains/IPs — keep the structural quirk).
2. Add a test asserting the exact parsed shape.
3. Fix the parser; all fixtures must stay green.

Golden rule: the parser returns data or warnings — never throws. A new
"impossible" report from a provider is a fixture, not a crash.

## What we deliberately don't auto-test (yet)

- Browser E2E (Playwright) — planned with v1.0 onboarding work.
- The cron endpoint itself is thin over `digest-window.ts` (unit-tested) +
  `sendMail`; end-to-end behavior was verified in production by dispatching
  `digest.yml` twice (identical `{digestsSent:0}`, no duplicate markers).
