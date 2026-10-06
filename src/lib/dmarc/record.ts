/**
 * DMARC record analysis — RFC 7489 record parsing plus §7.1 external
 * destination verification.
 *
 * The single most common "reports never arrive" failure: a domain owner sets
 * rua= to an address at a domain they don't control (a monitoring service),
 * and the receiving mail server then REFUSES to send reports until the
 * destination publishes an authorization record. Nothing errors anywhere —
 * reports just silently never show up.
 *
 * This module detects that condition from the record text alone (no network
 * required) and generates the exact TXT record that must be published, so
 * the fix is a copy-paste instead of a standards-document archaeology trip.
 *
 * Pure functions, fully tested.
 */

export interface DmarcTag {
  key: string;
  value: string;
}

export interface ReportUri {
  uri: string;
  mailto: boolean;
  host: string; // lowercase host of the destination
  external: boolean; // true when host differs from the policy domain
  maxSize: number | null; // size limit suffix (e.g. 10k), in bytes
}

export interface DmarcRecordAnalysis {
  valid: boolean;
  raw: string;
  tags: DmarcTag[];
  version: string | null;
  policy: string | null; // p=
  subdomainPolicy: string | null; // sp=
  adkim: string | null;
  aspf: string | null;
  pct: number | null;
  rua: ReportUri[];
  ruf: ReportUri[];
  problems: string[]; // outright RFC violations
  advisories: string[]; // risky-but-legal settings, phrased as sentences
}

export interface ExternalAuthRecord {
  /** The TXT record name the DESTINATION domain must publish. */
  name: string;
  /** The TXT record value (starts with v=DMARC1 per §7.1). */
  value: string;
  policyDomain: string; // domain whose reports these are
  destinationHost: string; // host in the rua= address
}

// ---------------------------------------------------------------- helpers

export function hostOf(uriOrAddress: string): string {
  // mailto:agg@example.com  ->  example.com
  // https://example.com/rua ->  example.com
  let s = uriOrAddress.trim();
  s = s.replace(/^mailto:/i, "").replace(/^https?:\/\//i, "");
  s = s.split("/")[0];
  s = s.split("@").pop() ?? s; // bare "agg@example.com"
  s = s.split(":")[0]; // strip port
  return s.toLowerCase();
}

/** Parse a size suffix like "10k", "1m", "512b" into bytes (RFC 7489 §6.2). */
function sizeToBytes(suffix: string): number | null {
  const m = /^(\d+)([bkmgt]?)$/i.exec(suffix.trim());
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const unit = m[2].toLowerCase();
  const mult: Record<string, number> = { "": 1, b: 1, k: 1024, m: 1024 ** 2, g: 1024 ** 3, t: 1024 ** 4 };
  return n * (mult[unit] ?? 1);
}

/** Split a comma-separated uri list, respecting up to one !size suffix. */
function parseUris(value: string): ReportUri[] {
  return value
    .split(",")
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((raw) => {
      let uri = raw;
      let maxSize: number | null = null;
      const bang = uri.lastIndexOf("!");
      if (bang !== -1) {
        const size = sizeToBytes(uri.slice(bang + 1));
        if (size !== null) {
          maxSize = size;
          uri = uri.slice(0, bang);
        }
      }
      return {
        uri,
        mailto: /^mailto:/i.test(uri),
        host: hostOf(uri),
        external: false, // filled in by the caller against the policy domain
        maxSize,
      };
    });
}

// ---------------------------------------------------------------- parsing

/**
 * Parse a DMARC record string into its tags and derived facts.
 * Tolerates whitespace, case differences, and an optional trailing dot.
 */
export function parseDmarcRecord(raw: string): DmarcRecordAnalysis {
  const tags: DmarcTag[] = [];
  const record = raw.trim().replace(/^"|"$/g, ""); // strip surrounding quotes
  for (const part of record.split(";")) {
    const piece = part.trim();
    if (!piece) continue;
    const eq = piece.indexOf("=");
    if (eq === -1) {
      tags.push({ key: piece.toLowerCase(), value: "" });
      continue;
    }
    tags.push({
      key: piece.slice(0, eq).trim().toLowerCase(),
      value: piece.slice(eq + 1).trim(),
    });
  }

  const get = (key: string): string | null =>
    tags.find((t) => t.key === key)?.value ?? null;

  const version = get("v");

  const problems: string[] = [];
  if (!version) {
    problems.push('No "v=DMARC1" tag — without a version tag this TXT record is not a DMARC policy record at all.');
  } else if (version.toUpperCase() !== "DMARC1") {
    problems.push(`Version tag is "${version}", expected "DMARC1". Receivers will ignore the record.`);
  }

  const p = get("p");
  if (version && !p) {
    problems.push('No "p=" tag — the policy is undefined, so receivers treat the record as invalid (RFC 7489 §6.3).');
  } else if (p && !["none", "quarantine", "reject"].includes(p.toLowerCase())) {
    problems.push(`p="${p}" is not one of none/quarantine/reject.`);
  }

  const pctRaw = get("pct");
  let pct: number | null = null;
  if (pctRaw !== null) {
    pct = parseInt(pctRaw, 10);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      problems.push(`pct="${pctRaw}" is outside 0-100.`);
      pct = null;
    }
  }

  const advisories: string[] = [];
  const sp = get("sp");
  const adkim = get("adkim");
  const aspf = get("aspf");
  if (adkim === "s" || aspf === "s") {
    advisories.push(
      "Strict alignment (adkim=s or aspf=s) is on: subcommands of your own domain no longer align. Common cause of sudden DMARC failure after adding a new sender."
    );
  }
  if (pct !== null && pct < 100 && p && p.toLowerCase() !== "none") {
    advisories.push(`pct=${pct} applies the ${p} policy to only ${pct}% of failing mail — useful for rollout, but remember to remove it when the rollout is done.`);
  }
  if (p?.toLowerCase() === "none" && !get("rua")) {
    advisories.push(
      "p=none with no rua= means you get no reports at all — monitoring is exactly what p=none is for."
    );
  }

  const ruaRaw = get("rua") ?? "";
  const rufRaw = get("ruf") ?? "";
  const rua = parseUris(ruaRaw);
  const ruf = parseUris(rufRaw);

  if (version && !ruaRaw && !get("ruf")) {
    advisories.push(
      "No rua= tag: the policy exists but nobody receives aggregate reports, so you can never see what passes or fails."
    );
  }

  return {
    valid: problems.length === 0,
    raw: record,
    tags,
    version,
    policy: p?.toLowerCase() ?? null,
    subdomainPolicy: sp?.toLowerCase() ?? null,
    adkim,
    aspf,
    pct,
    rua,
    ruf,
    problems,
    advisories,
  };
}

