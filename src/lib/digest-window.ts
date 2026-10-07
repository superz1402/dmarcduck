/**
 * Digest window math — pure, no I/O, unit-tested in tests/digest-window.test.ts.
 *
 * The weekly digest endpoint (/api/cron/digest) only emails a domain when the
 * window computed here contains report volume. The window is:
 *
 *   [ max(lastDigestSentAt, now - 7 days), now ]
 *
 * Why this shape:
 *  - "since the last digest we actually sent" is what makes repeated cron
 *    runs idempotent: a retry or an accidental second trigger finds no NEW
 *    reports after the marker, computes volume 0, and sends nothing.
 *  - the 7-day floor keeps the promise of the subject line ("Weekly digest")
 *    even if the scheduler was down: a domain never receives one giant
 *    backlog digest, it just resumes from the trailing week.
 *  - a future-dated marker (clock skew) is clamped to `now`, which yields an
 *    empty window rather than a duplicate send.
 */
const DIGEST_MAX_WINDOW_MS = 7 * 24 * 3600 * 1000;

export function digestWindowStart(lastDigestSentAt: Date | null, now: Date): Date {
  const floor = now.getTime() - DIGEST_MAX_WINDOW_MS;
  if (!lastDigestSentAt) return new Date(floor);
  return new Date(Math.max(Math.min(lastDigestSentAt.getTime(), now.getTime()), floor));
}
