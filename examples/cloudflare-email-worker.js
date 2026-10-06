/**
 * Cloudflare Email Routing worker — free DMARC report delivery.
 * Receives the provider's report email, POSTs the raw message to your
 * DmarcDuck ingestion URL. One worker can serve multiple domains: map
 * local-parts to tokens via env vars, e.g. TOKEN_EXAMPLECOM=<token>.
 * (Cloudflare uppercases local-parts in env var names and strips dashes.)
 */
export default {
  async email(message, env) {
    const local = message.to.split("@")[0].toUpperCase().replace(/-/g, "");
    const token = env[`TOKEN_${local}`];
    if (!token) {
      message.setRejectReason("No ingestion token configured for this address");
      message.setRejectStatus(false);
      return;
    }
    const res = await fetch(`${env.DMARCduck_URL}/api/ingest/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/xml" },
      body: message.raw,
    });
    if (!res.ok) {
      // Ask the sender to retry later (provider will resend the report).
      message.setRejectReason("Upstream ingestion temporarily unavailable");
      message.setRejectStatus(false);
    }
  },
};
