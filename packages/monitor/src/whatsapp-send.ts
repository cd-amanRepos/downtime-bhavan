import { appendFileSync } from 'node:fs';

const LOG_PATH = '/tmp/dtb-whatsapp.log';

export interface SendResult {
  ok: boolean;
  error?: string;
}

/**
 * Send a "site_back_up" WhatsApp template message to the given E.164 phone.
 *
 * DryRun mode (no Meta creds): appends a JSON line to /tmp/dtb-whatsapp.log
 * and returns { ok: true }.
 *
 * Production mode: hits Meta Graph API v20 with the site_back_up template,
 * using two body parameters: siteName and siteUrl.
 */
export async function sendRecoveryMessage(
  toE164: string,
  siteName: string,
  siteUrl: string,
): Promise<SendResult> {
  const phoneNumberId = process.env.DTB_WA_PHONE_NUMBER_ID;
  const token = process.env.DTB_WA_TOKEN;

  if (!phoneNumberId || !token) {
    // DryRun mode: log to file and return success
    const entry = JSON.stringify({
      ts: new Date().toISOString(),
      mode: 'dryrun',
      to: toE164,
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

  // Production mode: hit Meta Graph API v20
  const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
  const body = {
    messaging_product: 'whatsapp',
    to: toE164,
    type: 'template',
    template: {
      name: 'site_back_up',
      language: { code: 'en' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: siteName },
            { type: 'text', text: siteUrl },
          ],
        },
      ],
    },
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { ok: false, error: `HTTP ${res.status}: ${text}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
