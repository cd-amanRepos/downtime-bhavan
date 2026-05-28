import { readdirSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createDb } from './client.js';
import { seedSites } from './seed.js';
import type { SiteConfig } from '@dtb/shared';

// packages/db/src/seed-cli.ts → climb up 3 levels to repo root.
// Same path-resolution pattern as migrate.ts. DTB_DB_PATH / DTB_CONFIG_DIR
// env vars override.
const repoRoot = resolve(import.meta.dirname, '..', '..', '..');
const dbPath = process.env.DTB_DB_PATH ?? resolve(repoRoot, 'data', 'dtb.sqlite');
const configDir = process.env.DTB_CONFIG_DIR ?? resolve(repoRoot, 'config', 'sites');

const configs: SiteConfig[] = readdirSync(configDir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(configDir, f), 'utf8')) as SiteConfig);

const db = createDb(dbPath);
await seedSites(db, configs);
console.log(`✓ Seeded ${configs.length} site(s) into ${dbPath}`);
