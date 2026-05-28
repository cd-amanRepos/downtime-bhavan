import { describe, it, expect } from 'vitest';
import { normalizeEmail, hashEmail, maskEmail, looksLikeEmail } from './email.js';

describe('normalizeEmail', () => {
  it.each([
    ['Foo@Bar.com', 'foo@bar.com'],
    ['  hi@gmail.com  ', 'hi@gmail.com'],
    ['user+tag@gmail.com', 'user+tag@gmail.com'],
  ])('lowercases + trims: %s → %s', (input, expected) => {
    expect(normalizeEmail(input)).toBe(expected);
  });

  it('rejects empty, missing @, or whitespace-only', () => {
    expect(normalizeEmail('')).toBeNull();
    expect(normalizeEmail('   ')).toBeNull();
    expect(normalizeEmail('notanemail')).toBeNull();
    expect(normalizeEmail('two@@signs.com')).toBeNull();
  });

  it('rejects clearly disposable domains', () => {
    expect(normalizeEmail('x@mailinator.com')).toBeNull();
    expect(normalizeEmail('x@10minutemail.com')).toBeNull();
  });
});

describe('hashEmail', () => {
  it('returns deterministic 64-char hex', () => {
    const a = hashEmail('foo@bar.com');
    const b = hashEmail('foo@bar.com');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
  it('case insensitive', () => {
    expect(hashEmail('FOO@bar.com')).toBe(hashEmail('foo@bar.com'));
  });
});

describe('maskEmail', () => {
  it('keeps first 2 + first letter of domain', () => {
    expect(maskEmail('amanthapliyal@gmail.com')).toBe('am***@g***.com');
    expect(maskEmail('hi@downtimebhavan.in')).toBe('hi@d***.in');
  });
});

describe('looksLikeEmail', () => {
  it('quick predicate without throwing', () => {
    expect(looksLikeEmail('foo@bar.com')).toBe(true);
    expect(looksLikeEmail('not-email')).toBe(false);
  });
});
