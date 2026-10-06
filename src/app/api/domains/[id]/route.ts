import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { planFor } from "@/lib/plan";
import { log } from "@/lib/log";

async function loadOwned(userId: string, domainId: string) {
  const domain = await db.domain.findUnique({
    where: { id: domainId },
    include: {
      reports: { orderBy: { seenAt: "desc" }, take: 2000 },
      ingestions: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!domain || domain.userId !== userId) return null;
  return domain;
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const domain = await loadOwned(user.id, id);
  if (!domain) return NextResponse.json({ error: "Domain not found." }, { status: 404 });

  const plan = planFor(user.subscription);
  const cutoff = Date.now() - plan.historyDays * 24 * 3600 * 1000;

  // Aggregate in the same shape the analyzer produces, so the UI components are shared.
  const byKey = new Map<string, { sourceIp: string; count: number; spfPass: number; spfFail: number; dkimPass: number; dkimFail: number; headerFrom: string; orgs: Set<string>; last: number; dmarcPass: boolean }>();
  const orgVolume = new Map<string, number>();
  let volume = 0, passVolume = 0;

  for (const r of domain.reports) {
    const seen = r.seenAt.getTime();
    if (seen < cutoff) continue;
    volume += r.count;
    if (r.spf === "pass" || r.dkim === "pass") passVolume += r.count;
    orgVolume.set(r.orgName, (orgVolume.get(r.orgName) ?? 0) + r.count);
    const key = `${r.sourceIp}|${r.headerFrom}`;
    const agg = byKey.get(key) ?? {
      sourceIp: r.sourceIp, count: 0, spfPass: 0, spfFail: 0, dkimPass: 0, dkimFail: 0,
      headerFrom: r.headerFrom, orgs: new Set<string>(), last: 0, dmarcPass: false,
    };
    agg.count += r.count;
    if (r.spf === "pass") agg.spfPass += r.count; else agg.spfFail += r.count;
    if (r.dkim === "pass") agg.dkimPass += r.count; else agg.dkimFail += r.count;
    agg.orgs.add(r.orgName);
    agg.last = Math.max(agg.last, seen);
    if (r.spf === "pass" || r.dkim === "pass") agg.dmarcPass = true;
    byKey.set(key, agg);
  }

  const sources = Array.from(byKey.values())
    .map((s) => ({
      ip: s.sourceIp,
      volume: s.count,
      dmarc: s.dmarcPass ? "pass" : "fail",
      spf: s.spfPass > 0 && s.spfFail > 0 ? "mixed" : s.spfPass > 0 ? "pass" : "fail",
      dkim: s.dkimPass > 0 && s.dkimFail > 0 ? "mixed" : s.dkimPass > 0 ? "pass" : "fail",
      headerFrom: s.headerFrom,
      orgs: Array.from(s.orgs),
      lastSeen: new Date(s.last).toISOString(),
    }))
    .sort((a, b) => b.volume - a.volume);

  return NextResponse.json({
    domain: { id: domain.id, name: domain.name, policy: domain.policy, mailboxToken: domain.mailboxToken },
    plan: { historyDays: plan.historyDays, csvExport: plan.csvExport },
    summary: {
      volume,
      dmarcPassVolume: passVolume,
      dmarcFailVolume: volume - passVolume,
      passRate: volume > 0 ? passVolume / volume : null,
      windowDays: plan.historyDays > 60 ? 30 : 30,
    },
    sources,
    providers: Array.from(orgVolume.entries())
      .map(([org, v]) => ({ org, volume: v }))
      .sort((a, b) => b.volume - a.volume),
    // Ingestion ledger — the last 10 delivery attempts, so the user always
    // knows whether their reports arrived and what happened to them.
    ingestion: domain.ingestions.map((ev) => ({
      id: ev.id,
      status: ev.status,
      filesReceived: ev.filesReceived,
      reportsParsed: ev.reportsParsed,
      recordsStored: ev.recordsStored,
      duplicatesSkipped: ev.duplicatesSkipped,
      mismatchSkipped: ev.mismatchSkipped,
      rejects: JSON.parse(ev.rejects || "[]"),
      createdAt: ev.createdAt,
    })),
  });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const domain = await loadOwned(user.id, id);
  if (!domain) return NextResponse.json({ error: "Domain not found." }, { status: 404 });
  await db.domain.delete({ where: { id } });
  log.info("domain.deleted", { userId: user.id, domainId: id });
  return NextResponse.json({ ok: true });
}
