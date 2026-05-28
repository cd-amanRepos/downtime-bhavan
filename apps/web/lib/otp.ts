import { createHash, randomInt } from 'node:crypto';

const PEPPER = process.env.DTB_OTP_PEPPER ?? 'dev-only-otp-pepper-replace-in-prod';

/** 6-digit OTP. Avoids leading zero so the SMS/WA digit count stays 6. */
export function generateOtp(): string {
  return String(randomInt(100_000, 1_000_000));
}

export function hashOtp(otp: string, pepper: string = PEPPER): string {
  return createHash('sha256').update(otp + ':' + pepper).digest('hex');
}
