"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/misc";
import { CheckCircle2, Copy, ExternalLink, ShieldAlert } from "lucide-react";

interface RuaUri {
  uri: string;
  mailto: boolean;
  host: string;
  external: boolean;
  maxSize: number | null;
}

interface CheckResult {
  domain: string;
  analysis: {
    valid: boolean;
    version: string | null;
    policy: string | null;
    subdomainPolicy: string | null;
    pct: number | null;
    adkim: string | null;
    aspf: string | null;
    rua: RuaUri[];
    ruf: RuaUri[];
    problems: string[];
    advisories: string[];
  };
  summary: string;
  externalRecords: { name: string; value: string; policyDomain: string; destinationHost: string }[];
  verification: { name: string; status: "authorized" | "missing" | "wrong-record" | "error"; value: string | null; error?: string }[] | null;
}

export function RuaChecker() {
  const [record, setRecord] = useState("");
  const [domain, setDomain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const submit = async (verify: boolean) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/tools/rua-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ record, domain, verify }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not analyze this record.");
        return;
      }
      setResult(data);
    } catch {
      setError("Network hiccup — check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="rua-domain">Your domain</Label>
            <Input
              id="rua-domain"
              placeholder="example.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div>
            <Label htmlFor="rua-record">DMARC record (the TXT value)</Label>
            <Input
              id="rua-record"
              placeholder='v=DMARC1; p=none; rua=mailto:dmarc@monitor.example.net'
              value={record}
              onChange={(e) => setRecord(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="font-mono text-xs"
            />
          </div>
        </div>
        {error ? (
          <p role="alert" className="mt-4 rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger">
            {error}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="accent" onClick={() => submit(false)} disabled={!record.trim() || !domain.trim() || busy}>
            {busy ? <Spinner /> : null}
            {busy ? "Checking…" : "Check record"}
          </Button>
          <Button variant="outline" onClick={() => submit(true)} disabled={!record.trim() || !domain.trim() || busy}>
            Check + verify DNS
          </Button>
        </div>
      </Card>

      {result ? (
        <div className="space-y-4" role="region" aria-label="Record check result">
          {/* Summary — the one loud thing on this screen */}
          <Card className="flex items-start gap-3 border-accent/40 bg-accent-soft/30 p-5">
            {result.analysis.problems.length > 0 ? (
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden />
            ) : (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />
            )}
            <div>
              <p className="font-medium leading-6">{result.summary}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Policy p={result.analysis.policy ?? "—"}
                {result.analysis.subdomainPolicy ? ` · sp=${result.analysis.subdomainPolicy}` : ""}
                {result.analysis.pct !== null ? ` · pct=${result.analysis.pct}` : ""}
                {result.analysis.adkim ? ` · adkim=${result.analysis.adkim}` : ""}
                {result.analysis.aspf ? ` · aspf=${result.analysis.aspf}` : ""}
              </p>
            </div>
          </Card>

          {result.analysis.problems.length > 0 ? (
            <Card className="p-5">
              <h2 className="font-semibold">Record problems</h2>
              <ul className="mt-2 space-y-2 text-sm leading-6">
                {result.analysis.problems.map((p, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-danger" aria-hidden>•</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {result.externalRecords.length > 0 ? (
            <Card className="p-5">
              <h2 className="font-semibold">
                Publish at the report destination
                <span className="ml-2 text-sm font-normal text-muted-foreground">RFC 7489 §7.1</span>
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                These TXT records go in the DNS zone of the destination host — that is
                {" "}{result.externalRecords.map((r) => r.destinationHost).join(", ")}{result.externalRecords.length === 1 ? "" : " respectively"} —
                not your own zone.
              </p>
              <ul className="mt-4 space-y-3">
                {result.externalRecords.map((r, i) => {
                  const ver = result.verification?.find((v) => v.name === r.name) ?? null;
                  return (
                    <li key={r.name} className="rounded-lg bg-muted p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-all font-mono text-xs font-medium">{r.name}</p>
                          <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                            TXT &quot;{r.value}&quot;
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copy(`${r.name} 3600 IN TXT "${r.value}"`, `rec-${i}`)}
                        >
                          {copied === `rec-${i}` ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          {copied === `rec-${i}` ? "Copied" : "Copy"}
                        </Button>
                      </div>
                      {ver ? (
                        ver.status === "authorized" ? (
                          <p className="mt-2 flex items-center gap-1.5 text-sm text-success">
                            <CheckCircle2 className="h-4 w-4" aria-hidden /> Already published and live — reports are authorized to flow.
                          </p>
                        ) : ver.status === "missing" ? (
                          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                            <ExternalLink className="h-4 w-4" aria-hidden /> Not published yet — reports stay withheld until this record is live.
                          </p>
                        ) : ver.status === "wrong-record" ? (
                          <p className="mt-2 text-sm text-muted-foreground">
                            <ExternalLink className="mr-1.5 inline h-4 w-4" aria-hidden /> A TXT record exists at this name but it is not a DMARC authorization (often a wildcard or a leftover SPF record). Publish the record above at the same name — per RFC 7489 §7.1 the authorization wins once it exists.
                          </p>
                        ) : (
                          <p className="mt-2 text-sm text-muted-foreground">{ver.error}</p>
                        )
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </Card>
          ) : null}

          {result.analysis.advisories.length > 0 ? (
            <Card className="p-5">
              <h2 className="font-semibold">Worth knowing</h2>
              <ul className="mt-2 space-y-2 text-sm leading-6 text-muted-foreground">
                {result.analysis.advisories.map((a, i) => (
                  <li key={i} className="flex gap-2">
                    <span aria-hidden>·</span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
