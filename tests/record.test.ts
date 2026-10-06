import { describe, it, expect } from "vitest";
import { parseFeedbackXml } from "@/lib/dmarc/parser";
import { analyzeReports } from "@/lib/dmarc/analyze";
import { parseDmarcRecord, planExternalAuthorization, hostOf } from "@/lib/dmarc/record";

// ---------------------------------------------------------------- helpers

/** RFC 7489 Appendix C record with full auth_results + reasons (the shape big providers send). */
function feedbackXml(rec: string, domain = "example.com"): string {
  return `<feedback>
  <report_metadata>
    <org_name>google.com</org_name>
    <report_id>test-1</report_id>
    <date_range><begin>1759708800</begin><end>1759795199</end></date_range>
  </report_metadata>
  <policy_published>
    <domain>${domain}</domain>
    <p>none</p>
  </policy_published>
  ${rec}
</feedback>`;
}

const forwarderRecord = feedbackXml(`<record>
  <row>
    <source_ip>198.51.100.7</source_ip>
    <count>3</count>
    <policy_evaluated>
      <disposition>none</disposition>
      <dkim>fail</dkim>
      <spf>fail</spf>
      <reason><type>forwarded</type><comment>destination alias</comment></reason>
    </policy_evaluated>
  </row>
  <identifiers>
    <envelope_from>lists.example.net</envelope_from>
    <header_from>example.com</header_from>
  </identifiers>
  <auth_results>
    <dkim><domain>example.com</domain><selector>s1</selector><result>fail</result></dkim>
    <spf><domain>lists.example.net</domain><scope>mfrom</scope><result>fail</result></spf>
  </auth_results>
</record>`);

const spoofRecord = feedbackXml(`<record>
  <row>
    <source_ip>203.0.113.66</source_ip>
    <count>9</count>
    <policy_evaluated>
      <disposition>none</disposition>
      <dkim>fail</dkim>
      <spf>fail</spf>
    </policy_evaluated>
  </row>
  <identifiers>
    <envelope_from>mailer.spammy.biz</envelope_from>
    <header_from>example.org</header_from>
  </identifiers>
  <auth_results>
    <spf><domain>mailer.spammy.biz</domain><scope>mfrom</scope><result>fail</result></spf>
  </auth_results>
</record>`, "example.com");

describe("parser: auth_results, reasons, envelope identifiers", () => {
  it("extracts envelope_from, dkim identities and policy reasons", () => {
    const r = parseFeedbackXml(forwarderRecord)!;
    expect(r).not.toBeNull();
    const rec = r.records[0];
    expect(rec.envelopeFrom).toBe("lists.example.net");
    expect(rec.dkimAuth).toEqual([{ domain: "example.com", selector: "s1", result: "fail" }]);
    expect(rec.spfAuth).toEqual([{ domain: "lists.example.net", scope: "mfrom", result: "fail" }]);
    expect(rec.reasons).toEqual([{ type: "forwarded", comment: "destination alias" }]);
  });

  it("defaults the new fields when the report omits auth_results entirely", () => {
    const r = parseFeedbackXml(feedbackXml(`<record>
      <row><source_ip>192.0.2.9</source_ip><count>1</count>
      <policy_evaluated><disposition>none</disposition><dkim>pass</dkim><spf>pass</spf></policy_evaluated></row>
      <identifiers><header_from>example.com</header_from></identifiers>
    </record>`))!;
    expect(r.records[0].envelopeFrom).toBe("");
    expect(r.records[0].dkimAuth).toEqual([]);
    expect(r.records[0].spfAuth).toEqual([]);
    expect(r.records[0].reasons).toEqual([]);
  });

  it("handles repeated auth_results entries (multiple DKIM signatures)", () => {
    const r = parseFeedbackXml(feedbackXml(`<record>
      <row><source_ip>192.0.2.10</source_ip><count>2</count>
      <policy_evaluated><disposition>none</disposition><dkim>pass</dkim><spf>fail</spf></policy_evaluated></row>
      <identifiers><envelope_from>bounces.example.net</envelope_from><header_from>example.com</header_from></identifiers>
      <auth_results>
        <dkim><domain>example.com</domain><selector>s1</selector><result>pass</result></dkim>
        <dkim><domain>esp.example.net</domain><selector>k2</selector><result>fail</result></dkim>
        <spf><domain>bounces.example.net</domain><scope>mfrom</scope><result>fail</result></spf>
      </auth_results>
    </record>`))!;
    expect(r.records[0].dkimAuth).toHaveLength(2);
    expect(r.records[0].dkimAuth[1].domain).toBe("esp.example.net");
  });
});

