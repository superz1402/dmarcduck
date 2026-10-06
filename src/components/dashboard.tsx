"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import { Plus, Trash2, Copy, Check } from "lucide-react";

interface DomainRow {
  id: string;
  name: string;
  policy: string;
  mailboxToken: string;
  reportCount: number;
}

export function Dashboard({ userEmail }: { userEmail: string }) {
  const router = useRouter();
  const [domains, setDomains] = useState<DomainRow[] | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/domains");
    if (res.status === 401) { router.push("/login"); return; }
    const data = await res.json();
    setDomains(data.domains ?? []);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const addDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not add the domain.");
        return;
      }
      setName("");
      await load();
    } finally {
      setBusy(false);
    }
  };

  const removeDomain = async (id: string, dn: string) => {
    if (!confirm(`Remove ${dn} and all its stored reports? This cannot be undone.`)) return;
    await fetch(`/api/domains/${id}`, { method: "DELETE" });
    await load();
  };

  const copyIngestUrl = async (token: string) => {
    const url = `${window.location.origin}/api/ingest/${token}`;
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 1500);
  };

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your domains</h1>
          <p className="text-sm text-muted-foreground">Signed in as {userEmail}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/analyze">
            <Button variant="outline" size="sm">Analyzer</Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={signOut}>Sign out</Button>
        </div>
      </div>

      <Card className="mt-6">
        <CardContent className="p-4">
          <form onSubmit={addDomain} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Label htmlFor="domain">Add a domain to monitor</Label>
              <Input
                id="domain"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="example.com"
                autoComplete="off"
              />
              <FieldError>{error}</FieldError>
            </div>
            <Button type="submit" variant="accent" disabled={busy || !name.trim()}>
              <Plus className="h-4 w-4" /> Add domain
            </Button>
          </form>
        </CardContent>
      </Card>

      {domains === null ? (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : domains.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No domains yet"
            body="Add your sending domain above, then point its DMARC rua reports at your private ingestion URL. Not sure how? The docs walk you through it in about five minutes."
            action={
              <Link href="/docs/ingestion">
                <Button variant="outline" size="sm">How ingestion works</Button>
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {domains.map((d) => (
            <Card key={d.id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/app/domains/${d.id}`}
                      className="truncate font-semibold hover:text-accent"
                    >
                      {d.name}
                    </Link>
                    <Badge tone={d.policy === "reject" ? "success" : d.policy === "quarantine" ? "warning" : "neutral"}>
                      p={d.policy}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    <span className="tnum">{d.reportCount.toLocaleString()}</span> stored report {d.reportCount === 1 ? "row" : "rows"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyIngestUrl(d.mailboxToken)}
                    aria-label={`Copy ingestion URL for ${d.name}`}
                  >
                    {copiedToken === d.mailboxToken ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copiedToken === d.mailboxToken ? "Copied" : "Ingestion URL"}
                  </Button>
                  <Link href={`/app/domains/${d.id}`}>
                    <Button size="sm">Open</Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDomain(d.id, d.name)}
                    aria-label={`Remove ${d.name}`}
                  >
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
