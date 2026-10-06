/**
 * Aggregation: turn parsed DMARC reports into the human-readable analysis
 * object the UI renders. Pure functions, fully tested.
 *
 * Guided-compliance stance: every row answers three questions —
 * what happened, why it probably happened, and what to do next.
 * Forwarding evidence is handled honestly: a mailing list that breaks DKIM
 * is a different problem from an attacker, and saying "spoofing" for both
 * destroys the reader's trust.
 */

import type { ParsedReport } from "./parser";

export interface SourceRow {
  ip: string;
  volume: number;
  dmarc: "pass" | "fail";
  spf: "pass" | "fail" | "mixed";
  dkim: "pass" | "fail" | "mixed";
  headerFrom: string;
  envelopeFrom: string; // envelope domain seen for this source ("" when unknown)
  dkimDomains: string[]; // d= identities that signed mail from this source
  reasonTypes: string[]; // receiver-supplied policy_evaluated.reason types
  likelyForwarded: boolean;
  orgs: string[]; // reporting providers that saw this source
  suspicion: "none" | "low" | "high";
  note: string;
}

export interface SenderRow {
  /** header_from + envelope_from pair — the "who is sending as me" view. */
  headerFrom: string;
  envelopeFrom: string;
  volume: number;
  dmarc: "pass" | "fail";
  spf: "pass" | "fail" | "mixed";
  dkim: "pass" | "fail" | "mixed";
  ips: number; // distinct source IPs behind this identity
  likelyForwarded: boolean;
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
  senders: SenderRow[];
  providers: ProviderRow[];
  warnings: { file: string; reason: string }[];
  health: "healthy" | "attention" | "critical";
  healthReason: string;
}

// Receiver reason types that explicitly point at forwarding paths
// (RFC 7489 Appendix C leaves `type` open, so we match the observed set).
const FORWARDER_REASONS = new Set([
  "forwarded",
  "trusted_forwarder",
  "trustedforwarder",
  "mailing_list",
  "mailinglist",
  "alias",
]);

const KNOWN_LIST_PATTERNS = [
  "lists.",
  "list.",
  "mailing.",
  "ml.",
  "groups.",
  "googlegroups.com",
  "yahoogroups.com",
  "simplelists.com",
  "mailman",
  "sympa",
  "listserv",
];

function isListish(domain: string): boolean {
  if (!domain) return false;
  return KNOWN_LIST_PATTERNS.some((p) => domain.includes(p));
}

interface RowFacts {
  volume: number;
  dmarc: "pass" | "fail";
  spf: SourceRow["spf"];
  dkim: SourceRow["dkim"];
  headerFrom: string;
  envelopeFrom: string;
  dkimDomains: string[];
  reasonTypes: string[];
  publishedDomain: string | null;
}

function forwarderEvidence(f: RowFacts): { forwarded: boolean; why: string } {
  // 1. Explicit: the receiver told us.
  const explicit = f.reasonTypes.find((t) => FORWARDER_REASONS.has(t));
  if (explicit) {
    return { forwarded: true, why: `the receiving mail server labeled this mail "${explicit.replace(/_/g, " ")}"` };
  }
  // 2. List-shaped envelope domain (googlegroups.com, lists.*, mailman...).
  if (isListish(f.envelopeFrom)) {
    return { forwarded: true, why: `the bounce domain "${f.envelopeFrom}" is a mailing-list host` };
  }
  // Deliberately no envelope-mismatch heuristic here: a spammer's own envelope
  // domain looks identical to a forwarder's. Without positive evidence we do
  // not downgrade suspicion — we mention the envelope in the note instead.
  return { forwarded: false, why: "" };
}

