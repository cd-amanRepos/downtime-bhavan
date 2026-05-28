import type { NotifyAdapter, SendOtpParams, SendRecoveryParams } from './notify-adapter.js';
import { appendFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const FROM = process.env.DTB_EMAIL_FROM ?? 'Downtime Bhavan <onboarding@resend.dev>';
const LOG = join(tmpdir(), 'dtb-emails.log');

function otpBody(otp: string): { subject: string; text: string; html: string } {
  const subject = `${otp} is your Downtime Bhavan code`;
  const text =
    `Your one-time code: ${otp}\n\n` +
    `Use this on downtimebhavan.in to activate your alert.\n` +
    `The code expires in 10 minutes.\n\n` +
    `Didn't request this? Ignore this email.\n\n` +
    `— Downtime Bhavan (unofficial observatory)`;
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0E1B2D">
      <p style="font-size:11px;letter-spacing:.18em;color:#9BA5B6;text-transform:uppercase;margin:0 0 12px">सूचना सेवा · Citizen Alert Service</p>
      <h1 style="font-size:32px;font-weight:700;letter-spacing:-.02em;margin:0 0 24px">${otp}</h1>
      <p>Your one-time code for <a href="https://downtimebhavan.in" style="color:#1E3A8A">downtimebhavan.in</a>. Expires in 10 minutes.</p>
      <p style="color:#6A7589;font-size:13px;margin-top:24px">Didn't request this? Ignore this email — nothing happens.</p>
      <p style="color:#9BA5B6;font-size:11px;margin-top:24px">— Downtime Bhavan · An unofficial observatory · Not affiliated with any government body.</p>
    </div>`;
  return { subject, text, html };
}

function recoveryBody(siteName: string, siteUrl: string): { subject: string; text: string; html: string } {
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

export class ResendEmailAdapter implements NotifyAdapter {
  constructor(private apiKey: string) {}
  private async send(to: string, subject: string, text: string, html: string) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: FROM, to, subject, text, html }),
      });
      if (!res.ok) {
        const t = await res.text();
        return { ok: false, error: `HTTP ${res.status}: ${t.slice(0, 200)}` };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
  async sendOtp({ to, otp }: SendOtpParams) {
    const { subject, text, html } = otpBody(otp);
    return this.send(to, subject, text, html);
  }
  async sendRecovery({ to, siteName, siteUrl }: SendRecoveryParams) {
    const { subject, text, html } = recoveryBody(siteName, siteUrl);
    return this.send(to, subject, text, html);
  }
}

export class DryRunEmailAdapter implements NotifyAdapter {
  private async log(line: string) {
    console.log('[email-dryrun]', line);
    try { await appendFile(LOG, line + '\n'); } catch { /* tmpfs full */ }
  }
  async sendOtp({ to, otp }: SendOtpParams) {
    await this.log(`OTP → ${to} :: ${otp}`);
    return { ok: true };
  }
  async sendRecovery({ to, siteName, siteUrl }: SendRecoveryParams) {
    await this.log(`RECOVERY → ${to} :: ${siteName} (${siteUrl}) is back up`);
    return { ok: true };
  }
}
