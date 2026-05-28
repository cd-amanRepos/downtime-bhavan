export interface SendOtpParams {
  to: string;          // E.164 phone OR email — adapter knows which
  otp: string;
  kind: 'email' | 'whatsapp';
}
export interface SendRecoveryParams {
  to: string;
  kind: 'email' | 'whatsapp';
  siteName: string;
  siteUrl: string;
}
export interface NotifyAdapter {
  sendOtp(p: SendOtpParams): Promise<{ ok: boolean; error?: string }>;
  sendRecovery(p: SendRecoveryParams): Promise<{ ok: boolean; error?: string }>;
}

/** Pick the right adapter based on env presence.
 *  Email is primary; WhatsApp comes back once Meta approves. */
export async function getNotifyAdapter(kind: 'email' | 'whatsapp'): Promise<NotifyAdapter> {
  if (kind === 'whatsapp') {
    const haveWa = !!process.env.DTB_WA_PHONE_NUMBER_ID && !!process.env.DTB_WA_TOKEN;
    if (haveWa) {
      const { CloudApiAdapter } = await import('./whatsapp-cloud.js');
      const inner = new CloudApiAdapter(process.env.DTB_WA_PHONE_NUMBER_ID!, process.env.DTB_WA_TOKEN!);
      return {
        sendOtp: ({ to, otp }) => inner.sendOtp({ toE164: to, otp }),
        sendRecovery: ({ to, siteName, siteUrl }) => inner.sendRecovery({ toE164: to, siteName, siteUrl }),
      };
    }
    // Fall through to DryRun for WhatsApp too
    const { DryRunAdapter } = await import('./whatsapp-dryrun.js');
    const inner = new DryRunAdapter();
    return {
      sendOtp: ({ to, otp }) => inner.sendOtp({ toE164: to, otp }),
      sendRecovery: ({ to, siteName, siteUrl }) => inner.sendRecovery({ toE164: to, siteName, siteUrl }),
    };
  }
  // kind === 'email'
  const haveEmail = !!process.env.DTB_EMAIL_API_KEY;
  if (haveEmail) {
    const { ResendEmailAdapter } = await import('./email-adapter.js');
    return new ResendEmailAdapter(process.env.DTB_EMAIL_API_KEY!);
  }
  const { DryRunEmailAdapter } = await import('./email-adapter.js');
  return new DryRunEmailAdapter();
}
