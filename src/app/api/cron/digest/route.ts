import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendMail } from "@/lib/mail";
import { log } from "@/lib/log";
import { planFor } from "@/lib/plan";
import { digestWindowStart } from "@/lib/digest-window";

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
  const { createHmac, timingSafeEqual } = await import("node:crypto");
  const expected = Buffer.from(createHmac("sha256", "dd-cron").update(String(secret ?? "")).digest("hex"), "utf8");
  const provided = Buffer.from(createHmac("sha256", "dd-cron").update(auth.replace(/^Bearer /, "")).digest("hex"), "utf8");
  if (!secret || expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // Honest expiry: shared analyzer results past their 7-day window are deleted,
  // not just hidden. Opportunistic cull piggybacks on the scheduled run.
  try {
    const culled = await db.analyzeRecord.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    if (culled.count > 0) log.info("cron.culled_share_records", { count: culled.count });
  } catch (e) {
    log.warn("cron.cull_error", { error: String(e) });
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
      // `recent` (trailing 7 days) drives new-source alert detection below.
      // Digest volume is computed separately over its own idempotent window.
      const recent = domain.reports.filter((r) => r.seenAt.getTime() >= weekAgo);

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

      // ---- weekly digest (idempotent) ---------------------------------------
      // The digest covers everything since the last one we ACTUALLY sent,
      // capped at the trailing 7 days (digestWindowStart). A "weekly_digest"
      // AlertEvent is written only after sendMail reports success, so:
      //   - scheduler retries / overlapping runs find no new reports after
      //     the marker -> volume 0 -> no duplicate email;
      //   - a failed send writes no marker -> the next run retries naturally.
      // (Email delivery itself is degraded-but-honest while RESEND_API_KEY is
      // unset: sendMail returns {sent:false}, so no marker, no false "sent".)
      const lastDigest = await db.alertEvent.findFirst({
        where: { domainId: domain.id, type: "weekly_digest" },
        orderBy: { createdAt: "desc" },
      });
      const windowStart = digestWindowStart(
        lastDigest ? (lastDigest.emailedAt ?? lastDigest.createdAt) : null,
        new Date()
      );
      const digestRecent = domain.reports.filter((r) => r.seenAt.getTime() >= windowStart.getTime());
      const digestVolume = digestRecent.reduce((s, r) => s + r.count, 0);

      if (digestVolume > 0) {
        const digestFailVolume = digestRecent
          .filter((r) => r.spf !== "pass" && r.dkim !== "pass")
          .reduce((s, r) => s + r.count, 0);
        const passRate = Math.round(((digestVolume - digestFailVolume) / digestVolume) * 100);
        const lines = [
          `Your week on ${domain.name}:`,
          ``,
          `${digestVolume} emails reported by providers. ${passRate}% passed DMARC.`,
          digestFailVolume > 0
            ? `${digestFailVolume} emails failed — check your dashboard before this becomes spam-folder pain.`
            : `Everything authenticated cleanly. Consider whether your policy can move past p=none.`,
          ``,
          `— DmarcDuck (because nobody should read raw XML)`,
        ];
        const res = await sendMail({ to: user.email, subject: `[DmarcDuck] Weekly digest: ${domain.name}`, text: lines.join("\n") });
        if (res.sent) {
          digestsSent += 1;
          await db.alertEvent.create({
            data: {
              domainId: domain.id,
              type: "weekly_digest",
              payload: JSON.stringify({ volume: digestVolume, since: windowStart.toISOString() }),
              emailedAt: new Date(),
            },
          });
        }
      }
    }
  }

  log.info("cron.digest", { digestsSent, alertsQueued });
  return NextResponse.json({ ok: true, digestsSent, alertsQueued });
}

export async function GET(req: NextRequest) { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }
