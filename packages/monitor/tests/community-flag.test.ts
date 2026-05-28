import { describe, it, expect } from 'vitest';
import { recomputeCommunityFlag, COMMUNITY_FLAG_THRESHOLD, COMMUNITY_FLAG_WINDOW_MS } from '../src/community-flag.js';
import { createDb, schema, seedSites } from '@dtb/db';
import Database from 'better-sqlite3';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function freshDb() {
  const path = join(mkdtempSync(join(tmpdir(), 'dtb-cf-')), 'test.sqlite');
  const raw = new Database(path);
  raw.exec(`
    CREATE TABLE sites (id TEXT PRIMARY KEY, name TEXT, url TEXT, config_json TEXT, enabled INTEGER DEFAULT 1);
    CREATE TABLE grievances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site_id TEXT, tag TEXT, body TEXT, ip_hash TEXT, created_at INTEGER,
      visible INTEGER DEFAULT 1, reports_count INTEGER DEFAULT 0
    );
    CREATE TABLE site_status (
      site_id TEXT PRIMARY KEY, current_state TEXT, state_since INTEGER,
      uptime_30d_pct REAL, last_check_at INTEGER, community_flag INTEGER DEFAULT 0
    );
  `);
  raw.close();
  return createDb(path);
}

async function makeDb() {
  const db = freshDb();
  await seedSites(db, [{ id: 's', name: 'S', url: 'https://s', enabled: true }]);
  db.insert(schema.siteStatus).values({
    siteId: 's', currentState: 'working', stateSince: 0,
    lastCheckAt: Date.now(), communityFlag: false,
  }).run();
  return db;
}

function insertGrievances(
  db: ReturnType<typeof createDb>,
  count: number,
  now: number,
  windowMs: number,
) {
  for (let i = 0; i < count; i++) {
    db.insert(schema.grievances).values({
      siteId: 's', tag: 'otp-not-coming', body: `g${i}`,
      ipHash: `ip${i}`, createdAt: now - Math.floor(Math.random() * windowMs),
      visible: true, reportsCount: 0,
    }).run();
  }
}

describe('recomputeCommunityFlag', () => {
  it('does not flag a site below the threshold', async () => {
    const db = await makeDb();
    const now = Date.now();
    insertGrievances(db, COMMUNITY_FLAG_THRESHOLD - 1, now, COMMUNITY_FLAG_WINDOW_MS);
    recomputeCommunityFlag(db, now);
    const status = db.select().from(schema.siteStatus).all()[0]!;
    expect(status.communityFlag).toBe(false);
  });

  it('flags a site at or above the threshold within the window', async () => {
    const db = await makeDb();
    const now = Date.now();
    insertGrievances(db, COMMUNITY_FLAG_THRESHOLD, now, COMMUNITY_FLAG_WINDOW_MS);
    recomputeCommunityFlag(db, now);
    const status = db.select().from(schema.siteStatus).all()[0]!;
    expect(status.communityFlag).toBe(true);
  });

  it('does not flag based on grievances OUTSIDE the window', async () => {
    const db = await makeDb();
    const now = Date.now();
    // grievances from 30 minutes ago should not count for a 10-minute window
    insertGrievances(db, COMMUNITY_FLAG_THRESHOLD + 5, now - 30 * 60_000, COMMUNITY_FLAG_WINDOW_MS);
    recomputeCommunityFlag(db, now);
    const status = db.select().from(schema.siteStatus).all()[0]!;
    expect(status.communityFlag).toBe(false);
  });

  it('clears a previously-set flag when grievance rate drops', async () => {
    const db = await makeDb();
    const now = Date.now();
    db.update(schema.siteStatus).set({ communityFlag: true }).run();
    insertGrievances(db, 1, now, COMMUNITY_FLAG_WINDOW_MS);
    recomputeCommunityFlag(db, now);
    const status = db.select().from(schema.siteStatus).all()[0]!;
    expect(status.communityFlag).toBe(false);
  });

  it('only counts visible grievances', async () => {
    const db = await makeDb();
    const now = Date.now();
    insertGrievances(db, COMMUNITY_FLAG_THRESHOLD, now, COMMUNITY_FLAG_WINDOW_MS);
    db.update(schema.grievances).set({ visible: false }).run();
    recomputeCommunityFlag(db, now);
    const status = db.select().from(schema.siteStatus).all()[0]!;
    expect(status.communityFlag).toBe(false);
  });
});
