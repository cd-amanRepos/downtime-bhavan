import { describe, it, expect, beforeEach } from 'vitest';
import { createDb, schema } from '../src/index.js';
import { seedSites } from '../src/seed.js';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';

describe('seedSites', () => {
  let dbPath: string;

  beforeEach(() => {
    dbPath = join(mkdtempSync(join(tmpdir(), 'dtb-')), 'test.sqlite');
    // bootstrap tables via raw SQL for the test
    const raw = new Database(dbPath);
    raw.exec(`
      CREATE TABLE sites (id TEXT PRIMARY KEY, name TEXT, url TEXT, config_json TEXT, enabled INTEGER DEFAULT 1);
    `);
    raw.close();
  });

  it('inserts a site from a JSON config when it does not exist', async () => {
    const db = createDb(dbPath);
    const config = {
      id: 'aadhaar-ssup',
      name: 'Aadhaar Self-Service Portal',
      url: 'https://uidai.gov.in/ssup',
      enabled: true,
    };
    await seedSites(db, [config]);
    const rows = db.select().from(schema.sites).all();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe('Aadhaar Self-Service Portal');
  });

  it('updates an existing site when seeded again with different name', async () => {
    const db = createDb(dbPath);
    await seedSites(db, [{ id: 'a', name: 'Old', url: 'https://a', enabled: true }]);
    await seedSites(db, [{ id: 'a', name: 'New', url: 'https://a', enabled: true }]);
    const rows = db.select().from(schema.sites).all();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe('New');
  });

  it('preserves config_json round-trip', async () => {
    const db = createDb(dbPath);
    const config = {
      id: 's', name: 'S', url: 'https://s', enabled: true,
      selectors: { mustExist: ['input'] },
    };
    await seedSites(db, [config]);
    const row = db.select().from(schema.sites).all()[0]!;
    expect(JSON.parse(row.configJson)).toEqual(config);
  });
});
