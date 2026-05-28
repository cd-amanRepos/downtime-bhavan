// Uses Web Crypto API (crypto.subtle) so this module works in both
// the Node.js runtime (server components, API routes) and the Next.js
// Edge Runtime (middleware). Node 19+ exposes globalThis.crypto.subtle.

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

async function hmacHex(secret: string, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Returns a cookie value: `<issuedAtMs>.<hmac>` */
export async function signAdminCookie(secret: string, issuedAt: number = Date.now()): Promise<string> {
  const payload = String(issuedAt);
  const hmac = await hmacHex(secret, payload);
  return `${payload}.${hmac}`;
}

/** Returns true iff cookie was signed with this secret and is within MAX_AGE. */
export async function verifyAdminCookie(cookie: string, secret: string): Promise<boolean> {
  if (!cookie || !cookie.includes('.')) return false;
  const dotIdx = cookie.indexOf('.');
  const payload = cookie.slice(0, dotIdx);
  const sig = cookie.slice(dotIdx + 1);
  if (!payload || !sig) return false;
  const issuedAt = Number(payload);
  if (Number.isNaN(issuedAt)) return false;
  if (Date.now() - issuedAt > MAX_AGE_MS) return false;
  // Constant-time comparison via crypto.subtle.verify
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  const sigBytes = Uint8Array.from(
    sig.match(/.{1,2}/g)?.map((b) => parseInt(b, 16)) ?? [],
  );
  try {
    return await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(payload));
  } catch {
    return false;
  }
}

export const ADMIN_TOKEN = () => process.env.DTB_ADMIN_TOKEN ?? 'dev-admin';
export const COOKIE_NAME = 'dtb_admin';
