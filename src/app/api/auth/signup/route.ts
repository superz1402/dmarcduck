import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  createSession,
  hashPassword,
  validateEmail,
  validatePassword,
} from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { log } from "@/lib/log";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(`signup:${ip}`, 5, 3600_000).ok) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").toLowerCase().trim();
  const password = String(body?.password ?? "");

  if (!validateEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  const pwProblem = validatePassword(password);
  if (pwProblem) return NextResponse.json({ error: pwProblem }, { status: 400 });

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    // Do not reveal account existence; instruct generically.
    return NextResponse.json(
      { error: "This email can't be used. Try signing in instead." },
      { status: 409 }
    );
  }

  const user = await db.user.create({
    data: { email, passwordHash: await hashPassword(password) },
  });
  await createSession(user.id);
  log.info("auth.signup", { userId: user.id });
  return NextResponse.json({ ok: true, email: user.email });
}
