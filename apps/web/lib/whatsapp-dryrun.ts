import { appendFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { WhatsAppAdapter, SendOtpParams, SendRecoveryParams } from './whatsapp-adapter.js';

const LOG = join(tmpdir(), 'dtb-whatsapp.log');

export class DryRunAdapter implements WhatsAppAdapter {
  private async log(line: string) {
    console.log('[whatsapp-dryrun]', line);
    try { await appendFile(LOG, line + '\n'); } catch { /* tmp full or permission */ }
  }
  async sendOtp({ toE164, otp }: SendOtpParams) {
    await this.log(`OTP → ${toE164} :: ${otp}`);
    return { ok: true };
  }
  async sendRecovery({ toE164, siteName, siteUrl }: SendRecoveryParams) {
    await this.log(`RECOVERY → ${toE164} :: ${siteName} (${siteUrl}) is back up`);
    return { ok: true };
  }
}
