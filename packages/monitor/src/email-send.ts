import { appendFileSync } from 'node:fs';

const LOG_PATH = '/tmp/dtb-emails.log';

export interface SendResult {
  ok: boolean;
  error?: string;
}

function recoveryBody(
  siteName: string,
  siteUrl: string,
): { subject: string; text: string; html: string } {
  const subject = `✓ ${siteName} is working again`;
  const text =
    `${siteName} is back up.\n\n` +
    `You set an alert for this. Here it is.\n` +
    `Visit ${siteUrl}\n\n` +
    `Don't want more alerts? Visit downtimebhavan.in/delete-my-data\n\n` +
    `— Downtime Bhavan`;
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0E1B2D">
      <p style="font-size:11px;letter-spacing:.18em;color:#138808;text-transform:uppercase;margin:0 0 12px;font-weight:600">● Site is back</p>
      <h1 style="font-size:24px;font-weight:700;letter-spacing:-.02em;margin:0 0 8px">${siteName}</h1>
      <p style="font-size:15px;color:#3C4A5E">is working again.</p>
      <p style="margin-top:24px"><a href="${siteUrl}" style="display:inline-block;background:#1E3A8A;color:white;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Visit ${siteUrl} →</a></p>
      <p style="color:#9BA5B6;font-size:12px;margin-top:32px">Don't want more alerts? <a href="https://downtimebhavan.in/delete-my-data" style="color:#9BA5B6">Delete my data</a></p>
    </div>`;
  return { subject, text, html };
}

/**
 * Send a recovery notification email via Resend.
 *
 * DryRun mode (no Resend creds): appends a JSON line to /tmp/dtb-emails.log
 * and returns { ok: true }.
 *
 * Production mode: hits the Resend API with the recovery email body.
 */
export async function sendRecoveryEmail(
  to: string,
  siteName: string,
  siteUrl: string,
): Promise<SendResult> {
  const apiKey = process.env.DTB_EMAIL_API_KEY;
  const from = process.env.DTB_EMAIL_FROM ?? 'Downtime Bhavan <onboarding@resend.dev>';

  if (!apiKey) {
    // DryRun mode: log to file and return success
    const entry = JSON.stringify({
      ts: new Date().toISOString(),
      mode: 'dryrun',
      to,
      siteName,
      siteUrl,
    });
    try {
      appendFileSync(LOG_PATH, entry + '\n', 'utf8');
    } catch {
      // If we can't write the log, still succeed — don't block the caller
    }
    return { ok: true };
  }

  // Production mode: hit Resend API
  const { subject, text, html } = recoveryBody(siteName, siteUrl);
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, text, html }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      return { ok: false, error: `HTTP ${res.status}: ${t.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