describe("analyzer: forwarder detection vs spoofing", () => {
  it("marks explicit-reason failing mail as likely forwarded, NOT spoofing", () => {
    const a = analyzeReports([parseFeedbackXml(forwarderRecord)!]);
    const s = a.sources.find((x) => x.ip === "198.51.100.7")!;
    expect(s.dmarc).toBe("fail");
    expect(s.likelyForwarded).toBe(true);
    expect(s.suspicion).not.toBe("high");
    expect(s.note).toContain("forwarded");
    expect(s.note).not.toContain("spoofing");
  });

  it("keeps calling unexplained third-party-envelope failure likely spoofing", () => {
    const a = analyzeReports([parseFeedbackXml(spoofRecord)!]);
    const s = a.sources.find((x) => x.ip === "203.0.113.66")!;
    expect(s.likelyForwarded).toBe(false);
    expect(s.suspicion).toBe("high");
    expect(s.note).toContain("spoofing");
  });

  it("detects the list-shaped envelope heuristic (googlegroups, lists.*)", () => {
    const xml = feedbackXml(`<record>
      <row><source_ip>198.51.100.8</source_ip><count>4</count>
      <policy_evaluated><disposition>none</disposition><dkim>fail</dkim><spf>fail</spf></policy_evaluated></row>
      <identifiers><envelope_from>googlegroups.com</envelope_from><header_from>example.com</header_from></identifiers>
    </record>`);
    const a = analyzeReports([parseFeedbackXml(xml)!]);
    expect(a.sources[0].likelyForwarded).toBe(true);
  });

  it("groups sender identities by header_from + envelope_from", () => {
    const a = analyzeReports([parseFeedbackXml(forwarderRecord)!]);
    expect(a.senders).toHaveLength(1);
    const id = a.senders[0];
    expect(id.headerFrom).toBe("example.com");
    expect(id.envelopeFrom).toBe("lists.example.net");
    expect(id.volume).toBe(3);
    expect(id.likelyForwarded).toBe(true);
  });

  it("separates two identities with the same header_from but different envelopes", () => {
    const xmlA = feedbackXml(`<record>
      <row><source_ip>192.0.2.21</source_ip><count>5</count>
      <policy_evaluated><disposition>none</disposition><dkim>pass</dkim><spf>pass</spf></policy_evaluated></row>
      <identifiers><envelope_from>example.com</envelope_from><header_from>example.com</header_from></identifiers>
    </record>`);
    const xmlB = feedbackXml(`<record>
      <row><source_ip>192.0.2.22</source_ip><count>7</count>
      <policy_evaluated><disposition>none</disposition><dkim>pass</dkim><spf>pass</spf></policy_evaluated></row>
      <identifiers><envelope_from>mailchimp.example.co</envelope_from><header_from>example.com</header_from></identifiers>
    </record>`);
    const a = analyzeReports([parseFeedbackXml(xmlA)!, parseFeedbackXml(xmlB)!]);
    expect(a.senders).toHaveLength(2);
    expect(a.senders.map((s) => s.envelopeFrom).sort()).toEqual(["example.com", "mailchimp.example.co"]);
  });
});

// ---------------------------------------------------------------- §7.1

describe("dmarc record: parsing", () => {
  it("parses tags case-insensitively with whitespace tolerance", () => {
    const a = parseDmarcRecord('v=DMARC1; P = None; RuA=mailto:agg@rep.example.net; pct = 100');
    expect(a.valid).toBe(true);
    expect(a.policy).toBe("none");
    expect(a.rua).toHaveLength(1);
    expect(a.rua[0].host).toBe("rep.example.net");
    expect(a.pct).toBe(100);
  });

  it("flags a missing version and a missing p", () => {
    const noV = parseDmarcRecord("p=none; rua=mailto:a@b.com");
    expect(noV.valid).toBe(false);
    expect(noV.problems[0]).toContain("v=DMARC1");
    const noP = parseDmarcRecord("v=DMARC1");
    expect(noP.valid).toBe(false);
    expect(noP.problems.join(" ")).toContain("p=");
  });

  it("parses size limits on rua URIs", () => {
    const a = parseDmarcRecord("v=DMARC1; p=none; rua=mailto:agg@rep.example.net!10k");
    expect(a.rua[0].maxSize).toBe(10 * 1024);
  });

  it("advises when p=none ships without any rua", () => {
    const a = parseDmarcRecord("v=DMARC1; p=none");
    expect(a.problems).toHaveLength(0);
    expect(a.advisories.some((x) => x.includes("no rua="))).toBe(true);
  });
});

describe("dmarc record: RFC 7489 §7.1 external destinations", () => {
  it("marks cross-domain rua as external and same-domain as internal", () => {
    const rec = "v=DMARC1; p=none; rua=mailto:a@rep.example.net, mailto:b@example.com";
    const plan = planExternalAuthorization(rec, "example.com");
    expect(plan.analysis.rua.map((u) => u.external)).toEqual([true, false]);
    expect(plan.externalRecords).toHaveLength(1);
  });

  it("generates the exact authorization record name and value", () => {
    const rec = "v=DMARC1; p=none; rua=mailto:dmarc-reports@dmarcduck.test";
    const plan = planExternalAuthorization(rec, "example.com");
    expect(plan.externalRecords[0]).toEqual({
      name: "example.com._report._dmarc.dmarcduck.test",
      value: "v=DMARC1; rua=mailto:dmarc-reports@dmarcduck.test",
      policyDomain: "example.com",
      destinationHost: "dmarcduck.test",
    });
  });

  it("treats subdomains of the policy domain as internal", () => {
    const rec = "v=DMARC1; p=none; rua=mailto:agg@reports.example.com";
    const plan = planExternalAuthorization(rec, "example.com");
    expect(plan.externalRecords).toHaveLength(0);
    expect(plan.summary).toContain("no external authorization needed");
  });

  it("explains the silent-withholding failure in plain language", () => {
    const rec = "v=DMARC1; p=none; rua=mailto:dmarc@other.org";
    const plan = planExternalAuthorization(rec, "example.com");
    expect(plan.summary).toContain("external host (other.org)");
    expect(plan.summary).toContain("withhold");
  });

  it("summarizes records with no rua at all", () => {
    const plan = planExternalAuthorization("v=DMARC1; p=none", "example.com");
    expect(plan.externalRecords).toHaveLength(0);
    expect(plan.summary).toContain("no rua=");
  });

  it("hostOf handles mailto, https, bare addresses and ports", () => {
    expect(hostOf("mailto:a@b.example")).toBe("b.example");
    expect(hostOf("https://c.example/path")).toBe("c.example");
    expect(hostOf("d.example")).toBe("d.example");
    expect(hostOf("http://e.example:8080/x")).toBe("e.example");
  });
});
