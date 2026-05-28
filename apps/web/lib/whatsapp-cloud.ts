import type { WhatsAppAdapter, SendOtpParams, SendRecoveryParams } from './whatsapp-adapter.js';

const API = 'https://graph.facebook.com/v20.0';

export class CloudApiAdapter implements WhatsAppAdapter {
  constructor(private phoneNumberId: string, private token: string) {}

  private async send(body: object): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(`${API}/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const txt = await res.text();
        return { ok: false, error: `HTTP ${res.status}: ${txt.slice(0, 200)}` };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  async sendOtp({ toE164, otp }: SendOtpParams) {
    const template = process.env.DTB_WA_TEMPLATE_OTP ?? 'otp_verify';
    return this.send({
      messaging_product: 'whatsapp',
      to: toE164.replace(/^\+/, ''),
      type: 'template',
      template: {
        name: template,
        language: { code: 'en' },
        components: [{
          type: 'body',
          parameters: [{ type: 'text', text: otp }],
        }, {
          type: 'button',
          sub_type: 'url',
          index: '0',
          parameters: [{ type: 'text', text: otp }], // URL button parameter
        }],
      },
    });
  }

  async sendRecovery({ toE164, siteName, siteUrl }: SendRecoveryParams) {
    const template = process.env.DTB_WA_TEMPLATE_RECOVERY ?? 'site_back_up';
    return this.send({
      messaging_product: 'whatsapp',
      to: toE164.replace(/^\+/, ''),
      type: 'template',
      template: {
        name: template,
        language: { code: 'en' },
        components: [{
          type: 'body',
          parameters: [
            { type: 'text', text: siteName },
            { type: 'text', text: siteUrl },
          ],
        }],
      },
    });
  }
}
