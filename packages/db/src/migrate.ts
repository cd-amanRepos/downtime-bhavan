import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { createDb } from './client.js';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

// packages/db/src/migrate.ts → climb up 3 levels to repo root.
// This assumes the file stays at packages/db/src/. If the monorepo
// layout changes, update this OR set DTB_DB_PATH in the environment
// (which bypasses this path resolution entirely).
const repoRoot = resolve(import.meta.dirname, '..', '..', '..');
const dbPath = process.env.DTB_DB_PATH ?? resolve(repoRoot, 'data', 'dtb.sqlite');
mkdirSync(dirname(dbPath), { recursive: true });

const db = createDb(dbPath);
migrate(db, { migrationsFolder: resolve(import.meta.dirname, '..', 'migrations') });

console.log(`✓ Migrated ${dbPath}`);
