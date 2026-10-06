import Link from "next/link";
import { DuckLogo } from "@/components/duck-logo";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, ShieldCheck, BellRing, FileText, ArrowRight } from "lucide-react";

const steps = [
  {
    icon: Upload,
    title: "Drop a report",
    body: "Grab any DMARC aggregate report — the XML (often zipped) your inbox provider already sends you. Drag it onto the analyzer. No signup, no email, no fine print.",
  },
  {
    icon: ShieldCheck,
    title: "Get plain-language answers",
    body: "Who is sending as you, whether it authenticated, and what to fix first. Every failing source is explained: spoofing, a forgotten sender, or a misconfigured tool.",
  },
  {
    icon: BellRing,
    title: "Then let it watch",
    body: "Register a domain and forward reports to your private address. Get an alert when a new source appears and a weekly digest you can read in 30 seconds.",
  },
];

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-16 pb-12 sm:pt-24">
        <div className="max-w-3xl">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-sm font-medium text-accent">
            <DuckLogo className="h-4 w-4" />
            DMARC, minus the pain
          </p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Your email provider sends you reports.
            <br />
            <span className="text-muted-foreground">Nobody reads them.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Since Google, Yahoo and Microsoft started requiring DMARC, every
            sending domain gets dense XML aggregate reports. DmarcDuck turns
            them into one honest answer: <strong className="text-foreground">is my email healthy, and is anyone
            pretending to be me?</strong>
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/analyze">
              <Button size="lg" variant="accent">
                <Upload className="h-4 w-4" />
                Analyze a report — free
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline">
                See pricing <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            No account needed for the analyzer. Files are parsed, shown, and the
            shareable link expires in 7 days.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 pb-16" aria-label="How it works">
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <Card key={s.title}>
              <CardContent className="p-6">
                <div className="mb-4 flex items-center gap-3">
                  <span className="tnum flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
                    {i + 1}
                  </span>
                  <s.icon className="h-5 w-5 text-muted-foreground" aria-hidden />
                </div>
                <h2 className="mb-2 font-semibold">{s.title}</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Honesty section — the anti-dark-pattern pitch */}
      <section className="border-y border-border bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="grid items-start gap-8 md:grid-cols-2">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                Built by someone who hates bad software pricing
              </h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                The big DMARC platforms charge $14+ per domain, per month — aimed
                at companies with procurement budgets. The free tools stop at a
                one-shot parser with hard limits. That leaves the rest of us:
                indie founders, small agencies, side projects, a personal domain
                with a newsletter.
              </p>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                DmarcDuck is the middle: a genuinely useful free analyzer, and
                multi-domain monitoring from <strong className="tnum text-foreground">$7/month</strong> —
                flat, honest, no per-domain tax.
              </p>
            </div>
            <div className="grid gap-3">
              {[
                ["No fake logos or testimonials", "There is no 'trusted by 10,000 teams' here. There is a parser with tests and a pricing page without asterisks."],
                ["No AI magic — on purpose", "This is a parsing and clarity problem. Adding a language model would make it slower, less predictable, and pricier. We didn't."],
                ["You can leave", "Your domains, your reports. CSV export on paid plans, delete a domain and its data is gone. No hostage-taking."],
              ].map(([title, body]) => (
                <Card key={title}>
                  <CardContent className="flex gap-3 p-4">
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                    <div>
                      <h3 className="text-sm font-semibold">{title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Try it with a report you already have</h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Check your inbox for a &ldquo;DMARC Report&rdquo; from Google or Yahoo — or point your
          rua address somewhere you can grab one. Then:
        </p>
        <div className="mt-6">
          <Link href="/analyze">
            <Button size="lg" variant="accent">
              <Upload className="h-4 w-4" />
              Open the analyzer
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
