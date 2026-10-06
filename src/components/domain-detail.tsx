"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import { Copy, Check, ArrowLeft } from "lucide-react";

interface SourceRow {
  ip: string;
  volume: number;
  dmarc: "pass" | "fail";
  spf: "pass" | "fail" | "mixed";
  dkim: "pass" | "fail" | "mixed";
  headerFrom: string;
  envelopeFrom: string;
  orgs: string[];
  lastSeen: string;
}

interface Detail {
  domain: { id: string; name: string; policy: string; mailboxToken: string };
  plan: { historyDays: number; csvExport: boolean };
  storage?: { totalRows: number; latestRowAt: string | null };
  summary: {
    volume: number;
    dmarcPassVolume: number;
    dmarcFailVolume: number;
    passRate: number | null;
  };
  sources: SourceRow[];
  providers: { org: string; volume: number }[];
  ingestion?: IngestionEvent[];
  unattributedRows?: number;
  windowDays?: number;
}

interface IngestionEvent {
  id: string | null;
  status: "processing" | "processed" | "partial" | "rejected";
  filesReceived: number;
  reportsParsed: number;
  recordsStored: number;
  duplicatesSkipped: number;
  mismatchSkipped: number;
  rejects: { name: string; reason: string }[];
  inclusion: { attributed: boolean; inWindow: number; outsideWindow: number };
  createdAt: string;
}

function ingestBadgeTone(s: IngestionEvent["status"]): "success" | "danger" | "warning" | "neutral" {
  return s === "processed" ? "success" : s === "partial" ? "warning" : s === "rejected" ? "danger" : "neutral";
}

function tone(v: string): "success" | "danger" | "warning" {
  return v === "pass" ? "success" : v === "mixed" ? "warning" : "danger";
}

