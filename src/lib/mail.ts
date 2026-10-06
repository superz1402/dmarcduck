/**
 * Email transport with graceful degradation:
 *  - RESEND_API_KEY set  -> sends via Resend HTTP API (free tier friendly)
 *  - not set             -> logs the email to stdout (so local/dev works offline)
 * Never throws into product logic; delivery problems are logged, not fatal.
 */
import { log } from "./log";

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

export async function sendMail(msg: MailMessage): Promise<{ sent: boolean }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM ?? "DmarcDuck <duck@dmarcduck.example>";
  if (!key) {
    log.info("mail.logged_not_sent", { to: msg.to, subject: msg.subject });
    return { sent: false };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [msg.to], subject: msg.subject, text: msg.text }),
    });
    if (!res.ok) {
      log.warn("mail.provider_error", { status: res.status, to: msg.to });
      return { sent: false };
    }
    return { sent: true };
  } catch (e) {
    log.warn("mail.network_error", { error: String(e) });
    return { sent: false };
  }
}
