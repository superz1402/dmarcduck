import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { expandUpload, parseUpload, isXmlFile } from "@/lib/dmarc/parser";
import { log } from "@/lib/log";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BODY_BYTES = 20 * 1024 * 1024; // 20 MB, same cap as the analyzer

/**
 * POST /api/ingest/[token] — automated report ingestion endpoint.
 *
 * A registered domain gets a unique mailboxToken. Point your RUA reports
 * here (Cloudflare Email Routing worker, a forwarding script, or any
 * pipeline that can POST the raw report). Accepts:
 *   - raw XML body (application/xml or text/xml)
 *   - multipart/form-data with file(s) (.xml/.zip/.gz)
 *
 * Every call writes an IngestionEvent — a durable ledger of what arrived,
 * what parsed, what was stored, and what was rejected. Stored rows carry the
 * event id, so the dashboard can attribute aggregate inclusion per delivery
 * instead of guessing from counts. A user should never have to wonder
 * whether DmarcDuck actually processed their report.
 *
 * Responses:
 *   200 { ok, stored, event }          — at least one report processed (fully or partially)
 *   422 { error, event }               — nothing usable found (permanent failure; do not retry)
 *   401/404/415/429/413                — auth / wrong token / content type / rate / size
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  if (!rateLimit(`ingest:${token}`, 120, 3600_000).ok) {
    return NextResponse.json({ error: "Rate limited." }, { status: 429 });
  }

  const domain = await db.domain.findUnique({ where: { mailboxToken: token } });
  if (!domain) {
    // Uniform 404 — do not help enumerate tokens.
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const planOwned = await db.user.findUnique({
    where: { id: domain.userId },
    include: { subscription: true },
  });
  if (!planOwned) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const contentType = req.headers.get("content-type") ?? "";
  const sourceIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  // ---- ledger accumulators -------------------------------------------------
  const rejects: { name: string; reason: string }[] = [];
  let filesReceived = 0;
  let reportsParsed = 0;
  let recordsStored = 0;
  let duplicatesSkipped = 0;
  let mismatchSkipped = 0;

  // ---- read the payload ----------------------------------------------------
  const incoming: { name: string; bytes: Uint8Array }[] = [];
  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const entries = form.getAll("files").filter((f): f is File => f instanceof File);
      for (const file of entries.slice(0, 25)) {
        filesReceived += 1;
        if (file.size > MAX_BODY_BYTES) {
          rejects.push({ name: file.name, reason: `Over 20 MB (got ${(file.size / 1048576).toFixed(1)} MB). Split the archive and retry.` });
          continue;
        }
        if (!isXmlFile(file.name)) {
          rejects.push({ name: file.name, reason: "Not a report file (.xml, .zip or .gz)." });
          continue;
        }
        const bytes = new Uint8Array(await file.arrayBuffer());
        for (const f of expandUpload(file.name, bytes)) {
          incoming.push({ name: f.name, bytes: f.bytes });
        }
      }
    } else if (contentType.includes("xml") || contentType.includes("text/plain")) {
      filesReceived += 1;
      const text = await req.text();
      if (text.length > MAX_BODY_BYTES) {
        rejects.push({ name: "request-body", reason: "Payload over 20 MB." });
      } else {
        incoming.push({ name: "email-body.xml", bytes: new TextEncoder().encode(text) });
      }
    } else {
      return NextResponse.json({ error: "Unsupported content type. Send XML or multipart files." }, { status: 415 });
    }
  } catch (e) {
    log.warn("ingest.read_error", { error: String(e), domainId: domain.id });
    return NextResponse.json({ error: "Could not read payload." }, { status: 400 });
  }

  if (filesReceived === 0 && rejects.length === 0) {
    return NextResponse.json(
      { error: "No files in this payload. Send an XML body or multipart files under the \"files\" field." },
      { status: 400 }
    );
  }

  // ---- open the ledger event BEFORE storing --------------------------------
  // Creating it first is what lets every stored Report row carry the event id
  // (aggregate-inclusion attribution). Ledger failure must not fail ingestion:
  // rows stored without an event simply report inclusion as unattributed.
  let eventId: string | null = null;
  try {
    const ev = await db.ingestionEvent.create({
      data: { domainId: domain.id, status: "processing", sourceIp, contentType },
    });
    eventId = ev.id;
  } catch (e) {
    log.warn("ingest.ledger_error", { error: String(e), domainId: domain.id });
  }

  // ---- parse + store with per-file accounting ------------------------------
  const textDecoder = new TextDecoder("utf-8", { fatal: false });
  for (const f of incoming) {
    const { reports, warnings } = parseUpload(f.name, textDecoder.decode(f.bytes));
    if (reports.length === 0) {
      const firstWarning = warnings[0];
      const reason =
        firstWarning && typeof firstWarning === "string"
          ? firstWarning
          : firstWarning?.reason ?? "No DMARC aggregate report found — the XML has no <feedback> root.";
      rejects.push({ name: f.name, reason });
      continue;
    }
    for (const r of reports) {
      if (r.publishedDomain && r.publishedDomain !== domain.name) {
        mismatchSkipped += 1;
        rejects.push({
          name: f.name,
          reason: `Report is for ${r.publishedDomain}, not ${domain.name} — not stored here.`,
        });
        log.warn("ingest.domain_mismatch", { got: r.publishedDomain, expect: domain.name, domainId: domain.id });
        continue;
      }
      reportsParsed += 1;
      for (const rec of r.records) {
        try {
          await db.report.create({
            data: {
              domainId: domain.id,
              eventId,
              reportMeta: r.reportId || "unknown",
              orgName: r.orgName,
              sourceIp: rec.sourceIp,
              count: rec.count,
              spf: rec.spf,
              dkim: rec.dkim,
              aligned: rec.spf === "pass" || rec.dkim === "pass",
              headerFrom: rec.headerFrom,
              envelopeFrom: rec.envelopeFrom || null,
              dkimAuth: rec.dkimAuth.length > 0 ? JSON.stringify(rec.dkimAuth.slice(0, 10)) : null,
              reasons: rec.reasons.length > 0 ? JSON.stringify(rec.reasons.slice(0, 10)) : null,
              seenAt: r.dateBegin ? new Date(r.dateBegin * 1000) : new Date(),
            },
          });
          recordsStored += 1;
        } catch (e) {
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
            // Unique constraint: identical (report, ip, window, count) row already stored.
            duplicatesSkipped += 1;
          } else {
            throw e;
          }
        }
      }
    }
  }

  // ---- finalize the ledger event -------------------------------------------
  const status = recordsStored > 0 ? (rejects.length > 0 ? "partial" : "processed") : rejects.length > 0 ? "rejected" : "processed";
  if (eventId) {
    try {
      await db.ingestionEvent.update({
        where: { id: eventId },
        data: { status, filesReceived, reportsParsed, recordsStored, duplicatesSkipped, mismatchSkipped, rejects: JSON.stringify(rejects.slice(0, 25)) },
      });
    } catch (e) {
      log.warn("ingest.ledger_update_error", { error: String(e), domainId: domain.id });
    }
  }

  const event = { id: eventId, status, filesReceived, reportsParsed, recordsStored, duplicatesSkipped, mismatchSkipped, rejects };

  if (status === "rejected") {
    log.warn("ingest.rejected", { domainId: domain.id, filesReceived, rejects: rejects.length });
    return NextResponse.json(
      { ok: false, error: "No usable DMARC report in this payload.", event },
      { status: 422 }
    );
  }

  log.info("ingest.ok", { domainId: domain.id, stored: recordsStored, duplicates: duplicatesSkipped, rejected: rejects.length });
  return NextResponse.json({ ok: true, stored: recordsStored, event });
}
