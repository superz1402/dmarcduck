import { NextRequest, NextResponse } from "next/server";
import { planExternalAuthorization } from "@/lib/dmarc/record";
import { rateLimit } from "@/lib/ratelimit";
import { log } from "@/lib/log";

export const runtime = "nodejs";

/**
 * POST /api/tools/rua-check
 *
 * Body: { record: string, domain: string, verify?: boolean }
 *
 * Analyzes a DMARC record for external aggregate-report destinations and
 * generates the exact RFC 7489 §7.1 authorization TXT records the
 * destination must publish. With verify=true, looks up those records via
 * DNS-over-HTTPS (Cloudflare, 3s timeout) and reports whether each one is
 * already live — but a DoH failure degrades to "not verified", never an error.
 */
export async function POST(req: NextRequest) {
  if (!rateLimit("rua-check", 30, 60_000).ok) {
    return NextResponse.json({ error: "Rate limited." }, { status: 429, headers: { "Retry-After": "60" } });
  }

  let body: { record?: string; domain?: string; verify?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Send JSON: {record, domain, verify?}." }, { status: 400 });
  }

  const record = (body.record ?? "").trim();
  const domain = (body.domain ?? "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\.$/, "");
  if (!record) {
    return NextResponse.json({ error: "Paste the DMARC record text (the v=DMARC1 ... TXT value)." }, { status: 400 });
  }
  if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
    return NextResponse.json({ error: "Enter the domain the record is published on (example.com)." }, { status: 400 });
  }
  if (record.length > 4096) {
    return NextResponse.json({ error: "Record longer than 4096 characters — that is not a DMARC record." }, { status: 413 });
  }

  const plan = planExternalAuthorization(record, domain);

  // Optional live verification of the generated authorization records.
  // Each lookup resolves to: authorized (v=DMARC1 TXT found), missing (no TXT),
  // wrong-record (TXT exists but is not a DMARC authorization — wildcards and
  // leftover SPF records happen), or error (lookup itself failed).
  let verification: { name: string; status: "authorized" | "missing" | "wrong-record" | "error"; value: string | null; error?: string }[] | null = null;
  if (body.verify && plan.externalRecords.length > 0) {
    verification = [];
    for (const rec of plan.externalRecords) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 3000);
        const res = await fetch(
          `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(rec.name)}&type=TXT`,
          { headers: { accept: "application/dns-json" }, signal: ctrl.signal }
        );
        clearTimeout(t);
        if (!res.ok) throw new Error(`DoH ${res.status}`);
        const data = (await res.json()) as { Status?: number; Answer?: { data: string }[] };
        const answers = data.Answer ?? [];
        const txt = answers.map((a) => a.data.replace(/^"|"$/g, "")).join("") || null;
        let status: "authorized" | "missing" | "wrong-record" | "error";
        if (answers.length === 0 || data.Status === 3) status = "missing";
        else if (txt && txt.startsWith("v=DMARC1")) status = "authorized";
        else status = "wrong-record";
        verification.push({ name: rec.name, status, value: txt });
      } catch (e) {
        log.warn("rua-check.doh_error", { error: String(e) });
        verification.push({ name: rec.name, status: "error", value: null, error: "DNS lookup failed — verification unavailable." });
      }
    }
  }

  return NextResponse.json({
    domain,
    analysis: {
      valid: plan.analysis.valid,
      version: plan.analysis.version,
      policy: plan.analysis.policy,
      subdomainPolicy: plan.analysis.subdomainPolicy,
      pct: plan.analysis.pct,
      adkim: plan.analysis.adkim,
      aspf: plan.analysis.aspf,
      rua: plan.analysis.rua,
      ruf: plan.analysis.ruf,
      problems: plan.analysis.problems,
      advisories: plan.analysis.advisories,
    },
    summary: plan.summary,
    externalRecords: plan.externalRecords,
    verification,
  });
}
