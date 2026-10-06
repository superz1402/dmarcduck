import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { log } from "@/lib/log";
import { rateLimit } from "@/lib/ratelimit";
import { expandUpload, parseUpload, isXmlFile } from "@/lib/dmarc/parser";
import { analyzeReports } from "@/lib/dmarc/analyze";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/analyze — the free wedge.
 * Accepts multipart/form-data with one or more files (.xml, .zip, .gz),
 * or a raw XML body (text/xml). Stateless-friendly: stores a shareable
 * result for 7 days, then it expires.
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limited = rateLimit(`analyze:${ip}`, 20, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many uploads from this address. Try again in a minute." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }

  const files: { name: string; text: string }[] = [];
  const contentType = req.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const entries = form.getAll("files").filter((f): f is File => f instanceof File);
      if (entries.length === 0) {
        return NextResponse.json({ error: "Attach at least one report file." }, { status: 400 });
      }
      if (entries.length > 25) {
        return NextResponse.json({ error: "Up to 25 files per upload." }, { status: 400 });
      }
      for (const file of entries) {
        if (file.size > 20 * 1024 * 1024) {
          return NextResponse.json(
            { error: `"${file.name}" is over 20 MB. Split the archive and retry.` },
            { status: 413 }
          );
        }
        if (!isXmlFile(file.name)) {
          return NextResponse.json(
            { error: `"${file.name}" doesn't look like a report (.xml, .zip or .gz).` },
            { status: 415 }
          );
        }
        const bytes = new Uint8Array(await file.arrayBuffer());
        for (const f of expandUpload(file.name, bytes)) {
          files.push({ name: f.name, text: new TextDecoder("utf-8", { fatal: false }).decode(f.bytes) });
        }
      }
    } else if (contentType.includes("xml") || contentType.includes("text/plain")) {
      const text = await req.text();
      if (text.length > 20 * 1024 * 1024) {
        return NextResponse.json({ error: "Payload over 20 MB." }, { status: 413 });
      }
      files.push({ name: "request-body.xml", text });
    } else {
      return NextResponse.json(
        { error: "Send multipart/form-data with files, or an XML body." },
        { status: 415 }
      );
    }
  } catch (e) {
    log.warn("analyze.read_error", { error: String(e) });
    return NextResponse.json({ error: "Could not read the upload. Is the file valid?" }, { status: 400 });
  }

  const allReports = [];
  const warnings = [];
  for (const f of files) {
    const { reports, warnings: w } = parseUpload(f.name, f.text);
    allReports.push(...reports);
    warnings.push(...w);
  }

  if (allReports.length === 0) {
    return NextResponse.json(
      {
        error:
          "No DMARC aggregate reports found in this upload. Reports are XML files with a <feedback> root — often arriving zipped from Google, Yahoo or Microsoft.",
      },
      { status: 422 }
    );
  }

  const analysis = analyzeReports(allReports, warnings);

  // Shareable record, expires in 7 days (honest, bounded storage).
  let shareId: string | null = null;
  try {
    shareId = nanoid(12);
    await db.analyzeRecord.create({
      data: {
        id: shareId,
        payload: JSON.stringify(analysis),
        expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      },
    });
  } catch (e) {
    // Storage is an enhancement, never a hard dependency for the analyzer.
    log.warn("analyze.store_error", { error: String(e) });
    shareId = null;
  }

  log.info("analyze.ok", {
    files: files.length,
    reports: analysis.reportCount,
    volume: analysis.volume,
  });

  return NextResponse.json({ analysis, shareId });
}