/** Mark each URI external when its host differs from the policy domain. */
export function withExternalFlags(analysis: DmarcRecordAnalysis, policyDomain: string): DmarcRecordAnalysis {
  const domain = policyDomain.toLowerCase().replace(/\.$/, "");
  const mark = (u: ReportUri): ReportUri => ({
    ...u,
    external: domain.length > 0 && u.host !== domain && !u.host.endsWith(`.${domain}`),
  });
  return { ...analysis, rua: analysis.rua.map(mark), ruf: analysis.ruf.map(mark) };
}

// ------------------------------------------------- §7.1 external verification

/**
 * The TXT record a destination domain must publish so receivers will forward
 * a policy domain's reports to it (RFC 7489 §7.1).
 *
 *   <policy-domain>._report._dmarc.<destination-host>  TXT  "v=DMARC1[; rua=<uris>]"
 *
 * The optional rua= list inside the value restricts which addresses may be
 * used; publishing just "v=DMARC1" authorizes any address at that host.
 */
export function externalAuthorizationRecords(
  policyDomain: string,
  uris: ReportUri[]
): ExternalAuthRecord[] {
  const domain = policyDomain.toLowerCase().replace(/\.$/, "");
  return uris
    .filter((u) => u.external)
    .map((u) => {
      const value = u.mailto
        ? `v=DMARC1; rua=${u.uri}`
        : "v=DMARC1";
      return {
        name: `${domain}._report._dmarc.${u.host}`,
        value,
        policyDomain: domain,
        destinationHost: u.host,
      };
    });
}

export interface RuaPlan {
  analysis: DmarcRecordAnalysis;
  externalRecords: ExternalAuthRecord[];
  /** Where reports will actually flow, in plain language. */
  summary: string;
}

/** Build the full §7.1 guidance for one record + the domain it belongs to. */
export function planExternalAuthorization(recordText: string, policyDomain: string): RuaPlan {
  const analysis = withExternalFlags(parseDmarcRecord(recordText), policyDomain);
  const externalRecords = externalAuthorizationRecords(policyDomain, analysis.rua);
  const ext = analysis.rua.filter((u) => u.external);
  let summary: string;
  if (analysis.rua.length === 0) {
    summary = "This record sends no aggregate reports anywhere (no rua=). Add one to start monitoring.";
  } else if (ext.length === 0) {
    summary = `All ${analysis.rua.length} report address${analysis.rua.length === 1 ? " is" : "es are"} at your own domain — no external authorization needed.`;
  } else {
    summary = `${ext.length} of ${analysis.rua.length} report address${analysis.rua.length === 1 ? "" : "es"} go${ext.length === 1 ? "es" : ""} to an external host (${ext.map((u) => u.host).join(", ")}). Until ${ext.length === 1 ? "that host publishes" : "those hosts publish"} the authorization record${ext.length === 1 ? "" : "s"} below, mail servers are required to withhold the reports — this is the classic "my rua is set but nothing arrives" failure.`;
  }
  return { analysis, externalRecords, summary };
}