function suspicionFor(f: RowFacts): {
  suspicion: SourceRow["suspicion"];
  note: string;
  likelyForwarded: boolean;
} {
  const fwd = forwarderEvidence(f);
  if (f.dmarc === "pass") {
    // Guided-compliance notes: passing is not the same as healthy. Explain
    // which mechanism carried the mail and what to harden next.
    if (f.dkim === "fail") {
      return {
        suspicion: "none",
        likelyForwarded: fwd.forwarded,
        note: fwd.forwarded
          ? `Authenticated via SPF only — DKIM failed because ${fwd.why}. Mail still passes DMARC, but list/forward traffic depends entirely on SPF, so it breaks silently if forwarding changes.`
          : "Authenticated via SPF only — DKIM failed here. Mail still passes DMARC, but fixing DKIM for this sender protects you if SPF breaks (forwarding, mailing lists).",
      };
    }
    if (f.spf === "fail") {
      return {
        suspicion: "none",
        likelyForwarded: fwd.forwarded,
        note: fwd.forwarded
          ? `Authenticated via DKIM only — SPF failed because ${fwd.why}. That is exactly how forwarding is supposed to work: DKIM survives, SPF legitimately fails. Nothing to fix.`
          : "Authenticated via DKIM only — SPF failed here. Usually harmless (forwarding rewrites envelopes); adding this sender to your SPF record makes delivery resilient.",
      };
    }
    if (f.spf === "mixed" || f.dkim === "mixed") {
      return {
        suspicion: "none",
        likelyForwarded: fwd.forwarded,
        note: "Passes DMARC, but authentication varies between messages — worth checking whether every service on this IP signs consistently.",
      };
    }
    return {
      suspicion: "none",
      likelyForwarded: fwd.forwarded,
      note: "Fully authenticated (SPF and DKIM aligned) — nothing to do here.",
    };
  }

  // DMARC failed. Decide: forwarder noise or actual spoofing?
  const fromMatches = f.publishedDomain && f.headerFrom.endsWith(f.publishedDomain);
  if (fwd.forwarded) {
    return {
      suspicion: "low",
      likelyForwarded: true,
      note: `Failing DMARC, but ${fwd.why} — this is usually a forwarder or mailing list breaking authentication, not an attack. Check whether ${f.envelopeFrom || "that path"} is one you use; if so, the fix is on the list (sign its own DKIM), not in your policy.`,
    };
  }
  if (!fromMatches && f.headerFrom) {
    return {
      suspicion: "high",
      likelyForwarded: false,
      note: `Failing mail claiming to be "${f.headerFrom}" — not aligned to ${f.publishedDomain}. Likely spoofing.${f.envelopeFrom && f.publishedDomain && !f.envelopeFrom.endsWith(f.publishedDomain) ? ` The envelope domain (${f.envelopeFrom}) is a third party too — if that belongs to a forwarding service you use, check there first, but assume hostile until confirmed.` : ""}`,
    };
  }
  if (f.volume >= 50) {
    return {
      suspicion: "high",
      likelyForwarded: false,
      note: "High-volume source failing DMARC. Fix SPF/DKIM for this sender before tightening policy.",
    };
  }
  return {
    suspicion: "low",
    likelyForwarded: false,
    note: "Failing DMARC from your own domain — usually a forgotten sender (CRM, helpdesk, newsletter).",
  };
}

function mergeVerdict(
  current: "pass" | "fail" | "mixed",
  next: "pass" | "fail"
): "pass" | "fail" | "mixed" {
  if (current === "mixed" || current === next) return current;
  return "mixed";
}

function senderNote(row: {
  headerFrom: string;
  envelopeFrom: string;
  dmarc: "pass" | "fail";
  ips: number;
  likelyForwarded: boolean;
  publishedDomain: string | null;
}): string {
  if (row.dmarc === "pass") {
    return row.ips > 1
      ? `Passing from ${row.ips} different IPs — one service spread across several hosts, normal for large providers.`
      : "Passing. Nothing to do.";
  }
  if (row.likelyForwarded) {
    return "Failing, but this identity shows forwarding evidence — see the source rows before treating it as an attack.";
  }
  if (row.envelopeFrom && row.publishedDomain && !row.envelopeFrom.endsWith(row.publishedDomain)) {
    return `Failing as a pair: "${row.headerFrom}" in the visible From, "${row.envelopeFrom}" on the envelope. If you don't recognize ${row.envelopeFrom}, this identity is your first suspect.`;
  }
  return `Failing identity claiming to be "${row.headerFrom}" — find the service behind it before moving policy out of p=none.`;
}

