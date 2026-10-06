/**
 * DmarcDuck DMARC aggregate report parser.
 *
 * Parses DMARC aggregate (RUA) reports per RFC 7489 Appendix C. Handles:
 *  - single <feedback> documents
 *  - concatenated <feedback> documents (some providers concatenate)
 *  - ZIP archives containing one or more XML reports
 *  - missing/extra optional fields defensively (real-world receivers vary)
 *
 * No AI, no network calls. Deterministic. This file is the heart of the
 * product; it has its own test suite (tests/parser.test.ts).
 */

import { XMLParser } from "fast-xml-parser";
import { unzipSync, gunzipSync } from "fflate";

export type Verdict = "pass" | "fail";

export interface ParsedRecord {
  sourceIp: string;
  count: number;
  spf: Verdict; // policy_evaluated.spf (alignment-aware)
  dkim: Verdict; // policy_evaluated.dkim (alignment-aware)
  headerFrom: string;
  disposition: string;
}

export interface ParsedReport {
  orgName: string;
  reportId: string;
  dateBegin: number; // epoch seconds
  dateEnd: number;
  publishedDomain: string | null;
  policy: {
    p: string;
    sp: string | null;
    adkim: string | null;
    aspf: string | null;
    pct: number | null;
  };
  records: ParsedRecord[];
}

export interface RawFile {
  name: string;
  bytes: Uint8Array;
}

export interface ParseWarning {
  file: string;
  reason: string;
}

// ---------------------------------------------------------------- helpers

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true,
  parseTagValue: false, // we cast manually; avoids surprise number coercion
  parseAttributeValue: false,
});

/** Normalize fast-xml-parser values: a tag may come back as string, array, object or undefined. */
function asArray<T>(v: T | T[] | undefined | null): T[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

function str(v: unknown): string {
  if (v === undefined || v === null) return "";
  if (typeof v === "object") {
    const obj = v as Record<string, unknown>;
    if ("#text" in obj) return String(obj["#text"] ?? "").trim();
    return "";
  }
  return String(v).trim();
}

function toInt(v: unknown, fallback: number): number {
  const n = parseInt(str(v), 10);
  return Number.isFinite(n) ? n : fallback;
}

function verdict(v: unknown): Verdict {
  return str(v).toLowerCase() === "pass" ? "pass" : "fail";
}

/** Split concatenated XML documents on </feedback> boundaries. */
function splitFeedbackDocs(xml: string): string[] {
  const docs: string[] = [];
  const re = /<\/feedback\s*>/gi;
  let start = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    docs.push(xml.slice(start, m.index + m[0].length));
    start = m.index + m[0].length;
  }
  if (docs.length === 0 && xml.trim().length > 0) docs.push(xml);
  return docs;
}

// ---------------------------------------------------------------- parsing

/** Parse one <feedback> document into a ParsedReport, or null if not a DMARC record. */
export function parseFeedbackXml(xml: string): ParsedReport | null {
  if (!/<feedback/i.test(xml)) return null;
  let doc: Record<string, unknown>;
  try {
    doc = parser.parse(xml) as Record<string, unknown>;
  } catch {
    return null;
  }
  const fb = doc.feedback as Record<string, unknown> | undefined;
  if (!fb) return null;

  const meta = (fb.report_metadata ?? {}) as Record<string, unknown>;
  const dateRange = (meta.date_range ?? {}) as Record<string, unknown>;
  const published = (fb.policy_published ?? {}) as Record<string, unknown>;

  const records: ParsedRecord[] = asArray(
    (fb.record ?? undefined) as Record<string, unknown> | Record<string, unknown>[] | undefined
  ).map((rec) => {
      const row = (rec.row ?? {}) as Record<string, unknown>;
      const evald = (row.policy_evaluated ?? {}) as Record<string, unknown>;
      const ids = (rec.identifiers ?? {}) as Record<string, unknown>;
      return {
        sourceIp: str(row.source_ip),
        count: Math.max(0, toInt(row.count, 1)),
        spf: verdict(evald.spf),
        dkim: verdict(evald.dkim),
        headerFrom: str(ids.header_from).toLowerCase(),
        disposition: str(evald.disposition).toLowerCase() || "none",
      };
    }
  );

  return {
    orgName: str(meta.org_name) || "unknown",
    reportId: str(meta.report_id),
    dateBegin: toInt(dateRange.begin, 0),
    dateEnd: toInt(dateRange.end, 0),
    publishedDomain: str(published.domain).toLowerCase() || null,
    policy: {
      p: str(published.p).toLowerCase() || "none",
      sp: str(published.sp).toLowerCase() || null,
      adkim: str(published.adkim).toLowerCase() || null,
      aspf: str(published.aspf).toLowerCase() || null,
      pct: published.pct !== undefined ? toInt(published.pct, 100) : null,
    },
    records,
  };
}

/** Expand raw upload bytes into candidate XML files (handles .zip, .gz). */
export function expandUpload(name: string, bytes: Uint8Array): RawFile[] {
  const lower = name.toLowerCase();
  try {
    if (lower.endsWith(".zip")) {
      const files = unzipSync(bytes);
      return Object.entries(files)
        .filter(([n, b]) => !n.startsWith("__MACOSX") && b.length > 0)
        .map(([n, b]) => ({ name: n, bytes: b }));
    }
    if (lower.endsWith(".gz")) {
      return [{ name: name.replace(/\.gz$/i, ""), bytes: gunzipSync(bytes) }];
    }
  } catch {
    // fall through: treat as plain text below
  }
  return [{ name, bytes }];
}

export interface ParseResult {
  reports: ParsedReport[];
  warnings: ParseWarning[];
}

/** Parse one XML file's text into reports + warnings (may hold several <feedback> docs). */
export function parseUpload(name: string, text: string): ParseResult {
  const reports: ParsedReport[] = [];
  const warnings: ParseWarning[] = [];
  const docs = splitFeedbackDocs(text);
  for (const doc of docs) {
    if (doc.trim().length < 20) continue;
    const parsed = parseFeedbackXml(doc);
    if (parsed) reports.push(parsed);
    else warnings.push({ file: name, reason: "no <feedback> structure — not a DMARC aggregate report" });
  }
  return { reports, warnings };
}

export function isXmlFile(name: string): boolean {
  return /\.(xml|gz|gzip|zip)$/i.test(name) || !name.includes(".");
}
