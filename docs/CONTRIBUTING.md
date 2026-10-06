# Contributing

The primary developer is an AI agent (with a human owner); outside
contributors are welcome and this doc applies to all three equally.

1. Read `AGENTS.md` first — it encodes the deliberate decisions.
2. Small PRs. One behavior per PR, with the docs it touches.
3. Parser changes require a fixture (see docs/TESTING.md).
4. UI changes follow docs/UI_SYSTEM.md; include a mobile-width screenshot.
5. `npx tsc --noEmit && npm run lint && npm test && npm run build` green
   before review.

Report issues with: what you did, what you expected, the actual output
(JSON logs help enormously — they are structured on purpose).
