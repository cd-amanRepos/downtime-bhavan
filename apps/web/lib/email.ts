import { createHash } from 'node:crypto';

const PEPPER = process.env.DTB_EMAIL_PEPPER ?? 'dev-only-email-pepper-replace-in-prod';

const DISPOSABLE = new Set([
  'mailinator.com', '10minutemail.com', 'guerrillamail.com', 'temp-mail.org',
  'throwaway.email', 'yopmail.com', 'tempmail.com', 'fakeinbox.com',
]);

const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

export function normalizeEmail(input: string): string | null {
  if (!input) return null;
  const e = input.trim().toLowerCase();
  if (!EMAIL_RE.test(e)) return null;
  const domain = e.split('@')[1]!;
  if (DISPOSABLE.has(domain)) return null;
  return e;
}

export function hashEmail(email: string): string {
  return createHash('sha256').update(email.toLowerCase() + ':' + PEPPER).digest('hex');
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  const [host, tld] = domain.split(/\.(?=[^.]+$)/);
  const shownLocal = local.length <= 2 ? local : local.slice(0, 2) + '***';
  const shownHost = host ? host.charAt(0) + '***' : '?';
  return `${shownLocal}@${shownHost}.${tld ?? ''}`;
}

export function looksLikeEmail(s: string): boolean {
  return typeof s === 'string' && EMAIL_RE.test(s.trim().toLowerCase());
}
