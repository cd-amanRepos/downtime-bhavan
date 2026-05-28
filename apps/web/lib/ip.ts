import { createHash } from 'node:crypto';

const PEPPER = process.env.DTB_IP_PEPPER ?? 'dev-only-pepper-replace-in-prod';

/**
 * Read the client IP from upstream headers, in priority order:
 *   1. cf-connecting-ip (Cloudflare)
 *   2. fly-client-ip (Fly.io)
 *   3. x-forwarded-for (first hop)
 *   4. x-real-ip
 *
 * Hash with a server-side pepper before returning so the raw IP never
 * touches our DB or logs.
 */
export function getClientIpHash(headers: Headers): string {
  const raw =
    headers.get('cf-connecting-ip') ??
    headers.get('fly-client-ip') ??
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headers.get('x-real-ip') ??
    'unknown';
  return createHash('sha256').update(raw + ':' + PEPPER).digest('hex').slice(0, 32);
}
