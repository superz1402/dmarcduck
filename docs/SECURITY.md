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
| Spam ingestion cost | per-token rate limit + per-plan domain caps |
| Clickjacking / sniffing | X-Frame-Options: DENY, nosniff, referrer policy, permissions-policy (next.config.mjs) |

## Notable non-goals (documented, revisited at scale)

- Per-user rate limiting beyond IP/token (edge limiter when multi-instance).
- 2FA (roadmap after first paying users).
- Full audit log (structured logs cover the stage we're at).

## Incident stance

If ingestion is abused: rotate the domain token (remove/re-add domain) —
the endpoint is capability-scoped, blast radius is one domain.
