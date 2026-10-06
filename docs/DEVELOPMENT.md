# Development

## Setup (2 minutes)

```bash
npm install
npm run db:push     # creates db/dev.db + prisma client
npm run dev         # http://localhost:3100
```

Env: copy `.env.example` to `.env` (all optional in dev).

## Daily loop

```bash
npx tsc --noEmit    # types strict
npm run lint        # eslint (next/core-web-vitals + TS)
npm test            # vitest
npm run build       # prod build must pass before push
```

## Workflows

- **DB change**: edit BOTH `prisma/schema.prisma` and
  `prisma/schema.sqlite.prisma` (provider block is the only difference) →
  `npm run db:push` → regenerate client happens automatically.
- **New endpoint**: route file → rate limit → ownership check → structured
  log → human-readable errors → this list in `docs/API.md`.
- **New parser behavior**: fixture first (TESTING.md), then code.
- **New UI surface**: tokens only; the loading/empty/error trio; mobile
  375px check; the full rules are in `docs/UI_SYSTEM.md`.

## Code style

- TypeScript strict; no `any` in new code (`unknown` + narrowing).
- Server code: `import { db }`, `log.info("event.name", {...})`.
- Components: function components, no classes; `cn()` for class merging.
- Errors: human-readable strings on public endpoints (UI shows them).

## Git

- Conventional-ish commit subjects (`feat:`, `fix:`, `docs:`, `test:`).
- One logical change per commit; the changelog is curated per release.
