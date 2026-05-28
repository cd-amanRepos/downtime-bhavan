import { describe, it, expect } from 'vitest';
import { createDb, schema } from '../src/index.js';

describe('schema', () => {
  const path = ':memory:';

  it('can insert a site, a check, and a status row, then query them back', () => {
    const db = createDb(path);

    // Bootstrap tables manually (we'll generate proper migrations next step)
    const sqlite = (db as any).$client as import('better-sqlite3').Database;
    sqlite.exec(`
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

    db.insert(schema.sites).values({
      id: 'aadhaar-ssup',
      name: 'Aadhaar Self-Service Portal',
      url: 'https://uidai.gov.in/ssup',
      configJson: '{}',
      enabled: true,
    }).run();

    db.insert(schema.checks).values({
      siteId: 'aadhaar-ssup',
      checkedAt: 1717000000000,
      layer: 'http',
      result: 'up',
      httpStatus: 200,
      latencyMs: 540,
    }).run();

    db.insert(schema.siteStatus).values({
      siteId: 'aadhaar-ssup',
      currentState: 'working',
      stateSince: 1717000000000,
      lastCheckAt: 1717000000000,
      communityFlag: false,
    }).run();

    const sitesRows = db.select().from(schema.sites).all();
    expect(sitesRows).toHaveLength(1);
    expect(sitesRows[0]?.id).toBe('aadhaar-ssup');

    const checkRows = db.select().from(schema.checks).all();
    expect(checkRows).toHaveLength(1);
    expect(checkRows[0]?.result).toBe('up');

    const statusRows = db.select().from(schema.siteStatus).all();
    expect(statusRows).toHaveLength(1);
    expect(statusRows[0]?.currentState).toBe('working');
  });
});
