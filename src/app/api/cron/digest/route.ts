import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendMail } from "@/lib/mail";
import { log } from "@/lib/log";
import { planFor } from "@/lib/plan";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET/POST /api/cron/digest — scheduled digest + alert pass.
 * Guarded by CRON_SECRET (Authorization: Bearer <secret>).
 * Designed to run from Vercel Cron or a GitHub Actions schedule (free tiers).
 */
async function handle(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const users = await db.user.findMany({
    include: { subscription: true, domains: { include: { reports: { orderBy: { seenAt: "desc" }, take: 2000 } } } },
  });

  let digestsSent = 0, alertsQueued = 0;
  for (const user of users) {
    const plan = planFor(user.subscription);
    if (!plan.weeklyDigest) continue;

    for (const domain of user.domains) {
      const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
      const recent = domain.reports.filter((r) => r.seenAt.getTime() >= weekAgo);
      const volume = recent.reduce((s, r) => s + r.count, 0);
      const failVolume = recent.filter((r) => r.spf !== "pass" && r.dkim !== "pass").reduce((s, r) => s + r.count, 0);

      // New-source alert: an IP we have never stored before this week.
      if (plan.alerts) {
        const weekAgoTime = new Date(weekAgo);
        const olderIps = new Set(
          domain.reports.filter((r) => r.seenAt < weekAgoTime).map((r) => r.sourceIp)
        );
        const newSources = new Set(
          recent.filter((r) => !olderIps.has(r.sourceIp)).map((r) => r.sourceIp)
        );
        if (newSources.size > 0) {
          const existing = await db.alertEvent.findFirst({
            where: { domainId: domain.id, type: "new_source", createdAt: { gte: weekAgoTime } },
          });
          if (!existing) {
            await db.alertEvent.create({
              data: {
                domainId: domain.id,
                type: "new_source",
                payload: JSON.stringify({ sources: Array.from(newSources) }),
              },
            });
            alertsQueued += 1;
          }
        }
      }

      if (volume > 0) {
        const passRate = Math.round(((volume - failVolume) / volume) * 100);
        const lines = [
          `Your week on ${domain.name}:`,
          ``,
          `${volume} emails reported by providers. ${passRate}% passed DMARC.`,
          failVolume > 0
            ? `${failVolume} emails failed — check your dashboard before this becomes spam-folder pain.`
            : `Everything authenticated cleanly. Consider whether your policy can move past p=none.`,
          ``,
          `— DmarcDuck (because nobody should read raw XML)`,
        ];
        const res = await sendMail({ to: user.email, subject: `[DmarcDuck] Weekly digest: ${domain.name}`, text: lines.join("\n") });
        if (res.sent) digestsSent += 1;
      }
    }
  }

  log.info("cron.digest", { digestsSent, alertsQueued });
  return NextResponse.json({ ok: true, digestsSent, alertsQueued });
}

export async function GET(req: NextRequest) { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }
