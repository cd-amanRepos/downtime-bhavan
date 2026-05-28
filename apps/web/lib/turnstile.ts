const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Server-side verify a Turnstile token from the client.
 * In dev with the always-pass test secret, this always returns true
 * for any non-empty token. In production with a real secret, Cloudflare
 * validates the token and returns success/failure.
 */
export async function verifyTurnstile(token: string, ip?: string): Promise<boolean> {
  if (!token) return false;

  const secret = process.env.DTB_TURNSTILE_SECRET;
  if (!secret) {
    console.warn('[turnstile] DTB_TURNSTILE_SECRET not set — allowing in dev. SET BEFORE PRODUCTION.');
    return true;
  }

  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set('remoteip', ip);

  try {
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    if (!res.ok) return false;
    const data = await res.json() as { success: boolean };
    return data.success === true;
  } catch (err) {
    console.error('[turnstile] verify error', err);
    return false;
  }
}
