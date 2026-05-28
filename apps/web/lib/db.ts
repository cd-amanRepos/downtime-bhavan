import { createDb, type Db } from '@dtb/db';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

let _db: Db | null = null;

/** Singleton Drizzle client for the web process. Opens the SAME file the
 *  monitor writes to. WAL mode in createDb() makes concurrent reads safe. */
export function getDb(): Db {
  if (!_db) {
    let dbPath: string;
    if (process.env.DTB_DB_PATH) {
      dbPath = process.env.DTB_DB_PATH;
    } else {
      // import.meta.dirname is undefined under Next.js webpack, but
      // import.meta.url works. This file lives at apps/web/lib/db.ts →
      // climb 4 levels up (lib → web → apps → repo-root) to find data/.
      const thisFile = fileURLToPath(import.meta.url);
      const repoRoot = resolve(thisFile, '..', '..', '..', '..');
      dbPath = resolve(repoRoot, 'data', 'dtb.sqlite');
    }
    _db = createDb(dbPath);
  }
  return _db;
}