export function DomainDetail({ domainId }: { domainId: string }) {
  const router = useRouter();
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/domains/${domainId}`)
      .then(async (res) => {
        if (res.status === 401) { router.push("/login"); return; }
        const json = await res.json();
        if (!res.ok) { setError(json.error ?? "Could not load this domain."); return; }
        setData(json);
      })
      .catch(() => setError("Network error while loading this domain."));
  }, [domainId, router]);

  const copyIngest = async () => {
    if (!data) return;
    await navigator.clipboard.writeText(`${window.location.origin}/api/ingest/${data.domain.mailboxToken}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (error) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          title="Couldn't load this domain"
          body={error}
          action={<Link href="/app"><Button variant="outline">Back to dashboard</Button></Link>}
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const passPct = data.summary.passRate !== null ? Math.round(data.summary.passRate * 100) : null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/app" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> All domains
          </Link>
          <h1 className="mt-1 flex items-center gap-3 text-2xl font-semibold tracking-tight">
            {data.domain.name}
            <Badge tone={data.domain.policy === "reject" ? "success" : data.domain.policy === "quarantine" ? "warning" : "neutral"}>
              p={data.domain.policy}
            </Badge>
          </h1>
        </div>
        <Button variant="outline" size="sm" onClick={copyIngest}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Ingestion URL copied" : "Copy ingestion URL"}
        </Button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Volume (window)</p>
            <p className="tnum mt-1 text-2xl font-semibold">{data.summary.volume.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">emails reported</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Pass rate</p>
            <p className="tnum mt-1 text-2xl font-semibold">{passPct === null ? "—" : `${passPct}%`}</p>
            <p className="text-xs text-muted-foreground">
              <span className="tnum">{data.summary.dmarcFailVolume.toLocaleString()}</span> failing
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Known sources</p>
            <p className="tnum mt-1 text-2xl font-semibold">{data.sources.length}</p>
            <p className="text-xs text-muted-foreground">distinct IP + From pairs</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Sources</CardTitle>
          <CardDescription>
            Aggregated across {data.plan.historyDays} days of history on your current plan.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 pb-2">
          {data.sources.length === 0 ? (
            <div className="p-6">
              {data.storage && data.storage.totalRows > 0 ? (
                <EmptyState
                  title="Reports are stored — just outside this window"
                  body={`${data.storage.totalRows.toLocaleString()} report ${data.storage.totalRows === 1 ? "row" : "rows"} stored. The latest arrived ${data.storage.latestRowAt ? new Date(data.storage.latestRowAt).toLocaleDateString() : "recently"}, which is older than your plan's ${data.plan.historyDays}-day window — so the stats above show nothing yet. New reports will appear here as providers send them.`}
                  action={
                    <Link href="/docs/ingestion">
                      <Button variant="outline" size="sm">Ingestion docs</Button>
                    </Link>
                  }
                />
              ) : (
                <EmptyState
                  title="No reports stored yet"
                  body="Point your domain's DMARC rua tag at the ingestion URL (the copy button above) and reports will start landing within 24 hours — providers typically send daily. Reports not arriving at all? The usual cause is the external-report authorization record."
                  action={
                    <div className="flex flex-wrap justify-center gap-2">
                      <Link href="/docs/ingestion">
                        <Button variant="outline" size="sm">Ingestion docs</Button>
                      </Link>
                      <Link href="/tools/dmarc-record">
                        <Button variant="outline" size="sm">Check rua authorization</Button>
                      </Link>
                    </div>
                  }
                />
              )}
            </div>
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
                    <TH>Envelope from</TH>
                    <TH>Last seen</TH>
                  </TR>
                </THead>
                <TBody>
                  {data.sources.map((s) => (
                    <TR key={`${s.ip}-${s.headerFrom}`}>
                      <TD className="font-mono text-xs">{s.ip}</TD>
                      <TD className="tnum text-right">{s.volume.toLocaleString()}</TD>
                      <TD><Badge tone={s.dmarc === "pass" ? "success" : "danger"}>{s.dmarc}</Badge></TD>
                      <TD><Badge tone={tone(s.spf)}>{s.spf}</Badge></TD>
                      <TD><Badge tone={tone(s.dkim)}>{s.dkim}</Badge></TD>
                      <TD className="font-mono text-xs">{s.headerFrom || "—"}</TD>
                      <TD className="font-mono text-xs text-muted-foreground">{s.envelopeFrom || "—"}</TD>
                      <TD className="tnum text-xs text-muted-foreground">
                        {new Date(s.lastSeen).toLocaleDateString()}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {data.providers.length > 0 ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Reporting providers</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {data.providers.map((p) => (
              <Badge key={p.org} tone="neutral">
                {p.org} · <span className="tnum">{p.volume.toLocaleString()}</span>
              </Badge>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Report ingestion activity</CardTitle>
          <CardDescription>
            Every delivery attempt to the ingestion URL — nothing happens silently.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!data.ingestion || data.ingestion.length === 0 ? (
            <EmptyState
              title="No reports have arrived yet"
              body="Once your DMARC rua tag points at the ingestion URL, each delivery shows up here with what was stored and what was skipped. Providers typically send within 24 hours."
            />
          ) : (
            <>
              {(data.unattributedRows ?? 0) > 0 ? (
                <p className="mb-3 rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
                  <span className="tnum font-medium text-foreground">{data.unattributedRows!.toLocaleString()}</span> stored{" "}
                  {data.unattributedRows === 1 ? "row" : "rows"} predate per-delivery attribution — what became of them in the stats is unknown, not inferred.
                </p>
              ) : null}
              <ul className="divide-y divide-border">
              {data.ingestion.map((ev) => (
                <li key={ev.id ?? ev.createdAt} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={ingestBadgeTone(ev.status)}>{ev.status}</Badge>
                    <span className="tnum text-sm">
                      {ev.recordsStored > 0 && (
                        <>
                          <span className="tnum font-medium">{ev.recordsStored.toLocaleString()}</span>{" "}
                          record{ev.recordsStored === 1 ? "" : "s"} stored
                        </>
                      )}
                      {ev.duplicatesSkipped > 0 && (
                        <span className="text-muted-foreground"> · <span className="tnum">{ev.duplicatesSkipped}</span> duplicate{ev.duplicatesSkipped === 1 ? "" : "s"} skipped</span>
                      )}
                      {ev.mismatchSkipped > 0 && (
                        <span className="text-muted-foreground"> · <span className="tnum">{ev.mismatchSkipped}</span> for another domain</span>
                      )}
                      {ev.recordsStored === 0 && ev.duplicatesSkipped === 0 && ev.mismatchSkipped === 0 && ev.status !== "rejected" && (
                        <span className="text-muted-foreground">nothing new to store</span>
                      )}
                    </span>
                    <time className="tnum ml-auto text-xs text-muted-foreground" dateTime={ev.createdAt}>
                      {new Date(ev.createdAt).toLocaleString()}
                    </time>
                  </div>
                  {ev.rejects.length > 0 && (
                    <ul className="mt-2 space-y-1 border-l-2 border-border pl-3">
                      {ev.rejects.map((rj, i) => (
                        <li key={i} className="text-xs text-muted-foreground">
                          <span className="font-mono">{rj.name}</span> — {rj.reason}
                        </li>
                      ))}
                    </ul>
                  )}
                  {ev.inclusion.attributed && (ev.recordsStored > 0 || ev.inclusion.inWindow > 0 || ev.inclusion.outsideWindow > 0) ? (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      In this {data.windowDays ?? 30}-day view:{" "}
                      <span className="tnum font-medium text-foreground">{ev.inclusion.inWindow}</span>{" "}
                      included
                      {ev.inclusion.outsideWindow > 0 ? (
                        <> · <span className="tnum font-medium text-foreground">{ev.inclusion.outsideWindow}</span> stored outside the window (in the database, not in the stats)</>
                      ) : null}
                    </p>
                  ) : null}
                  {!ev.inclusion.attributed ? (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Inclusion in the stats: <span className="font-medium text-foreground">unknown</span> — this delivery predates per-event attribution, so we cannot say which rows are in the current window without guessing. We do not guess.
                    </p>
                  ) : null}
                </li>
              ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
