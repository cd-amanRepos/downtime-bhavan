import { createDb, type Db } from '@dtb/db';
import { resolve } from 'node:path';

let _db: Db | null = null;

/** Singleton Drizzle client for the web process. Opens the SAME file the
 *  monitor writes to. WAL mode in createDb() makes concurrent reads safe. */
export function getDb(): Db {
  if (!_db) {
    // Resolve path lazily so import.meta.dirname is available at call time
    // (not at module evaluation time, which fails during Next.js static analysis).
    // apps/web/lib/db.ts → climb 3 levels to repo root (same pattern as
    // migrate.ts, seed-cli.ts, monitor/index.ts).
    const repoRoot = resolve(import.meta.dirname, '..', '..', '..');
    const dbPath = process.env.DTB_DB_PATH ?? resolve(repoRoot, 'data', 'dtb.sqlite');
    _db = createDb(dbPath);
  }
  return _db;
}
