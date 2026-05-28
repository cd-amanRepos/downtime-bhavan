import { describe, it, expect } from 'vitest';
import { checkRateLimit, RATE_LIMITS } from './rate-limit.js';
import { createDb } from '@dtb/db';
import Database from 'better-sqlite3';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function freshDb() {
  const path = join(mkdtempSync(join(tmpdir(), 'dtb-rl-')), 'test.sqlite');
  const raw = new Database(path);
  raw.exec(`
    CREATE TABLE rate_limit_attempts (
      action TEXT, ip_hash TEXT, slot_minute INTEGER, count INTEGER,
      PRIMARY KEY (action, ip_hash, slot_minute)
    );
  `);
  raw.close();
  return createDb(path);
}

describe('checkRateLimit', () => {
  const ip = 'abc123';

  it('allows first request', () => {
    const db = freshDb();
    expect(checkRateLimit(db, ip, 'grievance:submit', Date.now())).toEqual({ allowed: true });
  });

  it('allows up to the per-minute limit', () => {
    const db = freshDb();
    const now = Date.now();
    const limit = RATE_LIMITS['grievance:submit']!.perMinute;
    for (let i = 0; i < limit; i++) {
      const r = checkRateLimit(db, ip, 'grievance:submit', now);
      expect(r.allowed).toBe(true);
    }
  });

  it('blocks when the per-minute limit is exceeded', () => {
    const db = freshDb();
    const now = Date.now();
    const limit = RATE_LIMITS['grievance:submit']!.perMinute;
    for (let i = 0; i < limit; i++) {
      checkRateLimit(db, ip, 'grievance:submit', now);
    }
    const blocked = checkRateLimit(db, ip, 'grievance:submit', now);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it('allows again after the minute slot rolls over', () => {
    const db = freshDb();
    const now = Date.now();
    const limit = RATE_LIMITS['grievance:submit']!.perMinute;
    for (let i = 0; i < limit; i++) {
      checkRateLimit(db, ip, 'grievance:submit', now);
    }
    expect(checkRateLimit(db, ip, 'grievance:submit', now + 61_000).allowed).toBe(true);
  });

  it('different actions have independent counters', () => {
    const db = freshDb();
    const now = Date.now();
    const limit = RATE_LIMITS['grievance:submit']!.perMinute;
    for (let i = 0; i < limit; i++) {
      checkRateLimit(db, ip, 'grievance:submit', now);
    }
    // submit is now blocked, but react should still work
    expect(checkRateLimit(db, ip, 'grievance:react', now).allowed).toBe(true);
  });
});
