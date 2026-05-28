import { describe, it, expect } from 'vitest';
import { generateOtp, hashOtp } from './otp.js';

describe('generateOtp', () => {
  it('returns a 6-digit string', () => {
    for (let i = 0; i < 10; i++) {
      const otp = generateOtp();
      expect(otp).toMatch(/^\d{6}$/);
    }
  });

  it('does not start with 0 (so SMS/WhatsApp keeps it 6 chars)', () => {
    for (let i = 0; i < 50; i++) {
      const otp = generateOtp();
      expect(otp[0]).not.toBe('0');
    }
  });
});

describe('hashOtp', () => {
  it('returns deterministic hash for same input', () => {
    expect(hashOtp('123456', 'pepper')).toBe(hashOtp('123456', 'pepper'));
  });
  it('differs when pepper or OTP changes', () => {
    expect(hashOtp('123456', 'A')).not.toBe(hashOtp('123456', 'B'));
    expect(hashOtp('123456', 'A')).not.toBe(hashOtp('123457', 'A'));
  });
  it('returns 64-char hex (SHA-256)', () => {
    expect(hashOtp('123456', 'p')).toMatch(/^[0-9a-f]{64}$/);
  });
});
