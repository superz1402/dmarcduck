import { NextRequest, NextResponse } from "next/server";
import { currentUser, validateDomain } from "@/lib/auth";
import { planFor } from "@/lib/plan";
import { db } from "@/lib/db";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const domains = await db.domain.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { reports: true } } },
  });
  return NextResponse.json({
    domains: domains.map((d) => ({
      id: d.id,
      name: d.name,
      policy: d.policy,
      mailboxToken: d.mailboxToken,
      reportCount: d._count.reports,
    })),
  });
}

export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").toLowerCase().trim();
  const problem = validateDomain(name);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const plan = planFor(user.subscription);
  const count = await db.domain.count({ where: { userId: user.id } });
  if (count >= plan.maxDomains) {
    return NextResponse.json(
      {
        error: `The ${plan.name} plan covers ${plan.maxDomains} domain${plan.maxDomains === 1 ? "" : "s"}. Upgrade to add more.`,
        code: "PLAN_LIMIT",
      },
      { status: 402 }
    );
  }

  try {
    const domain = await db.domain.create({ data: { userId: user.id, name } });
    return NextResponse.json({
      domain: { id: domain.id, name: domain.name, policy: domain.policy, mailboxToken: domain.mailboxToken },
    });
  } catch {
    return NextResponse.json({ error: `You already monitor ${name}.` }, { status: 409 });
  }
}
