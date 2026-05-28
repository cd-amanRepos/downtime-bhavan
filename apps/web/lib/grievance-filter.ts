import bannedWordsJson from '../../../config/banned-words.json' with { type: 'json' };

const ALL_BANNED: string[] = [
  ...bannedWordsJson.english,
  ...bannedWordsJson.hinglish,
  ...bannedWordsJson.communal,
];
const SPAM_PHRASES: string[] = bannedWordsJson.spam;

const REPEATED_CHARS = /(.)\1{6,}/i; // 7+ of the same char in a row

export type FilterReason =
  | 'empty'
  | 'too_long'
  | 'banned_word'
  | 'spam';

export interface FilterResult {
  ok: boolean;
  reason?: FilterReason;
}

/**
 * Pure function: classify whether a grievance body is acceptable.
 * No I/O, no async, no DB. Caller persists if `ok === true`.
 */
export function filterGrievance(rawBody: string): FilterResult {
  const body = rawBody.trim();
  if (body.length === 0) return { ok: false, reason: 'empty' };
  if (body.length > 140) return { ok: false, reason: 'too_long' };

  const lower = body.toLowerCase();
  for (const phrase of SPAM_PHRASES) {
    if (lower.includes(phrase)) return { ok: false, reason: 'spam' };
  }
  if (REPEATED_CHARS.test(body)) return { ok: false, reason: 'spam' };

  // Whole-word ban check: split on non-word characters
  const tokens = lower.split(/[^a-z0-9]+/).filter(Boolean);
  const banned = new Set(ALL_BANNED.map((w) => w.toLowerCase()));
  for (const t of tokens) {
    if (banned.has(t)) return { ok: false, reason: 'banned_word' };
  }
  return { ok: true };
}
