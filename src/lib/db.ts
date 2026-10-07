import { PrismaClient } from "@prisma/client";
import { PrismaNeonHTTP } from "@prisma/adapter-neon";

// Prisma client singleton (avoids connection storms in dev hot-reload).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Cloudflare Workers has no raw TCP sockets, so Postgres access must go through
// the Neon serverless HTTP driver (PrismaNeonHTTP = pure fetch, Workers-safe).
// The same HTTP driver also works on plain Node, so every Neon URL takes the
// adapter path; the local sqlite dev flow keeps the native engine untouched.
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

function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL ?? "";
  const log: ("warn" | "error")[] =
    process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"];

  if (
    url.startsWith("postgres") &&
    (isWorkersRuntime() || url.includes("neon.tech"))
  ) {
    return new PrismaClient({ adapter: new PrismaNeonHTTP(url, {}), log });
  }

  return new PrismaClient({ log });
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
