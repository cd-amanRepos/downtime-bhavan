import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { createDb } from './client.js';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const dbPath = process.env.DTB_DB_PATH ?? resolve('data', 'dtb.sqlite');
mkdirSync(dirname(dbPath), { recursive: true });

const db = createDb(dbPath);
migrate(db, { migrationsFolder: resolve(import.meta.dirname, '..', 'migrations') });

console.log(`✓ Migrated ${dbPath}`);
