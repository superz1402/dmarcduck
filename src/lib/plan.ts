/**
 * Plan entitlements — single source of truth for pricing limits.
 * Kept boring on purpose: easy to read, easy to change, easy to test.
 */

export type PlanId = "free" | "starter" | "studio";

export interface Plan {
  id: PlanId;
  name: string;
  priceMonthly: number;
  maxDomains: number;
  historyDays: number;
  automatedIngestion: boolean;
  alerts: boolean;
  weeklyDigest: boolean;
  enforcementGuide: boolean;
  csvExport: boolean;
  blurb: string;
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    maxDomains: 1,
    historyDays: 30,
    automatedIngestion: false,
    alerts: false,
    weeklyDigest: false,
    enforcementGuide: false,
    csvExport: false,
    blurb: "Instant analyzer + your first domain on manual uploads.",
  },
  starter: {
    id: "starter",
    name: "Starter",
    priceMonthly: 7,
    maxDomains: 3,
    historyDays: 395,
    automatedIngestion: true,
    alerts: true,
    weeklyDigest: true,
    enforcementGuide: true,
    csvExport: false,
    blurb: "Automated report collection, alerts on new sources, weekly digest.",
  },
  studio: {
    id: "studio",
    name: "Studio",
    priceMonthly: 19,
    maxDomains: 10,
    historyDays: 395,
    automatedIngestion: true,
    alerts: true,
    weeklyDigest: true,
    enforcementGuide: true,
    csvExport: true,
    blurb: "Ten domains, enforcement guidance, CSV export.",
  },
};

export function planFor(subscription?: { status: string; plan: string } | null): Plan {
  if (subscription && subscription.status === "active") {
    const plan = subscription.plan as PlanId;
    if (plan === "starter" || plan === "studio") return PLANS[plan];
  }
  return PLANS.free;
}
