import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { expandUpload, parseUpload } from "@/lib/dmarc/parser";
import { log } from "@/lib/log";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/ingest/[token] — automated report ingestion endpoint.
 *
 * A registered domain gets a unique mailboxToken. Point your RUA reports
 * here (Cloudflare Email Routing worker, a forwarding script, or any
 * pipeline that can POST the raw report). Accepts:
 *   - raw XML body (application/xml or text/xml)
 *   - multipart/form-data with file(s) (.xml/.zip/.gz)
 *
 * This is the paid-tier automation: reports arrive, we aggregate, we alert.
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

  const xmlFiles: { name: string; text: string }[] = [];
  const contentType = req.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const entries = form.getAll("files").filter((f): f is File => f instanceof File);
      for (const file of entries.slice(0, 25)) {
        const bytes = new Uint8Array(await file.arrayBuffer());
        for (const f of expandUpload(file.name, bytes)) {
          xmlFiles.push({ name: f.name, text: new TextDecoder("utf-8", { fatal: false }).decode(f.bytes) });
        }
      }
    } else if (contentType.includes("xml") || contentType.includes("text/plain")) {
      xmlFiles.push({ name: "email-body.xml", text: await req.text() });
    } else {
      return NextResponse.json({ error: "Unsupported content type. Send XML or multipart files." }, { status: 415 });
    }
  } catch (e) {
    log.warn("ingest.read_error", { error: String(e), domainId: domain.id });
    return NextResponse.json({ error: "Could not read payload." }, { status: 400 });
  }

  let stored = 0;
  const seenReportIds = new Set<string>();
  for (const f of xmlFiles) {
    const { reports } = parseUpload(f.name, f.text);
    for (const r of reports) {
      if (r.publishedDomain && r.publishedDomain !== domain.name) {
        log.warn("ingest.domain_mismatch", { got: r.publishedDomain, expect: domain.name, domainId: domain.id });
        continue; // a report for someone else's domain: not ours to store
      }
      for (const rec of r.records) {
        const dedupeKey = `${r.reportId}|${rec.sourceIp}|${rec.count}|${r.dateBegin}`;
        if (seenReportIds.has(dedupeKey)) continue;
        seenReportIds.add(dedupeKey);
        await db.report.create({
          data: {
            domainId: domain.id,
            reportMeta: r.reportId || "unknown",
            orgName: r.orgName,
            sourceIp: rec.sourceIp,
            count: rec.count,
            spf: rec.spf,
            dkim: rec.dkim,
            aligned: rec.spf === "pass" || rec.dkim === "pass",
            headerFrom: rec.headerFrom,
            seenAt: r.dateBegin ? new Date(r.dateBegin * 1000) : new Date(),
          },
        });
        stored += 1;
      }
    }
  }

  log.info("ingest.ok", { domainId: domain.id, stored });
  return NextResponse.json({ ok: true, stored });
}
