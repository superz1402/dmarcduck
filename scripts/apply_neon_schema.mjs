// Apply Prisma-generated DDL to the production Neon database over the HTTPS
// SQL endpoint (no raw TCP, no native driver needed).
//
// Why not `prisma db push`? The Prisma CLI resolves the DB host to an IPv6
// address first; IPv4-only environments (this sandbox, GitHub Actions runners)
// then fail with P1001 "Can't reach database server". The neon serverless
// driver talks HTTPS on 443 and, with ipv4first DNS ordering, works anywhere.
//
// Usage:
//   DATABASE_URL=postgres... node scripts/apply_neon_schema.mjs /tmp/init.sql
// DDL is generated with:
//   npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
import { neon } from "@neondatabase/serverless";
import fs from "node:fs";

const uri = (process.env.DATABASE_URL ?? "").trim();
if (!uri.startsWith("postgres")) {
  console.error("DATABASE_URL env var (postgres://...) is required");
  process.exit(1);
}
const sqlFile = process.argv[2];
if (!sqlFile) {
  console.error("usage: node scripts/apply_neon_schema.mjs <ddl.sql>");
  process.exit(1);
}
const sqlText = fs.readFileSync(sqlFile, "utf8");

// Split on Prisma's "-- Statement" marker lines; each batch is one statement.
const batches = [];
let current = [];
for (const line of sqlText.split("\n")) {
  if (/^-- /.test(line)) {
    if (current.length) batches.push(current.join("\n"));
    current = [];
  } else {
    current.push(line);
  }
}
if (current.length) batches.push(current.join("\n"));
const statements = batches.map((p) => p.trim()).filter(Boolean);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run(sql, batch, label) {
  // Small retry: Neon computes occasionally restart endpoints right after
  // password rotation; give them a moment before giving up.
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await sql.query(batch);
      console.log(`  ok [${label}]`);
      return true;
    } catch (err) {
      const msg = String(err?.message ?? err);
      if (/already exists/i.test(msg)) {
        console.log(`  skip (exists) [${label}]`);
        return true;
      }
      if (attempt === 3) {
        console.error(`  FAIL [${label}] -> ${msg}`);
        return false;
      }
      console.log(`  retry ${attempt + 1}/3 [${label}] (${msg.slice(0, 90)})`);
      await sleep(4000 * attempt);
    }
  }
  return false;
}

const client = neon(uri);
let failures = 0;
console.log(`applying ${statements.length} statements...`);
for (const [i, batch] of statements.entries()) {
  const label = batch.split("\n").find((l) => l.trim())?.slice(0, 60) ?? `#${i}`;
  if (!(await run(client, batch, label))) failures += 1;
}

// Verify
const rows = await client.query(
  `SELECT table_name FROM information_schema.tables
   WHERE table_schema='public' ORDER BY table_name`
);
console.log(
  "tables in public schema:",
  rows.map((r) => r.table_name).join(", ")
);

if (failures > 0) {
  console.error(`${failures} statement(s) failed`);
  process.exit(1);
}
console.log("schema applied");
