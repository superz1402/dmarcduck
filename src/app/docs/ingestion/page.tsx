import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "How report ingestion works",
  description:
    "Point your domain's DMARC rua reports at DmarcDuck — via Cloudflare Email Routing (free) or any pipeline that can POST the report.",
};

const dnsExample = `_dmarc.example.com. IN TXT "v=DMARC1; p=none; rua=mailto:dmarc@reports.your-forward-domain.com; fo=1"`;

export default function IngestionDocs() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">How report ingestion works</h1>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          DMARC aggregate reports are XML emails that mailbox providers (Google,
          Yahoo, Microsoft…) send to the address in your domain&apos;s{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">rua=</code> tag —
          usually daily, sometimes zipped. DmarcDuck turns them into your dashboard.
        </p>
      </header>

      <ol className="mt-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle><span className="tnum mr-2 text-accent">1.</span>Add the domain in your dashboard</CardTitle>
          </CardHeader>
          <CardContent className="leading-relaxed text-muted-foreground">
            You&apos;ll get a private ingestion URL like
            {" "}<code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">/api/ingest/YOUR-TOKEN</code>.
            That token is the only credential needed for reports; rotate it by
            removing and re-adding the domain.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle><span className="tnum mr-2 text-accent">2.</span>Get reports delivered to that URL</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-muted-foreground">
            <p className="leading-relaxed">
              The recommended zero-cost path: <strong className="text-foreground">Cloudflare Email
              Routing</strong> (free). Create a route from an address like{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">dmarc@ingest.yourdomain.com</code>{" "}
              to a tiny Email Worker that POSTs the attachment to your ingestion
              URL. We provide the worker code in the repository README — about
              twenty lines.
            </p>
            <p className="leading-relaxed">
              Alternative: any automation (n8n, GitHub Actions, a cron script)
              that fetches reports from a mailbox and POSTs the raw XML or the
              zip to the URL. The endpoint accepts raw XML bodies and multipart
              file uploads, so almost anything can deliver.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle><span className="tnum mr-2 text-accent">3.</span>Set your rua (if you haven&apos;t)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
              Your DNS record routes reports to your forwarding address:
            </p>
            <pre className="scroll-slim overflow-x-auto rounded-lg bg-muted p-4 font-mono text-xs leading-relaxed">
              {dnsExample}
            </pre>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Providers start sending within 24–48 hours of the record propagating.
            </p>
          </CardContent>
        </Card>
      </ol>

      <div className="mt-10 rounded-[var(--radius-card)] border border-border bg-muted/40 p-6">
        <h2 className="font-semibold">Privacy stance</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Aggregate reports contain no message content — they are summaries of
          which IPs sent how much mail claiming to be your domain, and whether it
          authenticated. We store exactly that, tied to your domain, and delete
          everything when you remove the domain. The free analyzer keeps nothing
          beyond a 7-day-expiring share link, and only if you choose to share it.
        </p>
        <p className="mt-4 text-sm">
          <Link href="/signup" className="text-accent underline underline-offset-2">
            Create an account
          </Link>{" "}
          to set up a domain, or{" "}
          <Link href="/analyze" className="text-accent underline underline-offset-2">
            try the analyzer first
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
