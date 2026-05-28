import { createHash } from 'node:crypto';

const PEPPER = process.env.DTB_PHONE_PEPPER ?? 'dev-only-phone-pepper-replace-in-prod';

/** Indian mobile: 10 digits starting with 6/7/8/9, optionally prefixed with +91, 91, or 0.
 *  Returns the E.164 form ("+91XXXXXXXXXX") or null. */
export function normalizeIndianPhone(input: string): string | null {
  if (!input) return null;
  const digits = input.replace(/[^\d]/g, '');
  let ten: string | null = null;
  if (digits.length === 10 && /^[6-9]/.test(digits)) ten = digits;
  else if (digits.length === 11 && digits.startsWith('0') && /^0[6-9]/.test(digits)) ten = digits.slice(1);
  else if (digits.length === 12 && digits.startsWith('91') && /^91[6-9]/.test(digits)) ten = digits.slice(2);
  if (!ten) return null;
  return '+91' + ten;
}

export function hashPhone(e164: string): string {
  return createHash('sha256').update(e164 + ':' + PEPPER).digest('hex');
}

export function maskPhone(e164: string): string {
  // +919876543210 → +91 98••• ••210
  const m = e164.match(/^\+91(\d{2})\d{5}(\d{3})$/);
  if (!m) return e164;
  return `+91 ${m[1]}••• ••${m[2]}`;
}
