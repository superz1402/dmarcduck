# Security

## What we store

- Email + bcrypt password hash (11 rounds).
- Parsed DMARC metadata: counts, IPs, verdicts, From domains, provider names.
- Nothing else. No message content (aggregate reports don't contain any),
  no third-party trackers, no ad networks.

## Threat model (practical)

| Threat | Mitigation |
|---|---|
| Password stuffing / enumeration | bcrypt; uniform login errors; login+signup rate limits |
| Session theft | httpOnly + SameSite=Lax + Secure cookies; 30d expiry; revocable rows |
| Token enumeration (ingestion) | cuid tokens; uniform 404; 120/hr rate limit per token |
| Forged billing events | HMAC-SHA256 signature check (constant compare); 503 when unconfigured |
| Cron abuse | Bearer secret required; 401 otherwise |
| Malicious uploads | 20MB/file, 25 files, parse-only (no eval), junk → 422; XML parsing via fast-xml-parser (no external entities) |
| XML entity bombs ("billion laughs") | parseUpload refuses any document declaring `<!ENTITY`/internal-subset DOCTYPE before parsing |
| Decompression bombs | expandUpload caps expanded content: 20 MB per file, 50 MB per upload; beyond-cap content is never materialized |
| Timing attacks on signature/secret compare | webhook + cron secrets compared via `crypto.timingSafeEqual` |
| Spam ingestion cost | per-token rate limit + per-plan domain caps |
| Clickjacking / sniffing | X-Frame-Options: DENY, nosniff, referrer policy, permissions-policy (next.config.mjs) |

## Honest review notes (2026-10-07 security pass — findings & fixes)

Reviewed: auth (bcrypt, sessions, cookies), all API routes, upload/parse path,
webhook, cron, share links, headers, secrets handling. Fixed in the same pass:
timing-unsafe signature comparisons (webhook + cron), unhandled webhook JSON
(now 400), missing HSTS, missing decompression-bomb cap, missing entity-
declaration guard, expired share records never deleted (cron now culls them).

Remaining risks we accept **and document**:
- `x-forwarded-for` is trusted for rate limiting. Correct on Vercel (platform-
  set); if self-hosting without a trusted proxy, clients can spoof their IP
  past IP-keyed limits. Mitigation: front with a proxy that overwrites the
  header, or move to platform identity (Vercel `x-real-ip`).
- Ingestion capability URLs appear in server/proxy logs by design. Rotation
  (remove + re-add a domain) is the documented revocation path.
- No CSP yet (Next.js inline runtime makes strict CSP non-trivial). Roadmap
  with nonce-based middleware before charging money.
- The digest cron loads all users with up to 2000 reports each into memory.
  Fine for hundreds of domains; must become per-domain streaming before
  thousands. Logged as a scale tripwire.
- In-memory rate limiter resets per instance/deploy. Acceptable single-
  instance; multi-instance needs the edge limiter (noted above).

## Notable non-goals (documented, revisited at scale)

- Per-user rate limiting beyond IP/token (edge limiter when multi-instance).
- 2FA (roadmap after first paying users).
- Full audit log (structured logs cover the stage we're at).

## Incident stance

If ingestion is abused: rotate the domain token (remove/re-add domain) —
the endpoint is capability-scoped, blast radius is one domain.
