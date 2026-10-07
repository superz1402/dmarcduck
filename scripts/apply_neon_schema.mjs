// Apply the generated DDL to Neon production via the HTTPS SQL endpoint.
// Runs from IPv4-only sandboxes: node resolves AAAA first, so we force
// ipv4first. The serverless driver needs no raw TCP at all.
import { neon } from "@neondatabase/serverless";
import fs from "node:fs";

const uri = fs
  .readFileSync("/home/z/my-project/scripts/.neon_uri_direct", "utf8")
  .trim();
const sqlText = fs.readFileSync("/tmp/neon_init.sql", "utf8");

const statements = sqlText
  .split(/--+\s*\n|^-- /m)
  // split on Prisma comment markers: "-- CreateSchema", "-- CreateTable" etc.
  .filter((chunk) => chunk.trim().length > 0);

// Safer split: on lines that are exactly "-- Something"
const parts = [];
let current = [];
for (const line of sqlText.split("\n")) {
  if (/^-- /.test(line)) {
    if (current.length) parts.push(current.join("\n"));
    current = [];
  } else {
    current.push(line);
  }
}
if (current.length) parts.push(current.join("\n"));
const batches = parts.map((p) => p.trim()).filter(Boolean);

const sql = neon(uri);

async function main() {
  console.log(`applying ${batches.length} statement batches...`);
  for (const [i, batch] of batches.entries()) {
    const label = batch.split("\n").find((l) => l.trim())?.slice(0, 60) ?? "?";
    try {
      await sql.query(batch);
      console.log(`  ok [${i + 1}] ${label}`);
    } catch (err) {
      const msg = String(err?.message ?? err);
      if (/already exists/i.test(msg)) {
        console.log(`  skip (exists) [${i + 1}] ${label}`);
        continue;
      }
      console.error(`  FAIL [${i + 1}] ${label}\n  -> ${msg}`);
      process.exit(1);
    }
  }

  // Verify
  const rows = await sql.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema='public' ORDER BY table_name`
  );
  console.log(
    "tables in public schema:",
    rows.map((r) => r.table_name).join(", ")
  );
}

main().catch((e) => {
  console.error("fatal:", e?.message ?? e);
  process.exit(1);
});
