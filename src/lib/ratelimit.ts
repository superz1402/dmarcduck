/**
 * Minimal fixed-window rate limiter (in-memory, per-instance).
 * Good enough for free-tier single-instance deployment; document the limit.
 * For multi-instance production, front with the platform's edge limiter.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

// Opportunistic cleanup so the map cannot grow unbounded.
// NOTE: must NOT run at module scope — workerd forbids timers (and any
// async I/O) in the global scope, and the isolate that evaluates the module
// is not a request context. Start it lazily on the first rate-limit check,
// which always happens inside a request handler.
let cleanupTimer: ReturnType<typeof setInterval> | undefined;

function ensureCleanup(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
  }, 60_000);
  cleanupTimer.unref?.();
}

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterSec: number } {
  ensureCleanup();
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }
  b.count += 1;
  if (b.count > limit) {
    return { ok: false, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfterSec: 0 };
}
