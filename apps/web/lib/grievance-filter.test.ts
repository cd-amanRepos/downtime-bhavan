import { describe, it, expect } from 'vitest';
import { filterGrievance } from './grievance-filter.js';

describe('filterGrievance', () => {
  it('passes a clean grievance', () => {
    expect(filterGrievance('OTP not coming since morning')).toEqual({ ok: true });
  });

  it('rejects empty input', () => {
    expect(filterGrievance('')).toEqual({ ok: false, reason: 'empty' });
    expect(filterGrievance('   ')).toEqual({ ok: false, reason: 'empty' });
  });

  it('rejects text over 140 chars', () => {
    const long = 'a'.repeat(141);
    expect(filterGrievance(long)).toEqual({ ok: false, reason: 'too_long' });
  });

  it('rejects English profanity (case-insensitive, whole-word)', () => {
    expect(filterGrievance('this is shit')).toEqual({ ok: false, reason: 'banned_word' });
    expect(filterGrievance('SHIT')).toEqual({ ok: false, reason: 'banned_word' });
  });

  it('rejects Hinglish abuse', () => {
    expect(filterGrievance('mc kya kar raha hai')).toEqual({ ok: false, reason: 'banned_word' });
    expect(filterGrievance('bhenchod portal')).toEqual({ ok: false, reason: 'banned_word' });
  });

  it('does NOT trigger false positives on word fragments', () => {
    // "as" appears inside "case", not a whole word match
    expect(filterGrievance('class started late')).toEqual({ ok: true });
    expect(filterGrievance('bcoz of the deadline')).toEqual({ ok: true });
  });

  it('detects spam patterns like "click here"', () => {
    expect(filterGrievance('click here for free crypto')).toEqual({ ok: false, reason: 'spam' });
  });

  it('rejects repeated-character spam (aaaaaaa)', () => {
    expect(filterGrievance('aaaaaaaaaaaaaa')).toEqual({ ok: false, reason: 'spam' });
  });
});
