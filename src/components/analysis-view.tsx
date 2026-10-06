"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { AlertTriangle, ShieldCheck, ShieldAlert, CircleCheck, CircleX } from "lucide-react";
import type { Analysis } from "@/lib/dmarc/analyze";
import { cn } from "@/lib/utils";

function fmtDate(epochSec: number) {
  if (!epochSec) return "—";
  return new Date(epochSec * 1000).toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric",
  });
}

export function AnalysisView({ analysis }: { analysis: Analysis }) {
  const rate = analysis.volume > 0 ? analysis.dmarcPassVolume / analysis.volume : null;
  const passPct = rate !== null ? Math.round(rate * 100) : null;

  return (
    <div className="space-y-4">
      {/* Health banner — states are labeled, never color-only */}
      <div
        role="status"
        className={cn(
          "flex items-start gap-3 rounded-[var(--radius-card)] border p-4",
          analysis.health === "healthy" && "border-success/30 bg-success-soft",
          analysis.health === "attention" && "border-accent/40 bg-accent-soft",
          analysis.health === "critical" && "border-danger/30 bg-danger-soft"
        )}
      >
        {analysis.health === "healthy" ? (
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />
        ) : analysis.health === "attention" ? (
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
        ) : (
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden />
        )}
        <div>
          <h2 className="font-semibold">
            {analysis.health === "healthy"
              ? "This mail is healthy"
              : analysis.health === "attention"
                ? "Worth a look"
                : "Act before this hurts deliverability"}
          </h2>
          <p className="mt-0.5 text-sm leading-relaxed">{analysis.healthReason}</p>
        </div>
      </div>

      {/* Summary row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Email volume</p>
            <p className="tnum mt-1 text-2xl font-semibold">{analysis.volume.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">
              {analysis.recordCount} record{analysis.recordCount === 1 ? "" : "s"} across{" "}
              {analysis.reportCount} report{analysis.reportCount === 1 ? "" : "s"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">DMARC pass rate</p>
            <p className="tnum mt-1 text-2xl font-semibold">
              {passPct === null ? "—" : `${passPct}%`}
            </p>
            <p className="text-xs text-muted-foreground">
              {analysis.dmarcFailVolume.toLocaleString()} failing emails
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Published policy</p>
            <p className="tnum mt-1 text-2xl font-semibold">p={analysis.policy?.p ?? "—"}</p>
            <p className="text-xs text-muted-foreground">
              {analysis.publishedDomain ?? "domain not in report"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Report window</p>
            <p className="tnum mt-1 text-sm font-medium leading-6">
              {analysis.dateRange ? `${fmtDate(analysis.dateRange.begin)} → ${fmtDate(analysis.dateRange.end)}` : "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {analysis.providers.length} provider{analysis.providers.length === 1 ? "" : "s"} reporting
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pass/fail bar — proportion made physical */}
      {analysis.volume > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Authentication split</CardTitle>
            <CardDescription>
              Share of reported email volume that passed DMARC (aligned SPF or DKIM).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="flex h-4 w-full overflow-hidden rounded-full bg-muted"
              role="img"
              aria-label={`Pass ${passPct} percent, fail ${100 - (passPct ?? 0)} percent`}
            >
              <div
                className="h-full bg-success"
                style={{ width: `${((passPct ?? 0)).toFixed(1)}%` }}
              />
              <div
                className="h-full bg-danger"
                style={{ width: `${(100 - (passPct ?? 0)).toFixed(1)}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span className="flex items-center gap-1.5 text-success">
                <CircleCheck className="h-4 w-4" aria-hidden />
                <span className="tnum">{analysis.dmarcPassVolume.toLocaleString()}</span> passed
              </span>
              <span className="flex items-center gap-1.5 text-danger">
                <CircleX className="h-4 w-4" aria-hidden />
                <span className="tnum">{analysis.dmarcFailVolume.toLocaleString()}</span> failed
              </span>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Sources table */}
      <Card>
        <CardHeader>
          <CardTitle>Sending sources</CardTitle>
          <CardDescription>
            Every IP that sent mail claiming to be your domain, worst first.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 pb-2">
          {analysis.sources.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              No records found in this upload.
            </p>
          ) : (
            <div className="scroll-slim max-h-96 overflow-y-auto">
              <Table>
                <THead>
                  <TR>
                    <TH>Source IP</TH>
                    <TH className="text-right">Emails</TH>
                    <TH>DMARC</TH>
                    <TH>SPF</TH>
                    <TH>DKIM</TH>
                    <TH>Claimed from</TH>
                    <TH>What this means</TH>
                  </TR>
                </THead>
                <TBody>
                  {analysis.sources.map((s) => (
                    <TR key={s.ip}>
                      <TD className="font-mono text-xs">{s.ip}</TD>
                      <TD className="tnum text-right">{s.volume.toLocaleString()}</TD>
                      <TD>
                        {s.dmarc === "pass" ? (
                          <Badge tone="success">pass</Badge>
                        ) : s.suspicion === "high" ? (
                          <Badge tone="danger">spoof?</Badge>
                        ) : (
                          <Badge tone="warning">fail</Badge>
                        )}
                      </TD>
                      <TD>
                        <Badge tone={s.spf === "pass" ? "success" : s.spf === "mixed" ? "warning" : "danger"}>
                          {s.spf}
                        </Badge>
                      </TD>
                      <TD>
                        <Badge tone={s.dkim === "pass" ? "success" : s.dkim === "mixed" ? "warning" : "danger"}>
                          {s.dkim}
                        </Badge>
                      </TD>
                      <TD className="font-mono text-xs">{s.headerFrom || "—"}</TD>
                      <TD className="max-w-72 text-xs leading-relaxed text-muted-foreground">{s.note}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Providers */}
      {analysis.providers.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Who reported</CardTitle>
            <CardDescription>Mailbox providers that sent these aggregate reports.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {analysis.providers.map((p) => (
              <Badge key={p.org} tone="neutral">
                {p.org} · <span className="tnum">{p.volume.toLocaleString()}</span>
              </Badge>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {analysis.warnings.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Parsing notes</CardTitle>
            <CardDescription>Files we skipped, and why — full honesty about what was read.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {analysis.warnings.map((w, i) => (
                <li key={i}>
                  <span className="font-mono text-xs">{w.file}</span> — {w.reason}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
