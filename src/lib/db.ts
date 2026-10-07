import { PrismaNeonHTTP } from "@prisma/adapter-neon";
import { PrismaClient } from "./prisma-client";

// IMPORTANT: PrismaClient comes from ./prisma-client (the generated WASM
// entry), NOT from "@prisma/client" directly. The default entry hardwires the
// native binary query engine, which cannot load on Cloudflare Workers
// (workerd) — verified live 2026-10-07 ("could not locate the Query Engine
// for runtime debian-openssl-1.1.x"). See src/lib/prisma-client.ts for the
// full rationale (including the Prisma ./wasm packaging bug).

// Prisma client singleton (avoids connection storms in dev hot-reload).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Cloudflare Workers has no raw TCP sockets, so Postgres access must go through
// the Neon serverless HTTP driver (PrismaNeonHTTP = pure fetch, Workers-safe).
//
// Env resolution per runtime:
// - Workers (production + `vite dev` via the cloudflare plugin): secrets are
//   Worker bindings, exposed by vinext through `env` on "cloudflare:workers".
//   process.env is NOT populated there (verified live 2026-10-07 — the Worker
//   booted with an empty process.env and Prisma fell back to the native engine).
// - Node (tests, local sqlite dev): DATABASE_URL may point at a Neon URL (HTTP
//   adapter also works from Node) or be absent for the zero-setup sqlite flow.
function isWorkersRuntime(): boolean {
  const g = globalThis as {
    WebSocketPair?: unknown;
    navigator?: { userAgent?: string };
  };
  return (
    typeof g.WebSocketPair !== "undefined" ||
    g.navigator?.userAgent === "Cloudflare-Workers"
  );
}

// Non-literal specifier + @vite-ignore: Node-side tooling (vitest, vite dev
// import analysis) must never try to resolve this module; workerd resolves it
// natively at runtime.
async function importCloudflareWorkersModule(): Promise<{
  env: Record<string, string | undefined>;
}> {
  const specifier = ["cloudflare", "workers"].join(":");
  return import(/* @vite-ignore */ specifier) as Promise<{
    env: Record<string, string | undefined>;
  }>;
}

async function createClient(): Promise<PrismaClient> {
  const log: ("warn" | "error")[] =
    process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"];

  if (isWorkersRuntime()) {
    const { env } = await importCloudflareWorkersModule();
    const url = env.DATABASE_URL ?? "";
    if (!url.startsWith("postgres")) {
      throw new Error(
        "Worker runtime: the DATABASE_URL secret is missing — run `wrangler secret put DATABASE_URL`."
      );
    }
    return new PrismaClient({ adapter: new PrismaNeonHTTP(url, {}), log });
  }

  const url = process.env.DATABASE_URL ?? "";
  if (url.startsWith("postgres") && url.includes("neon.tech")) {
    return new PrismaClient({ adapter: new PrismaNeonHTTP(url, {}), log });
  }

  return new PrismaClient({ log });
}

export const db = globalForPrisma.prisma ?? (await createClient());

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
