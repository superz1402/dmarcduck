# Database

Dev: SQLite (`prisma/schema.sqlite.prisma`, file `db/dev.db`, zero setup).
Prod: Postgres (canonical `prisma/schema.prisma`; Neon free tier documented
in DEPLOYMENT). Schemas are identical apart from the provider block — keep
them in sync or delete the SQLite one.

## Models

- **User** — email (unique), passwordHash (bcrypt), timestamps.
- **Session** — cuid id, userId, expiresAt; cookie holds the id. Cascade on
  user delete. Index on userId.
- **Domain** — userId, name (unique per user), `mailboxToken` (unique — the
  capability URL token), policy (none/quarantine/reject, from the user's
  published policy; editable later).
- **Report** — one row per `<record>` per ingested report: domainId,
  reportMeta (provider's report id), orgName (reporting provider), sourceIp,
  count, spf/dkim (policy_evaluated verdicts), aligned (bool: either pass),
  headerFrom, seenAt (= date_range.begin). Indexes: (domainId, seenAt),
  (domainId, sourceIp), plus a UNIQUE (domainId, reportMeta, sourceIp, seenAt,
  count) — the cross-request duplicate guard: re-sent reports never double-count.
- **AnalyzeRecord** — shareable analyzer results; nanoid(12) id, JSON payload,
  expiresAt = +7d. (Cull expired rows opportunistically; volume is low.)
- **IngestionEvent** — the ingestion ledger: one row per delivery attempt
  (status processed/partial/rejected, filesReceived, reportsParsed,
  recordsStored, duplicatesSkipped, mismatchSkipped, JSON rejects). Answer the
  question "did DmarcDuck actually process my report?" — never silently.
- **AlertEvent** — domainId, type (new_source|...), JSON payload, emailedAt.
- **Subscription** — userId (unique), status, plan, provider, externalId,
  currentPeriodEnd. Entitlements derive from this via `src/lib/plan.ts`.

## Retention rules

- AnalyzeRecord: 7 days from creation (hard-coded, honest).
- Report rows: bound to domain; domain deletion cascades everything.
- Plan history windows (30d free / 395d paid) are applied at READ time.

## Conventions

- Access via `import { db } from "@/lib/db"` (singleton).
- Ownership checks in the route handler (see `/api/domains/[id]`).
- Migrations: `prisma db push` for now (single-operator stage); switch to
  `prisma migrate` before v1.0.
