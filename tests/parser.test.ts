import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseFeedbackXml, parseUpload, expandUpload } from "@/lib/dmarc/parser";
import { analyzeReports } from "@/lib/dmarc/analyze";
import { zipSync, strToU8, gzipSync } from "fflate";

const FIX = (n: string) => readFileSync(join(__dirname, "fixtures", n), "utf8");

const googleReport = FIX("google-report.xml");
const yahooReport = FIX("yahoo-report.xml");
const failingReport = FIX("failing-report.xml");
const junk = FIX("not-dmarc.xml");

describe("parseFeedbackXml", () => {
  it("parses a well-formed Google aggregate report", () => {
    const r = parseFeedbackXml(googleReport);
    expect(r).not.toBeNull();
    expect(r!.orgName).toBe("google.com");
    expect(r!.publishedDomain).toBe("example.com");
    expect(r!.policy.p).toBe("none");
    expect(r!.records).toHaveLength(2);
    expect(r!.records[0]).toMatchObject({
      sourceIp: "192.0.2.1",
      count: 120,
      spf: "pass",
      dkim: "pass",
      headerFrom: "example.com",
    });
    expect(r!.records[1].dkim).toBe("fail");
    expect(r!.dateBegin).toBe(1759708800);
  });

  it("handles multiple <record> rows and missing optional fields", () => {
    const r = parseFeedbackXml(yahooReport);
    expect(r).not.toBeNull();
    expect(r!.orgName).toBe("yahoo.com");
    expect(r!.policy.pct).toBe(100);
    expect(r!.records[0].spf).toBe("pass");
  });

  it("returns null for non-DMARC XML", () => {
    expect(parseFeedbackXml(junk)).toBeNull();
  });

  it("returns null for malformed XML without throwing", () => {
    expect(parseFeedbackXml("<feedback><broken")).toBeNull();
  });
});

describe("parseUpload (concatenated + warnings)", () => {
  it("parses concatenated <feedback> documents", () => {
    const { reports, warnings } = parseUpload("multi.xml", googleReport + yahooReport);
    expect(reports).toHaveLength(2);
    expect(warnings).toHaveLength(0);
  });

  it("warns on files without feedback structure", () => {
    const { reports, warnings } = parseUpload("junk.xml", junk);
    expect(reports).toHaveLength(0);
    expect(warnings[0].file).toBe("junk.xml");
  });
});

describe("expandUpload (zip + gz)", () => {
  it("expands a zip of xml reports", () => {
    const zip = zipSync({
      "a.xml": strToU8(googleReport),
      "b.xml": strToU8(yahooReport),
    });
    const files = expandUpload("bundle.zip", zip);
    expect(files).toHaveLength(2);
    expect(files.map((f) => f.name).sort()).toEqual(["a.xml", "b.xml"]);
  });

  it("expands a gzipped report", () => {
    // build gzip via fflate's gzipSync
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { gzipSync } = require("fflate") as typeof import("fflate");
    const gz = gzipSync(strToU8(googleReport));
    const files = expandUpload("report.xml.gz", gz);
    expect(files).toHaveLength(1);
    expect(files[0].name).toBe("report.xml");
  });
});

describe("analyzeReports", () => {
  it("aggregates by source IP and computes health", () => {
    const parsed = parseUpload("all.xml", googleReport + yahooReport).reports;
    const a = analyzeReports(parsed);
    expect(a.volume).toBe(120 + 3 + 87 + 12);
    expect(a.recordCount).toBe(4);
    expect(a.sources).toHaveLength(3);
    const top = a.sources[0];
    expect(top.ip).toBe("192.0.2.1");
    expect(top.volume).toBe(207);
    expect(top.dmarc).toBe("pass");
    expect(a.providers.map((p) => p.org).sort()).toEqual(["google.com", "yahoo.com"]);
    // 15 of 222 emails fail (yahoo's 203.0.113.7 row) -> attention, not healthy
    expect(a.health).toBe("attention");
    expect(a.healthReason).toContain("failing DMARC");
  });

  it("flags failing sources and critical health", () => {
    const parsed = parseUpload("bad.xml", failingReport).reports;
    const a = analyzeReports(parsed);
    expect(a.dmarcFailVolume).toBe(96);
    expect(a.health).toBe("critical");
    const src = a.sources.find((s) => s.ip === "203.0.113.66");
    expect(src?.suspicion).toBe("high");
    expect(src?.note).toContain("spoofing");
  });

  it("suggests policy move when clean but p=none", () => {
    const parsed = parseUpload("g.xml", googleReport).reports;
    // inflate volume so passRate/volume gates hit
    parsed[0].records[0].count = 5000;
    const a = analyzeReports(parsed);
    expect(a.health).toBe("attention");
    expect(a.healthReason).toContain("quarantine");
  });

  it("is honest about an empty upload", () => {
    const a = analyzeReports([], [{ file: "x.xml", reason: "no feedback" }]);
    expect(a.volume).toBe(0);
    expect(a.health).toBe("attention");
    expect(a.warnings).toHaveLength(1);
  });
});

describe("security guards", () => {
  it("rejects XML declaring DTD entities (billion-laughs defense)", () => {
    const evil = `<?xml version="1.0"?><!DOCTYPE feedback [<!ENTITY a "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa">]><feedback></feedback>`;
    const res = parseUpload("evil.xml", evil);
    expect(res.reports).toHaveLength(0);
    expect(res.warnings[0].reason).toMatch(/entities/i);
  });

  it("refuses gz decompression bombs beyond the 20 MB cap", () => {
    // 30 MB of zeros compresses to ~30 KB — a classic bomb shape.
    const big = new Uint8Array(30 * 1024 * 1024);
    const gz = gzipSync(big);
    expect(gz.length).toBeLessThan(1024 * 1024);
    expect(expandUpload("bomb.gz", gz)).toEqual([]);
  });

  it("still expands legitimate small gz reports", () => {
    const gz = gzipSync(strToU8(failingReport));
    const out = expandUpload("report.xml.gz", gz);
    expect(out).toHaveLength(1);
    expect(new TextDecoder().decode(out[0].bytes)).toContain("<feedback>");
  });
});
