/**
 * Aggregation: turn parsed DMARC reports into the human-readable analysis
 * object the UI renders. Pure functions, fully tested.
 */

import type { ParsedReport } from "./parser";

export interface SourceRow {
  ip: string;
  volume: number;
  dmarc: "pass" | "fail";
  spf: "pass" | "fail" | "mixed";
  dkim: "pass" | "fail" | "mixed";
  headerFrom: string;
  orgs: string[]; // reporting providers that saw this source
  suspicion: "none" | "low" | "high";
  note: string;
}

export interface ProviderRow {
  org: string;
  reports: number;
  volume: number;
}

export interface Analysis {
  parsedAt: string;
  reportCount: number;
  recordCount: number;
  volume: number;
  publishedDomain: string | null;
  policy: ParsedReport["policy"] | null;
  dateRange: { begin: number; end: number } | null;
  dmarcPassVolume: number;
  dmarcFailVolume: number;
  sources: SourceRow[];
  providers: ProviderRow[];
  warnings: { file: string; reason: string }[];
  health: "healthy" | "attention" | "critical";
  healthReason: string;
}

function suspicionFor(row: { volume: number; dmarc: "pass" | "fail"; headerFrom: string; publishedDomain: string | null }): {
  suspicion: SourceRow["suspicion"];
  note: string;
} {
  if (row.dmarc === "pass") return { suspicion: "none", note: "Authenticated as your domain." };
  const fromMatches =
    row.publishedDomain && row.headerFrom.endsWith(row.publishedDomain);
  if (!fromMatches && row.headerFrom) {
    return {
      suspicion: "high",
      note: `Failing mail claiming to be "${row.headerFrom}" — not aligned to ${row.publishedDomain}. Likely spoofing.`,
    };
  }
  if (row.volume >= 50) {
    return {
      suspicion: "high",
      note: "High-volume source failing DMARC. Fix SPF/DKIM for this sender before tightening policy.",
    };
  }
  return {
    suspicion: "low",
    note: "Failing DMARC from your own domain — usually a forgotten sender (CRM, helpdesk, newsletter).",
  };
}

export function analyzeReports(
  reports: ParsedReport[],
  warnings: { file: string; reason: string }[] = []
): Analysis {
  const byIp = new Map<string, SourceRow>();
  const byOrg = new Map<string, ProviderRow>();
  let volume = 0;
  let passVolume = 0;
  let failVolume = 0;
  let recordCount = 0;
  let begin = Infinity;
  let end = -Infinity;
  let publishedDomain: string | null = null;
  let policy: ParsedReport["policy"] | null = null;

  for (const r of reports) {
    if (!publishedDomain && r.publishedDomain) {
      publishedDomain = r.publishedDomain;
      policy = r.policy;
    }
    if (r.dateBegin) begin = Math.min(begin, r.dateBegin);
    if (r.dateEnd) end = Math.max(end, r.dateEnd);

    const org = byOrg.get(r.orgName) ?? { org: r.orgName, reports: 0, volume: 0 };
    org.reports += 1;
    byOrg.set(r.orgName, org);

    for (const rec of r.records) {
      recordCount += 1;
      volume += rec.count;
      org.volume += rec.count;
      const dmarcPass = rec.spf === "pass" || rec.dkim === "pass";
      if (dmarcPass) passVolume += rec.count;
      else failVolume += rec.count;

      const existing = byIp.get(rec.sourceIp);
      if (existing) {
        existing.volume += rec.count;
        existing.spf =
          existing.spf === rec.spf ? rec.spf : "mixed";
        existing.dkim =
          existing.dkim === rec.dkim ? rec.dkim : "mixed";
        existing.dmarc = existing.dmarc === "pass" || dmarcPass ? "pass" : "fail";
        if (!existing.orgs.includes(r.orgName)) existing.orgs.push(r.orgName);
      } else {
        byIp.set(rec.sourceIp, {
          ip: rec.sourceIp,
          volume: rec.count,
          dmarc: dmarcPass ? "pass" : "fail",
          spf: rec.spf,
          dkim: rec.dkim,
          headerFrom: rec.headerFrom,
          orgs: [r.orgName],
          suspicion: "none",
          note: "",
        });
      }
    }
  }

  const sources = Array.from(byIp.values()).sort((a, b) => b.volume - a.volume);
  for (const s of sources) {
    const { suspicion, note } = suspicionFor({
      volume: s.volume,
      dmarc: s.dmarc,
      headerFrom: s.headerFrom,
      publishedDomain,
    });
    s.suspicion = suspicion;
    s.note = note;
  }

  // Health: pass rate + policy awareness
  const passRate = volume > 0 ? passVolume / volume : 1;
  let health: Analysis["health"] = "healthy";
  let healthReason = "All mail is authenticating cleanly. Nothing to do.";
  if (volume === 0) {
    health = "attention";
    healthReason = "No records found in this upload. Reports may be empty or malformed.";
  } else if (passRate < 0.9) {
    health = "critical";
    healthReason = `${Math.round((1 - passRate) * 100)}% of your mail is failing DMARC. Fix senders before moving policy out of p=none.`;
  } else if (failVolume > 0) {
    health = "attention";
    healthReason = `${failVolume} emails failing DMARC — usually one forgotten sender. Review the flagged sources.`;
  }
  if (policy && policy.p === "none" && passRate >= 0.98 && volume > 100) {
    health = "attention";
    healthReason = "Your mail is clean but policy is still p=none. You are ready to move to quarantine.";
  }

  return {
    parsedAt: new Date().toISOString(),
    reportCount: reports.length,
    recordCount,
    volume,
    publishedDomain,
    policy,
    dateRange: Number.isFinite(begin) && begin > 0 ? { begin, end: Math.max(end, begin) } : null,
    dmarcPassVolume: passVolume,
    dmarcFailVolume: failVolume,
    sources,
    providers: Array.from(byOrg.values()).sort((a, b) => b.volume - a.volume),
    warnings,
    health,
    healthReason,
  };
}
