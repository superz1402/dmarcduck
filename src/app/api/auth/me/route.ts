import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { planFor } from "@/lib/plan";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ user: null }, { status: 200 });
  return NextResponse.json({
    user: {
      email: user.email,
      plan: planFor(user.subscription).id,
      domains: user.domains.map((d) => ({ id: d.id, name: d.name, policy: d.policy })),
    },
  });
}
