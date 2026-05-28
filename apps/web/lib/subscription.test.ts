import { describe, it, expect, beforeEach } from 'vitest';
import { countActiveByPhone, MAX_ACTIVE_PER_PHONE } from './subscription.js';
import { createDb, schema } from '@dtb/db';
import Database from 'better-sqlite3';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function freshDb() {
  const path = join(mkdtempSync(join(tmpdir(), 'dtb-sub-')), 'test.sqlite');
  const raw = new Database(path);
  raw.exec(`
    CREATE TABLE sites (id TEXT PRIMARY KEY, name TEXT, url TEXT, config_json TEXT, enabled INTEGER DEFAULT 1);
    CREATE TABLE subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site_id TEXT, phone_hash TEXT, phone_ciphertext TEXT, status TEXT,
      created_at INTEGER, activated_at INTEGER, triggered_at INTEGER
    );
  `);
  raw.close();
  return createDb(path);
}

describe('countActiveByPhone', () => {
  it('returns 0 for unknown phone', () => {
    const db = freshDb();
    expect(countActiveByPhone(db, 'abc')).toBe(0);
  });
  it('counts only "active" status, not triggered/cancelled/pending', () => {
    const db = freshDb();
    const now = Date.now();
    db.insert(schema.sites).values({ id: 's', name: 'S', url: 'u', configJson: '{}', enabled: true }).run();
    for (const s of ['pending_otp', 'active', 'active', 'triggered', 'cancelled', 'deleted']) {
      db.insert(schema.subscriptions).values({
        siteId: 's', phoneHash: 'phone1', status: s as any, createdAt: now,
      }).run();
    }
    expect(countActiveByPhone(db, 'phone1')).toBe(2);
  });
});
