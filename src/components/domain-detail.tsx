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
  orgs: string[];
  lastSeen: string;
}

interface Detail {
  domain: { id: string; name: string; policy: string; mailboxToken: string };
  plan: { historyDays: number; csvExport: boolean };
  summary: {
    volume: number;
    dmarcPassVolume: number;
    dmarcFailVolume: number;
    passRate: number | null;
  };
  sources: SourceRow[];
  providers: { org: string; volume: number }[];
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
              <EmptyState
                title="No reports stored yet"
                body="Point your domain's DMARC rua tag at the ingestion URL (the copy button above) and reports will start landing within 24 hours — providers typically send daily."
                action={
                  <Link href="/docs/ingestion">
                    <Button variant="outline" size="sm">Ingestion docs</Button>
                  </Link>
                }
              />
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
    </div>
  );
}
