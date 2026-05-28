export interface SendOtpParams {
  toE164: string;
  otp: string;
}
export interface SendRecoveryParams {
  toE164: string;
  siteName: string;
  siteUrl: string;
}

export interface WhatsAppAdapter {
  sendOtp(params: SendOtpParams): Promise<{ ok: boolean; error?: string }>;
  sendRecovery(params: SendRecoveryParams): Promise<{ ok: boolean; error?: string }>;
}

/** Pick adapter at runtime: DryRun by default, Cloud API when both env vars set. */
export async function getAdapter(): Promise<WhatsAppAdapter> {
  const phoneId = process.env.DTB_WA_PHONE_NUMBER_ID;
  const token = process.env.DTB_WA_TOKEN;
  if (phoneId && token) {
    const { CloudApiAdapter } = await import('./whatsapp-cloud.js');
    return new CloudApiAdapter(phoneId, token);
  }
  const { DryRunAdapter } = await import('./whatsapp-dryrun.js');
  return new DryRunAdapter();
}
