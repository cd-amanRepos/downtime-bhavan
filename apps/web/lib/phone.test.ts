import { describe, it, expect } from 'vitest';
import { normalizeIndianPhone, hashPhone, maskPhone } from './phone.js';

describe('normalizeIndianPhone', () => {
  it.each([
    ['9876543210',        '+919876543210'],
    ['9876 543210',       '+919876543210'],
    ['+91 98765 43210',   '+919876543210'],
    ['91 9876543210',     '+919876543210'],
    ['09876543210',       '+919876543210'],
  ])('normalizes %s → %s', (input, expected) => {
    expect(normalizeIndianPhone(input)).toBe(expected);
  });

  it('rejects non-Indian or malformed numbers', () => {
    expect(normalizeIndianPhone('+15555551234')).toBeNull();   // US
    expect(normalizeIndianPhone('123')).toBeNull();             // too short
    expect(normalizeIndianPhone('98765')).toBeNull();           // too short
    expect(normalizeIndianPhone('98765432101')).toBeNull();     // too long
  });

  it('rejects mobile numbers not starting with 6-9 (Indian mobile prefix)', () => {
    expect(normalizeIndianPhone('5876543210')).toBeNull();
  });
});

describe('maskPhone', () => {
  it('masks middle digits', () => {
    expect(maskPhone('+919876543210')).toBe('+91 98••• ••210');
  });
});
