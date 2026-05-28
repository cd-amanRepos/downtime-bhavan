import { createDb, type Db } from '@dtb/db';
import { resolve } from 'node:path';

// apps/web/lib/db.ts → climb 3 levels to repo root (same pattern as
// migrate.ts, seed-cli.ts, monitor/index.ts).
const repoRoot = resolve(import.meta.dirname, '..', '..', '..');
const dbPath = process.env.DTB_DB_PATH ?? resolve(repoRoot, 'data', 'dtb.sqlite');

let _db: Db | null = null;

/** Singleton Drizzle client for the web process. Opens the SAME file the
 *  monitor writes to. WAL mode in createDb() makes concurrent reads safe. */
export function getDb(): Db {
  if (!_db) _db = createDb(dbPath);
  return _db;
}