export function analyzeReports(
  reports: ParsedReport[],
  warnings: { file: string; reason: string }[] = []
): Analysis {
  const byIp = new Map<string, SourceRow>();
  const bySender = new Map<string, SenderRow>();
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

      // envelope/auth evidence for this record (auth_results may be absent)
      const envelopeFrom =
        rec.envelopeFrom ||
        rec.spfAuth.find((s) => s.domain)?.domain ||
        "";
      const dkimDomains = rec.dkimAuth
        .filter((d) => d.domain)
        .map((d) => d.domain);
      const reasonTypes = rec.reasons.map((x) => x.type).filter(Boolean);

      const existing = byIp.get(rec.sourceIp);
      if (existing) {
        existing.volume += rec.count;
        existing.spf = mergeVerdict(existing.spf, rec.spf);
        existing.dkim = mergeVerdict(existing.dkim, rec.dkim);
        existing.dmarc = existing.dmarc === "pass" || dmarcPass ? "pass" : "fail";
        if (envelopeFrom && !existing.envelopeFrom.includes(envelopeFrom)) {
          existing.envelopeFrom = existing.envelopeFrom
            ? `${existing.envelopeFrom}, ${envelopeFrom}`
            : envelopeFrom;
        }
        for (const d of dkimDomains) {
          if (!existing.dkimDomains.includes(d)) existing.dkimDomains.push(d);
        }
        for (const t of reasonTypes) {
          if (!existing.reasonTypes.includes(t)) existing.reasonTypes.push(t);
        }
        if (!existing.orgs.includes(r.orgName)) existing.orgs.push(r.orgName);
      } else {
        byIp.set(rec.sourceIp, {
          ip: rec.sourceIp,
          volume: rec.count,
          dmarc: dmarcPass ? "pass" : "fail",
          spf: rec.spf,
          dkim: rec.dkim,
          headerFrom: rec.headerFrom,
          envelopeFrom,
          dkimDomains,
          reasonTypes,
          likelyForwarded: false,
          orgs: [r.orgName],
          suspicion: "none",
          note: "",
        });
      }

      // Sender identity view: header_from + envelope_from pair.
      const senderKey = `${rec.headerFrom}|${envelopeFrom}`;
      const sender = bySender.get(senderKey) ?? {
        headerFrom: rec.headerFrom,
        envelopeFrom,
        volume: 0,
        dmarc: (dmarcPass ? "pass" : "fail") as "pass" | "fail",
        spf: rec.spf,
        dkim: rec.dkim,
        ips: 0,
        likelyForwarded: false,
        note: "",
      };
      sender.volume += rec.count;
      sender.spf = mergeVerdict(sender.spf, rec.spf);
      sender.dkim = mergeVerdict(sender.dkim, rec.dkim);
      sender.dmarc = sender.dmarc === "pass" || dmarcPass ? "pass" : "fail";
      bySender.set(senderKey, sender);
    }
  }

  const sources = Array.from(byIp.values()).sort((a, b) => b.volume - a.volume);
  for (const s of sources) {
    const res = suspicionFor({
      volume: s.volume,
      dmarc: s.dmarc,
      spf: s.spf,
      dkim: s.dkim,
      headerFrom: s.headerFrom,
      envelopeFrom: s.envelopeFrom,
      dkimDomains: s.dkimDomains,
      reasonTypes: s.reasonTypes,
      publishedDomain,
    });
    s.suspicion = res.suspicion;
    s.note = res.note;
    s.likelyForwarded = res.likelyForwarded;
  }

  // Sender grouping: each source row is one distinct IP; attribute it to every
  // envelope identity it carried.
  const ipCount = new Map<string, number>();
  for (const s of sources) {
    for (const env of s.envelopeFrom.split(", ").filter(Boolean)) {
      const key = `${s.headerFrom}|${env}`;
      ipCount.set(key, (ipCount.get(key) ?? 0) + 1);
    }
  }
  const senders = Array.from(bySender.values()).sort((a, b) => b.volume - a.volume);
  for (const s of senders) {
    const res = suspicionFor({
      volume: s.volume,
      dmarc: s.dmarc,
      spf: s.spf,
      dkim: s.dkim,
      headerFrom: s.headerFrom,
      envelopeFrom: s.envelopeFrom,
      dkimDomains: [],
      reasonTypes: [],
      publishedDomain,
    });
    s.likelyForwarded = res.likelyForwarded;
    s.note = senderNote({
      headerFrom: s.headerFrom,
      envelopeFrom: s.envelopeFrom,
      dmarc: s.dmarc,
      ips: ipCount.get(`${s.headerFrom}|${s.envelopeFrom}`) ?? 1,
      likelyForwarded: res.likelyForwarded,
      publishedDomain,
    });
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
    senders,
    providers: Array.from(byOrg.values()).sort((a, b) => b.volume - a.volume),
    warnings,
    health,
    healthReason,
  };
}
