// Runtime import of the generated Prisma client's WASM entry.
//
// Why not `@prisma/client` (default entry)? It hardwires the native binary
// query engine (config.engineWasm = undefined), which cannot load on
// Cloudflare Workers/workerd — verified live 2026-10-07 ("could not locate
// the Query Engine for runtime debian-openssl-1.1.x").
//
// Why not `@prisma/client/wasm`? Prisma 6.19.3 ships that exports entry as
// "./wasm.mjs" but the file does not exist in the package (packaging bug), so
// bundlers using the "import" condition fail to resolve it. The CJS sibling
// (.prisma/client/wasm.js, typed via its sibling wasm.d.ts) exists and is
// exactly the entry we need: it wires config.engineWasm to
// query_engine_bg.wasm via #wasm-engine-loader.
import { PrismaClient } from "../../node_modules/.prisma/client/wasm.js";

export { PrismaClient };
