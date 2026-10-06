import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/lemonsqueezy — Lemon Squeezy subscription lifecycle.
 * Signature verification uses LS_SIGNATURE_SECRET (HMAC-SHA256 of the raw body).
 * Events handled: order_created, subscription_created, subscription_updated,
 * subscription_cancelled, subscription_expired, subscription_resumed.
 */
async function verifySignature(raw: string, signature: string, secret: string): Promise<boolean> {
  const { createHmac, timingSafeEqual } = await import("node:crypto");
  const mac = createHmac("sha256", secret).update(raw).digest("hex");
  // Constant-time comparison: signature comparison must not leak timing.
  const a = Buffer.from(mac, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const secret = process.env.LS_SIGNATURE_SECRET;
  if (!secret) {
    // Not configured: accept nothing rather than everything. Honest failure.
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }
  const raw = await req.text();
  const sig = req.headers.get("x-signature") ?? "";
  if (!(await verifySignature(raw, sig, secret))) {
    log.warn("ls.webhook_bad_signature", {});
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let event: {
    meta?: { event_name?: string; custom_data?: { email?: string } };
    data?: { attributes?: Record<string, unknown> };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Body is not valid JSON." }, { status: 400 });
  }
  const email = event.meta?.custom_data?.email?.toLowerCase();
  const attrs = event.data?.attributes ?? {};
  const status = String(attrs.status ?? "active");
  const plan = String((attrs as { product_name?: string }).product_name ?? "").toLowerCase().includes("studio") ? "studio" : "starter";

  if (!email) return NextResponse.json({ error: "Missing custom_data.email." }, { status: 400 });

  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    log.warn("ls.webhook_unknown_email", { email });
    return NextResponse.json({ ok: true, note: "unknown user — ignored" });
  }

  const active = ["active", "on_trial"].includes(status);
  const cancelled = ["cancelled", "expired", "unpaid"].includes(status);

  await db.subscription.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      status: active ? "active" : cancelled ? "expired" : status,
      plan: active ? plan : "free",
      externalId: event.data && "id" in event.data ? String((event.data as { id: unknown }).id) : null,
    },
    update: {
      status: active ? "active" : cancelled ? "expired" : status,
      plan: active ? plan : "free",
    },
  });

  log.info("ls.webhook_processed", { email, event: event.meta?.event_name, status });
  return NextResponse.json({ ok: true });
}
