import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';

export type Db = ReturnType<typeof createDb>;

/** Open a SQLite file and return a Drizzle handle.
 *  Caller owns the returned object; closing is up to them. */
export function createDb(dbPath: string) {
  const sqlite = new Database(dbPath);
  // Enable WAL for concurrent read while monitor writes.
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  return drizzle(sqlite, { schema });
}

export { schema };
