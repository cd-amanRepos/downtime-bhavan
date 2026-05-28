import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runOneTick } from '../src/loop.js';
import { createDb, schema, seedSites } from '@dtb/db';
import Database from 'better-sqlite3';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('runOneTick', () => {
  let dbPath: string;

  beforeEach(async () => {
    dbPath = join(mkdtempSync(join(tmpdir(), 'dtb-')), 'test.sqlite');
    const raw = new Database(dbPath);
    raw.exec(`
      CREATE TABLE sites (id TEXT PRIMARY KEY, name TEXT, url TEXT, config_json TEXT, enabled INTEGER DEFAULT 1);
      CREATE TABLE checks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        site_id TEXT, checked_at INTEGER, layer TEXT, result TEXT,
        http_status INTEGER, latency_ms INTEGER, failure_reason TEXT
      );
      CREATE TABLE site_status (
        site_id TEXT PRIMARY KEY, current_state TEXT, state_since INTEGER,
        uptime_30d_pct REAL, last_check_at INTEGER, community_flag INTEGER DEFAULT 0
      );
    `);
    raw.close();

    const db = createDb(dbPath);
    await seedSites(db, [{
      id: 'aadhaar-ssup',
      name: 'Aadhaar Self-Service Portal',
      url: 'https://uidai.gov.in/ssup',
      enabled: true,
    }]);
  });

  it('writes a check row and creates a site_status row for a new site (success path)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200, ok: true }));
    const db = createDb(dbPath);
    await runOneTick(db);

    const checks = db.select().from(schema.checks).all();
    expect(checks).toHaveLength(1);
    expect(checks[0]?.result).toBe('up');
    expect(checks[0]?.layer).toBe('http');

    const status = db.select().from(schema.siteStatus).all();
    expect(status).toHaveLength(1);
    expect(status[0]?.currentState).toBe('working');
  });

  it('updates site_status from working → degraded after one failure', async () => {
    const db = createDb(dbPath);

    // First tick: success
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200, ok: true }));
    await runOneTick(db);

    // Second tick: failure
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 503, ok: false }));
    await runOneTick(db);

    const status = db.select().from(schema.siteStatus).all();
    expect(status[0]?.currentState).toBe('degraded');

    const checks = db.select().from(schema.checks).all();
    expect(checks).toHaveLength(2);
  });

  it('skips disabled sites', async () => {
    const db = createDb(dbPath);
    db.update(schema.sites).set({ enabled: false }).run();

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200, ok: true }));
    await runOneTick(db);

    expect(db.select().from(schema.checks).all()).toHaveLength(0);
  });
});
