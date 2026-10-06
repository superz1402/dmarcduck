import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { PLANS } from "@/lib/plan";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Free analyzer, multi-domain monitoring from $7/month. Flat, honest pricing — no per-domain tax.",
};

const order = ["free", "starter", "studio"] as const;

const featuresFor = (planId: (typeof order)[number]) => {
  const p = PLANS[planId];
  return [
    [`${p.maxDomains} domain${p.maxDomains === 1 ? "" : "s"}`, true],
    [p.id === "free" ? "Manual uploads (unlimited)" : "Automated report ingestion", true],
    [`${p.historyDays < 100 ? "30-day" : "13-month"} history`, true],
    ["New-source email alerts", p.alerts],
    ["Weekly digest email", p.weeklyDigest],
    ["Guided policy enforcement", p.enforcementGuide],
    ["CSV export", p.csvExport],
  ] as const;
};

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <header className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Honest pricing</h1>
        <p className="mt-3 leading-relaxed text-muted-foreground">
          The analyzer is free forever, without an account. Paid plans exist for
          the genuinely recurring work: collecting reports automatically,
          watching for new sources, and emailing you only when it matters.
        </p>
      </header>

      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {order.map((id) => {
          const plan = PLANS[id];
          const highlight = id === "starter";
          return (
            <Card
              key={id}
              className={highlight ? "border-accent/60 shadow-[0_0_0_1px_var(--accent)]" : undefined}
            >
              <CardContent className="flex h-full flex-col p-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">{plan.name}</h2>
                  {highlight ? <Badge tone="accent">Most useful</Badge> : null}
                </div>
                <p className="tnum mt-3">
                  <span className="text-3xl font-semibold">${plan.priceMonthly}</span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{plan.blurb}</p>
                <ul className="mt-5 flex-1 space-y-2 text-sm">
                  {featuresFor(id).map(([label, on]) => (
                    <li key={label as string} className="flex items-start gap-2">
                      <Check
                        className={`mt-0.5 h-4 w-4 shrink-0 ${on ? "text-success" : "text-muted-foreground/40"}`}
                        aria-hidden
                      />
                      <span className={on ? "" : "text-muted-foreground/60 line-through"}>
                        {label}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  {id === "free" ? (
                    <Link href="/analyze" className="block">
                      <Button variant="outline" className="w-full">Start with the analyzer</Button>
                    </Link>
                  ) : (
                    <Link href="/signup" className="block">
                      <Button variant={highlight ? "accent" : "primary"} className="w-full">
                        Choose {plan.name}
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mx-auto mt-12 max-w-2xl space-y-3 text-sm leading-relaxed text-muted-foreground">
        <p>
          <strong className="text-foreground">How billing works.</strong> Checkout
          and invoicing run through Lemon Squeezy as merchant of record, so taxes
          are handled properly. Cancel in one click; the plan stays active until
          the period ends. No annual lock-in, no &ldquo;contact sales&rdquo;.
        </p>
        <p>
          <strong className="text-foreground">Why flat per-account pricing.</strong>{" "}
          Per-domain pricing punishes exactly the people who most need DMARC —
          small operators with a main domain, a sandbox, and a newsletter domain.
          We would rather keep the price boring and the limits legible.
        </p>
      </div>
    </div>
  );
}
