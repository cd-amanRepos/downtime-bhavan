# Plan 1 — Walking Skeleton

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a working end-to-end vertical slice: one real Indian government site (Aadhaar SSUP) is checked every 2 minutes from the local dev machine, results land in SQLite, and the homepage renders the locked v6 design with that one site's live status, sparkline, and 30-day uptime.

**Architecture:**
- Monorepo (npm workspaces). Three packages — `db` (Drizzle ORM + SQLite schema), `monitor` (Node service running the HTTP check loop), `shared` (cross-package types). One app — `web` (Next.js 15 + Tailwind v4) that reads from the same SQLite file.
- Monitor writes `checks` rows on every probe and updates `site_status` via the state machine. Web reads from `site_status` + last 24 `checks` per site, no caching layer for V1.
- Walking skeleton has only the HTTP layer (layer-2 headless + the 11 other sites come in Plan 2). One site is enough to prove the loop end-to-end.

**Tech Stack:**
- TypeScript 5.6+, Node 22 LTS, npm workspaces
- Next.js 15 (App Router), React 19, Tailwind v4 (CSS-first config)
- Drizzle ORM + `better-sqlite3`
- Vitest (unit/integration), Playwright (e2e — installed but only one smoke test in this plan)
- Plus Jakarta Sans, Spectral, Noto Sans Devanagari via `next/font/google`

**Mockup source of truth:** `.superpowers/brainstorm/28448-1779924034/content/homepage-v6.html`
**Spec:** `docs/superpowers/specs/2026-05-28-downtime-bhavan-design.md`

---

## File structure (locked at end of this plan)

```
downtime-bhavan/
├── .github/workflows/ci.yml
├── .gitignore
├── LICENSE                                  (AGPL-3.0)
├── README.md
├── package.json                             (root workspace)
├── tsconfig.base.json
├── vitest.config.ts                         (root, shared config)
├── playwright.config.ts                     (root)
├── apps/
│   └── web/
│       ├── package.json
│       ├── next.config.ts
│       ├── postcss.config.mjs
│       ├── tsconfig.json
│       ├── app/
│       │   ├── globals.css                  (Tailwind v4 + design tokens)
│       │   ├── layout.tsx
│       │   ├── page.tsx                     (homepage assembly)
│       │   └── api/
│       │       └── status/route.ts          (GET /api/status)
│       ├── components/
│       │   ├── Header.tsx
│       │   ├── DepartmentStatusPanel.tsx
│       │   ├── NotifyHero.tsx               (form stubs; real flow in Plan 3)
│       │   ├── JantaDarbarPanel.tsx         (static stub; real feed in Plan 4)
│       │   ├── Sparkline.tsx
│       │   ├── StatusItem.tsx
│       │   ├── AshokaMark.tsx
│       │   └── Tricolor.tsx
│       ├── lib/
│       │   ├── db.ts                        (Drizzle client singleton)
│       │   └── status-derive.ts             (server-side helpers)
│       └── e2e/
│           └── homepage.spec.ts             (Playwright smoke test)
├── packages/
│   ├── db/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── drizzle.config.ts
│   │   ├── src/
│   │   │   ├── schema.ts                    (Drizzle schema)
│   │   │   ├── client.ts                    (createClient factory)
│   │   │   ├── seed.ts                      (read config/sites/*.json → DB)
│   │   │   └── index.ts
│   │   └── tests/
│   │       └── schema.test.ts
│   ├── monitor/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── http-check.ts                (pure: URL → CheckResult)
│   │   │   ├── state-machine.ts             (pure: checks[] → state)
│   │   │   ├── loop.ts                      (run one tick: probe + persist)
│   │   │   └── index.ts                     (long-running daemon entry)
│   │   └── tests/
│   │       ├── http-check.test.ts
│   │       ├── state-machine.test.ts
│   │       └── loop.test.ts
│   └── shared/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── types.ts                     (CheckResult, SiteStatus, SiteConfig)
│           └── index.ts
├── config/
│   └── sites/
│       └── aadhaar-ssup.json                (the one site for walking skeleton)
└── docs/
    └── superpowers/
        ├── specs/2026-05-28-downtime-bhavan-design.md
        └── plans/2026-05-28-walking-skeleton.md     (this file)
```

**Each file does one thing:**
- `packages/shared/types.ts` — types that both monitor and web import. No logic.
- `packages/db/schema.ts` — table definitions only. No queries.
- `packages/db/client.ts` — factory that opens the SQLite file and returns a Drizzle handle.
- `packages/db/seed.ts` — idempotent upsert of `sites` table from JSON configs.
- `packages/monitor/http-check.ts` — pure async function: `(url) => CheckResult`. No DB.
- `packages/monitor/state-machine.ts` — pure function: `(prevState, recentChecks) => newState`. No I/O.
- `packages/monitor/loop.ts` — orchestration: read enabled sites, run http-check on each, write `checks` row, recompute `site_status`. One tick per call.
- `packages/monitor/index.ts` — long-running daemon: every 2 minutes, run `loop()`.
- `apps/web/lib/db.ts` — read-only Drizzle client for the web process.
- `apps/web/app/api/status/route.ts` — `GET /api/status`. Returns array of `{ site, status, uptime_30d, last_24h_checks }`.
- `apps/web/components/*.tsx` — one component per visual block from v6. Pure presentational where possible.

---

## Task 1 — Repo bootstrap

**Files:**
- Create: `.gitignore`, `LICENSE`, `README.md`, `package.json`, `tsconfig.base.json`

- [ ] **Step 1: Initialize git repo**

```bash
cd /Users/woofwoof/Desktop/govt-website-tracker
git init -b main
```

Expected: `Initialized empty Git repository in .../govt-website-tracker/.git/`

- [ ] **Step 2: Create `.gitignore`**

```
node_modules/
.next/
dist/
build/
out/

# Local DB & runtime
*.sqlite
*.sqlite-journal
*.sqlite-wal
*.sqlite-shm
data/
.env
.env.local
.env.production

# Editor/OS
.DS_Store
.vscode/
.idea/
*.log
coverage/
.playwright-report/
test-results/

# Brainstorm artifacts
.superpowers/
```

- [ ] **Step 3: Create `LICENSE` (AGPL-3.0)**

Download the full text:

```bash
curl -sL https://www.gnu.org/licenses/agpl-3.0.txt -o LICENSE
```

Expected: file `LICENSE` exists, starts with `GNU AFFERO GENERAL PUBLIC LICENSE`.

- [ ] **Step 4: Create `README.md`**

```markdown
# Downtime Bhavan · डाउनटाइम भवन

An unofficial public observatory of India's most-used government websites.

**Status:** under development (V1 walking skeleton in progress)
**Live:** not yet
**Design spec:** [docs/superpowers/specs/2026-05-28-downtime-bhavan-design.md](docs/superpowers/specs/2026-05-28-downtime-bhavan-design.md)

## Local development

```bash
nvm use            # uses Node 22 LTS
npm install
npm run db:migrate
npm run db:seed
npm run dev        # starts monitor + web concurrently
```

Open http://localhost:3000.

## Architecture

Monorepo with npm workspaces:
- `apps/web` — Next.js 15 public site
- `packages/db` — SQLite schema (Drizzle ORM)
- `packages/monitor` — Node service that probes sites every 2 min
- `packages/shared` — cross-package TypeScript types

## License

AGPL-3.0 — see [LICENSE](LICENSE). Citizens-funded project. Commercial forks must remain open-source.

> Not affiliated with any government body.
```

- [ ] **Step 5: Create root `package.json`**

```json
{
  "name": "downtime-bhavan",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "engines": {
    "node": ">=22.0.0"
  },
  "scripts": {
    "build": "npm run -ws --if-present build",
    "lint": "npm run -ws --if-present lint",
    "typecheck": "npm run -ws --if-present typecheck",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "db:migrate": "npm run -w @dtb/db migrate",
    "db:seed": "npm run -w @dtb/db seed",
    "dev:web": "npm run -w @dtb/web dev",
    "dev:monitor": "npm run -w @dtb/monitor dev",
    "dev": "npm-run-all -p dev:web dev:monitor"
  },
  "devDependencies": {
    "@types/node": "^22.10.0",
    "npm-run-all": "^4.1.5",
    "typescript": "^5.7.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 6: Create root `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "forceConsistentCasingInFileNames": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "verbatimModuleSyntax": true,
    "declaration": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 7: Verify directory layout, then commit**

```bash
ls -la
git add .gitignore LICENSE README.md package.json tsconfig.base.json docs/
git status
git commit -m "chore: bootstrap monorepo with AGPL-3.0 license

Initial repo scaffolding. Includes design spec and walking-skeleton plan
already authored during brainstorm."
```

Expected output of `git status` after add: shows the 5 files staged plus `docs/` directory.

---

## Task 2 — Shared types package

**Files:**
- Create: `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/shared/src/types.ts`, `packages/shared/src/index.ts`

- [ ] **Step 1: Create the package directory and `package.json`**

```bash
mkdir -p packages/shared/src
```

`packages/shared/package.json`:

```json
{
  "name": "@dtb/shared",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] **Step 2: Create `packages/shared/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Write the types**

`packages/shared/src/types.ts`:

```typescript
/**
 * The three possible states for a tracked site.
 *
 * `working` — All checks pass.
 * `degraded` — HTTP up but a layer-2 check is failing OR the community has
 *   flagged the site (≥20 grievances in 10 minutes).
 * `down` — HTTP layer is failing (server unreachable, 5xx, or timeout).
 */
export type SiteState = 'working' | 'degraded' | 'down';

/** Which detection layer produced a given check result. */
export type CheckLayer = 'http' | 'headless';

/** A single probe outcome — what the monitor writes per attempt. */
export interface CheckResult {
  siteId: string;
  layer: CheckLayer;
  /** 'up' | 'degraded' | 'down' — the layer's verdict, not necessarily the
   *  site's overall state (which is derived by the state machine). */
  result: 'up' | 'degraded' | 'down';
  httpStatus?: number;
  latencyMs?: number;
  /** Human-readable reason when result !== 'up'. */
  failureReason?: string;
  checkedAt: number; // unix epoch ms
}

/** A site config file (config/sites/*.json) — what gets seeded into DB. */
export interface SiteConfig {
  id: string;
  name: string;
  url: string;
  selectors?: {
    /** Selectors that must be present in the rendered page (layer-2). */
    mustExist?: string[];
    /** Selectors that, if present, indicate a broken page (layer-2). */
    mustNotExist?: string[];
  };
  /** Region label used in the UI ("Mumbai"). */
  checkpointRegion?: string;
  headlessTimeoutMs?: number;
  enabled?: boolean; // default true
}

/** Denormalized current state per site — what the homepage reads from. */
export interface SiteStatusSnapshot {
  siteId: string;
  name: string;
  url: string;
  currentState: SiteState;
  /** Epoch ms when the site entered `currentState`. */
  stateSince: number;
  uptime30dPct: number | null; // null until 30d of data is available
  lastCheckAt: number;
  communityFlag: boolean;
  /** Last 24 hourly buckets (oldest → newest). One entry per hour. */
  last24h: Array<{ hourStart: number; state: SiteState | 'unknown' }>;
}
```

- [ ] **Step 4: Re-export from `packages/shared/src/index.ts`**

```typescript
export * from './types.js';
```

- [ ] **Step 5: Verify typecheck passes**

```bash
npm install -w @dtb/shared
npm -w @dtb/shared run typecheck
```

Expected: exit code 0, no output.

- [ ] **Step 6: Commit**

```bash
git add packages/shared package.json package-lock.json
git commit -m "feat(shared): add cross-package type definitions

Defines SiteState, CheckResult, SiteConfig, SiteStatusSnapshot. These
are the contract between monitor (writes) and web (reads)."
```

---

## Task 3 — DB package: schema + client

**Files:**
- Create: `packages/db/package.json`, `packages/db/tsconfig.json`, `packages/db/drizzle.config.ts`, `packages/db/src/schema.ts`, `packages/db/src/client.ts`, `packages/db/src/index.ts`

- [ ] **Step 1: Create the package and install dependencies**

```bash
mkdir -p packages/db/src packages/db/tests packages/db/migrations
```

`packages/db/package.json`:

```json
{
  "name": "@dtb/db",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "migrate:generate": "drizzle-kit generate",
    "migrate": "tsx src/migrate.ts",
    "seed": "tsx src/seed-cli.ts",
    "test": "vitest run"
  },
  "dependencies": {
    "@dtb/shared": "*",
    "better-sqlite3": "^11.5.0",
    "drizzle-orm": "^0.36.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0",
    "drizzle-kit": "^0.28.0",
    "tsx": "^4.19.0"
  }
}
```

```bash
npm install
```

Expected: dependencies resolve, no errors.

- [ ] **Step 2: Create `packages/db/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": ".",
    "types": ["node"]
  },
  "include": ["src/**/*", "tests/**/*"]
}
```

- [ ] **Step 3: Define the schema**

`packages/db/src/schema.ts`:

```typescript
import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';

/**
 * The 12 tracked sites. Rows are seeded from config/sites/*.json and updated
 * on each seed run (idempotent upsert by id).
 */
export const sites = sqliteTable('sites', {
  id: text('id').primaryKey(),         // 'aadhaar-ssup'
  name: text('name').notNull(),         // 'Aadhaar Self-Service Portal'
  url: text('url').notNull(),
  configJson: text('config_json').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
});

/**
 * Every probe result the monitor writes. Append-only.
 * `result` is the layer's verdict; the overall site state is derived
 * separately in site_status.
 */
export const checks = sqliteTable(
  'checks',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    siteId: text('site_id').notNull().references(() => sites.id),
    checkedAt: integer('checked_at').notNull(),                // epoch ms
    layer: text('layer', { enum: ['http', 'headless'] }).notNull(),
    result: text('result', { enum: ['up', 'degraded', 'down'] }).notNull(),
    httpStatus: integer('http_status'),
    latencyMs: integer('latency_ms'),
    failureReason: text('failure_reason'),
  },
  (t) => ({
    siteTimeIdx: index('idx_checks_site_time').on(t.siteId, t.checkedAt),
  }),
);

/**
 * Denormalized current state per site. Updated by the state machine after
 * each new `checks` row. The homepage reads from here, not from `checks`.
 */
export const siteStatus = sqliteTable('site_status', {
  siteId: text('site_id').primaryKey().references(() => sites.id),
  currentState: text('current_state', { enum: ['working', 'degraded', 'down'] })
    .notNull(),
  stateSince: integer('state_since').notNull(),
  uptime30dPct: real('uptime_30d_pct'),
  lastCheckAt: integer('last_check_at').notNull(),
  communityFlag: integer('community_flag', { mode: 'boolean' })
    .notNull()
    .default(false),
});
```

> NOTE: The full schema in the design spec includes `subscriptions`, `otp_attempts`, `grievances`, `reactions`, `donations`. Those are intentionally omitted from this walking skeleton; they will be added incrementally in Plans 3, 4, and 5. Drizzle migrations will accrete additively, not replace.

- [ ] **Step 4: Create the client factory**

`packages/db/src/client.ts`:

```typescript
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
```

- [ ] **Step 5: Create `packages/db/src/index.ts`**

```typescript
export * from './client.js';
export * as schema from './schema.js';
```

- [ ] **Step 6: Configure Drizzle Kit**

`packages/db/drizzle.config.ts`:

```typescript
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/schema.ts',
  out: './migrations',
  dialect: 'sqlite',
} satisfies Config;
```

- [ ] **Step 7: Write a failing schema sanity test**

`packages/db/tests/schema.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { createDb, schema } from '../src/index.js';
import { existsSync, unlinkSync } from 'node:fs';

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
```

- [ ] **Step 8: Run test — should fail (no migrations runner yet, but in-memory CREATE TABLE inside the test makes it pass; verify)**

```bash
npm -w @dtb/db test
```

Expected: 1 test passes. If it fails, fix the schema or test before continuing.

- [ ] **Step 9: Generate the proper migration with Drizzle Kit**

```bash
npm -w @dtb/db run migrate:generate
```

Expected: A new file `packages/db/migrations/0000_<name>.sql` appears.

- [ ] **Step 10: Write the migrate runner**

`packages/db/src/migrate.ts`:

```typescript
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { createDb } from './client.js';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const dbPath = process.env.DTB_DB_PATH ?? resolve('data', 'dtb.sqlite');
mkdirSync(dirname(dbPath), { recursive: true });

const db = createDb(dbPath);
migrate(db, { migrationsFolder: resolve(import.meta.dirname, '..', 'migrations') });

console.log(`✓ Migrated ${dbPath}`);
```

- [ ] **Step 11: Run migration against the real file path**

```bash
npm -w @dtb/db run migrate
ls -la data/
```

Expected: `data/dtb.sqlite` exists. Console prints `✓ Migrated <path>`.

- [ ] **Step 12: Commit**

```bash
git add packages/db package.json package-lock.json data/
echo "data/" >> .gitignore  # already there; just re-confirm
git add .gitignore
git status
git commit -m "feat(db): add Drizzle schema for sites, checks, site_status

Walking skeleton schema. Subscriptions, grievances, etc. arrive in Plans 3-4.
WAL mode + foreign keys enabled. Migration file 0000 committed."
```

---

## Task 4 — Site config + seed

**Files:**
- Create: `config/sites/aadhaar-ssup.json`, `packages/db/src/seed.ts`, `packages/db/src/seed-cli.ts`, `packages/db/tests/seed.test.ts`

- [ ] **Step 1: Write the first site config**

```bash
mkdir -p config/sites
```

`config/sites/aadhaar-ssup.json`:

```json
{
  "id": "aadhaar-ssup",
  "name": "Aadhaar Self-Service Portal",
  "url": "https://uidai.gov.in/ssup",
  "selectors": {
    "mustExist": ["input[type='text']"],
    "mustNotExist": ["text=Service temporarily unavailable"]
  },
  "checkpointRegion": "mumbai",
  "headlessTimeoutMs": 20000,
  "enabled": true
}
```

- [ ] **Step 2: Write a failing seed test**

`packages/db/tests/seed.test.ts`:

```typescript
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
```

- [ ] **Step 3: Run test, verify it fails**

```bash
npm -w @dtb/db test
```

Expected: failure mentioning `seedSites is not a function` or similar.

- [ ] **Step 4: Implement `seedSites`**

`packages/db/src/seed.ts`:

```typescript
import type { SiteConfig } from '@dtb/shared';
import type { Db } from './client.js';
import { sites } from './schema.js';

/** Idempotently insert/update a list of SiteConfigs into the sites table. */
export async function seedSites(db: Db, configs: SiteConfig[]): Promise<void> {
  for (const config of configs) {
    await db
      .insert(sites)
      .values({
        id: config.id,
        name: config.name,
        url: config.url,
        configJson: JSON.stringify(config),
        enabled: config.enabled ?? true,
      })
      .onConflictDoUpdate({
        target: sites.id,
        set: {
          name: config.name,
          url: config.url,
          configJson: JSON.stringify(config),
          enabled: config.enabled ?? true,
        },
      })
      .run();
  }
}
```

- [ ] **Step 5: Run test, verify it passes**

```bash
npm -w @dtb/db test
```

Expected: all 3 tests pass.

- [ ] **Step 6: Add the CLI seed runner**

`packages/db/src/seed-cli.ts`:

```typescript
import { readdirSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createDb } from './client.js';
import { seedSites } from './seed.js';
import type { SiteConfig } from '@dtb/shared';

const dbPath = process.env.DTB_DB_PATH ?? resolve('data', 'dtb.sqlite');
const configDir = process.env.DTB_CONFIG_DIR ?? resolve('config', 'sites');

const configs: SiteConfig[] = readdirSync(configDir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(configDir, f), 'utf8')) as SiteConfig);

const db = createDb(dbPath);
await seedSites(db, configs);
console.log(`✓ Seeded ${configs.length} site(s) into ${dbPath}`);
```

- [ ] **Step 7: Run the seed CLI**

```bash
npm -w @dtb/db run seed
```

Expected: `✓ Seeded 1 site(s) into <path>`.

Verify with sqlite:

```bash
npx -y sqlite-utils data/dtb.sqlite "SELECT id, name FROM sites;"
```

Expected: one row showing `aadhaar-ssup | Aadhaar Self-Service Portal`.

- [ ] **Step 8: Commit**

```bash
git add config/ packages/db package.json package-lock.json
git commit -m "feat(db): add seed mechanism for site configs

config/sites/*.json files are the source of truth for tracked sites.
seedSites() upserts them into the sites table idempotently. First site
seeded: Aadhaar SSUP."
```

---

## Task 5 — HTTP check (pure function, TDD)

**Files:**
- Create: `packages/monitor/package.json`, `packages/monitor/tsconfig.json`, `packages/monitor/src/http-check.ts`, `packages/monitor/tests/http-check.test.ts`

- [ ] **Step 1: Bootstrap the monitor package**

```bash
mkdir -p packages/monitor/src packages/monitor/tests
```

`packages/monitor/package.json`:

```json
{
  "name": "@dtb/monitor",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "dev": "tsx watch src/index.ts",
    "start": "tsx src/index.ts"
  },
  "dependencies": {
    "@dtb/db": "*",
    "@dtb/shared": "*"
  },
  "devDependencies": {
    "tsx": "^4.19.0"
  }
}
```

`packages/monitor/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "types": ["node"],
    "outDir": "dist",
    "rootDir": "."
  },
  "include": ["src/**/*", "tests/**/*"]
}
```

```bash
npm install
```

- [ ] **Step 2: Write the failing http-check tests**

`packages/monitor/tests/http-check.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkHttp } from '../src/http-check.js';

describe('checkHttp', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it('returns up + latency + status for a 200 response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200, ok: true }));
    const result = await checkHttp('https://example.com');
    expect(result.result).toBe('up');
    expect(result.httpStatus).toBe(200);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.failureReason).toBeUndefined();
  });

  it('returns down for a 503 response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 503, ok: false }));
    const result = await checkHttp('https://example.com');
    expect(result.result).toBe('down');
    expect(result.httpStatus).toBe(503);
    expect(result.failureReason).toMatch(/HTTP 503/);
  });

  it('returns down on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    const result = await checkHttp('https://example.com');
    expect(result.result).toBe('down');
    expect(result.httpStatus).toBeUndefined();
    expect(result.failureReason).toMatch(/ECONNREFUSED/);
  });

  it('returns down on timeout (>10s)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(
      () => new Promise(() => { /* never resolves */ }),
    ));
    const promise = checkHttp('https://example.com', { timeoutMs: 10_000 });
    await vi.advanceTimersByTimeAsync(11_000);
    const result = await promise;
    expect(result.result).toBe('down');
    expect(result.failureReason).toMatch(/timeout/i);
  });

  it('accepts 3xx redirects as up', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 302, ok: false }));
    const result = await checkHttp('https://example.com');
    expect(result.result).toBe('up');
  });

  it('uses GET (not HEAD) to defeat servers that refuse HEAD', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 200, ok: true });
    vi.stubGlobal('fetch', fetchMock);
    await checkHttp('https://example.com');
    expect(fetchMock).toHaveBeenCalledWith('https://example.com', expect.objectContaining({
      method: 'GET',
    }));
  });
});
```

- [ ] **Step 3: Run tests, confirm they all fail**

```bash
npm -w @dtb/monitor test
```

Expected: all tests fail with `checkHttp is not a function` or similar.

- [ ] **Step 4: Implement `checkHttp`**

`packages/monitor/src/http-check.ts`:

```typescript
import type { CheckResult } from '@dtb/shared';

export interface HttpCheckOptions {
  /** Hard timeout for the request in milliseconds. Default: 10_000. */
  timeoutMs?: number;
}

/**
 * Probe a URL with a GET request and classify the outcome.
 *
 * Status codes 2xx and 3xx → 'up'. Anything else → 'down'.
 * Network errors and timeouts → 'down' with a descriptive `failureReason`.
 *
 * This is a pure function: no DB, no logging. Caller persists the result.
 */
export async function checkHttp(
  url: string,
  opts: HttpCheckOptions = {},
): Promise<Omit<CheckResult, 'siteId' | 'layer'>> {
  const timeoutMs = opts.timeoutMs ?? 10_000;
  const startedAt = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('timeout')), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        'User-Agent': 'DowntimeBhavan/0.1 (+https://downtimebhavan.in)',
      },
    });

    const latencyMs = Date.now() - startedAt;
    const ok = response.status >= 200 && response.status < 400;

    return {
      result: ok ? 'up' : 'down',
      httpStatus: response.status,
      latencyMs,
      failureReason: ok ? undefined : `HTTP ${response.status}`,
      checkedAt: startedAt,
    };
  } catch (err) {
    const latencyMs = Date.now() - startedAt;
    const reason = err instanceof Error ? err.message : String(err);
    const isTimeout = reason === 'timeout' || reason.toLowerCase().includes('abort');
    return {
      result: 'down',
      latencyMs,
      failureReason: isTimeout ? 'request timeout' : reason,
      checkedAt: startedAt,
    };
  } finally {
    clearTimeout(timer);
  }
}
```

- [ ] **Step 5: Run tests, confirm they pass**

```bash
npm -w @dtb/monitor test
```

Expected: all 6 tests pass.

- [ ] **Step 6: Live sanity check against the real URL (optional, may fail offline)**

```bash
npx tsx -e "import('./packages/monitor/src/http-check.js').then(async (m) => console.log(await m.checkHttp('https://uidai.gov.in/ssup')))"
```

Expected: prints something like `{ result: 'up', httpStatus: 200, latencyMs: 540, checkedAt: ... }`. If geofenced and you're outside India, expect `'down'` — that's fine for local dev.

- [ ] **Step 7: Commit**

```bash
git add packages/monitor package.json package-lock.json
git commit -m "feat(monitor): add pure HTTP check function

GET-based, 10s timeout, treats 2xx/3xx as up. Pure — no DB, no logging.
Tested with mocked fetch covering success, 5xx, timeout, network error."
```

---

## Task 6 — State machine (pure, TDD)

**Files:**
- Create: `packages/monitor/src/state-machine.ts`, `packages/monitor/tests/state-machine.test.ts`

The state machine lives next to the check function because both are pure functions that share the monitor's domain. Status transitions follow the design spec section 5.

- [ ] **Step 1: Write the failing tests**

`packages/monitor/tests/state-machine.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { deriveNextState } from '../src/state-machine.js';
import type { CheckResult, SiteState } from '@dtb/shared';

const t = (offset: number) => 1_700_000_000_000 + offset * 1_000;

const httpCheck = (
  offset: number,
  result: 'up' | 'down' | 'degraded',
): CheckResult => ({
  siteId: 's',
  layer: 'http',
  result,
  checkedAt: t(offset),
});

describe('deriveNextState', () => {
  it('stays Working when all recent checks pass', () => {
    const prev = { state: 'working' as SiteState, stateSince: t(-300) };
    const recent = [httpCheck(-60, 'up'), httpCheck(-120, 'up'), httpCheck(-180, 'up')];
    const result = deriveNextState(prev, recent);
    expect(result.state).toBe('working');
    expect(result.stateSince).toBe(t(-300));
  });

  it('transitions Working → Degraded after a single HTTP failure', () => {
    const prev = { state: 'working' as SiteState, stateSince: t(-300) };
    const recent = [httpCheck(-30, 'down'), httpCheck(-90, 'up'), httpCheck(-150, 'up')];
    const result = deriveNextState(prev, recent);
    expect(result.state).toBe('degraded');
    expect(result.stateSince).toBe(t(-30));
  });

  it('transitions Degraded → Down after 2 consecutive HTTP failures (≥4 min)', () => {
    const prev = { state: 'degraded' as SiteState, stateSince: t(-180) };
    const recent = [httpCheck(-30, 'down'), httpCheck(-150, 'down'), httpCheck(-270, 'up')];
    const result = deriveNextState(prev, recent);
    expect(result.state).toBe('down');
    expect(result.stateSince).toBe(t(-150));
  });

  it('stays Down while HTTP keeps failing', () => {
    const prev = { state: 'down' as SiteState, stateSince: t(-600) };
    const recent = [httpCheck(-30, 'down'), httpCheck(-150, 'down'), httpCheck(-270, 'down')];
    const result = deriveNextState(prev, recent);
    expect(result.state).toBe('down');
    expect(result.stateSince).toBe(t(-600));
  });

  it('transitions Down → Working only after 3 consecutive successes ≥5min', () => {
    const prev = { state: 'down' as SiteState, stateSince: t(-3600) };
    const recent = [
      httpCheck(-30, 'up'),
      httpCheck(-150, 'up'),
      httpCheck(-270, 'up'),
      httpCheck(-390, 'down'),
    ];
    const result = deriveNextState(prev, recent);
    expect(result.state).toBe('working');
    expect(result.stateSince).toBe(t(-270));
  });

  it('does NOT transition Down → Working with only 2 successes', () => {
    const prev = { state: 'down' as SiteState, stateSince: t(-3600) };
    const recent = [
      httpCheck(-30, 'up'),
      httpCheck(-150, 'up'),
      httpCheck(-270, 'down'),
    ];
    const result = deriveNextState(prev, recent);
    expect(result.state).toBe('down');
    expect(result.stateSince).toBe(t(-3600));
  });

  it('returns the input timestamp when state is unchanged', () => {
    const prev = { state: 'working' as SiteState, stateSince: t(-1000) };
    const recent = [httpCheck(-30, 'up')];
    const result = deriveNextState(prev, recent);
    expect(result.stateSince).toBe(t(-1000));
  });
});
```

- [ ] **Step 2: Run tests, confirm they fail**

```bash
npm -w @dtb/monitor test
```

Expected: all 7 state-machine tests fail.

- [ ] **Step 3: Implement `deriveNextState`**

`packages/monitor/src/state-machine.ts`:

```typescript
import type { CheckResult, SiteState } from '@dtb/shared';

export interface PreviousState {
  state: SiteState;
  stateSince: number;
}

export interface NextState {
  state: SiteState;
  stateSince: number;
}

/**
 * Derive the next site state from the previous state and the most recent
 * checks (oldest → newest order does not matter; we sort here).
 *
 * Rules from design spec §5:
 *   - Working → Degraded if the latest check is `down` or `degraded`.
 *   - Degraded → Down if the latest 2 consecutive checks are `down`.
 *   - Down/Degraded → Working if the latest 3 consecutive checks are `up`.
 *
 * `stateSince` is updated only when the state changes — set to the
 * `checkedAt` of the FIRST check in the run that caused the transition.
 */
export function deriveNextState(
  prev: PreviousState,
  recent: readonly CheckResult[],
): NextState {
  // Sort newest-first for easier reasoning.
  const checks = [...recent].sort((a, b) => b.checkedAt - a.checkedAt);
  if (checks.length === 0) return { state: prev.state, stateSince: prev.stateSince };

  const latest = checks[0]!;

  if (prev.state === 'working') {
    if (latest.result === 'up') return { state: 'working', stateSince: prev.stateSince };
    return { state: 'degraded', stateSince: latest.checkedAt };
  }

  if (prev.state === 'degraded') {
    // 2 consecutive down → down. Use checkedAt of the EARLIER (older) of the two.
    if (checks.length >= 2 && checks[0]!.result === 'down' && checks[1]!.result === 'down') {
      return { state: 'down', stateSince: checks[1]!.checkedAt };
    }
    // 3 consecutive up → working
    if (consecutiveAtTop(checks, 'up', 3)) {
      return { state: 'working', stateSince: checks[2]!.checkedAt };
    }
    return { state: 'degraded', stateSince: prev.stateSince };
  }

  // prev.state === 'down'
  if (consecutiveAtTop(checks, 'up', 3)) {
    return { state: 'working', stateSince: checks[2]!.checkedAt };
  }
  return { state: 'down', stateSince: prev.stateSince };
}

function consecutiveAtTop(
  checks: readonly CheckResult[],
  expected: CheckResult['result'],
  n: number,
): boolean {
  if (checks.length < n) return false;
  for (let i = 0; i < n; i++) {
    if (checks[i]!.result !== expected) return false;
  }
  return true;
}
```

- [ ] **Step 4: Run tests, confirm all pass**

```bash
npm -w @dtb/monitor test
```

Expected: 13 tests pass total (6 http-check + 7 state-machine).

- [ ] **Step 5: Commit**

```bash
git add packages/monitor/src/state-machine.ts packages/monitor/tests/state-machine.test.ts
git commit -m "feat(monitor): pure state machine for working/degraded/down

Rules from design spec §5. 7 test cases cover all transitions including
the 3-consecutive-up recovery rule and 2-consecutive-down degradation
to down."
```

---

## Task 7 — Monitor loop (one tick)

**Files:**
- Create: `packages/monitor/src/loop.ts`, `packages/monitor/tests/loop.test.ts`

This is the orchestration layer that wires together the pure check + state machine functions with the DB.

- [ ] **Step 1: Write the failing loop test**

`packages/monitor/tests/loop.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runOneTick } from '../src/loop.js';
import { createDb, schema } from '@dtb/db';
import { seedSites } from '@dtb/db/seed';
import Database from 'better-sqlite3';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('runOneTick', () => {
  let dbPath: string;

  beforeEach(async () => {
    dbPath = join(mkdtempSync(join(tmpdir(), 'dtb-')), 'test.sqlite');
    const raw = new Database(dbPath);
    raw.exec(`
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
    raw.close();

    const db = createDb(dbPath);
    await seedSites(db, [{
      id: 'aadhaar-ssup',
      name: 'Aadhaar Self-Service Portal',
      url: 'https://uidai.gov.in/ssup',
      enabled: true,
    }]);
  });

  it('writes a check row and creates a site_status row for a new site (success path)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200, ok: true }));
    const db = createDb(dbPath);
    await runOneTick(db);

    const checks = db.select().from(schema.checks).all();
    expect(checks).toHaveLength(1);
    expect(checks[0]?.result).toBe('up');
    expect(checks[0]?.layer).toBe('http');

    const status = db.select().from(schema.siteStatus).all();
    expect(status).toHaveLength(1);
    expect(status[0]?.currentState).toBe('working');
  });

  it('updates site_status from working → degraded after one failure', async () => {
    const db = createDb(dbPath);

    // First tick: success
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200, ok: true }));
    await runOneTick(db);

    // Second tick: failure
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 503, ok: false }));
    await runOneTick(db);

    const status = db.select().from(schema.siteStatus).all();
    expect(status[0]?.currentState).toBe('degraded');

    const checks = db.select().from(schema.checks).all();
    expect(checks).toHaveLength(2);
  });

  it('skips disabled sites', async () => {
    const db = createDb(dbPath);
    db.update(schema.sites).set({ enabled: false }).run();

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200, ok: true }));
    await runOneTick(db);

    expect(db.select().from(schema.checks).all()).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run, confirm it fails**

```bash
npm -w @dtb/monitor test
```

Expected: 3 loop tests fail with `runOneTick is not a function`.

- [ ] **Step 3: Implement `runOneTick`**

`packages/monitor/src/loop.ts`:

```typescript
import { eq, gte, desc } from 'drizzle-orm';
import { schema, type Db } from '@dtb/db';
import { checkHttp } from './http-check.js';
import { deriveNextState, type PreviousState } from './state-machine.js';

/** Run a single probe cycle: for each enabled site, run HTTP check,
 *  persist the result, and recompute site_status. */
export async function runOneTick(db: Db): Promise<void> {
  const sites = db.select().from(schema.sites).where(eq(schema.sites.enabled, true)).all();
  for (const site of sites) {
    await tickSite(db, site);
  }
}

async function tickSite(
  db: Db,
  site: typeof schema.sites.$inferSelect,
): Promise<void> {
  const probe = await checkHttp(site.url);
  db.insert(schema.checks).values({
    siteId: site.id,
    checkedAt: probe.checkedAt,
    layer: 'http',
    result: probe.result,
    httpStatus: probe.httpStatus,
    latencyMs: probe.latencyMs,
    failureReason: probe.failureReason,
  }).run();

  // Load previous status or default to working/now
  const prevRow = db.select().from(schema.siteStatus)
    .where(eq(schema.siteStatus.siteId, site.id)).get();

  const prev: PreviousState = prevRow
    ? { state: prevRow.currentState, stateSince: prevRow.stateSince }
    : { state: 'working', stateSince: probe.checkedAt };

  // Pull last 10 checks for this site to feed the state machine
  const recent = db.select().from(schema.checks)
    .where(eq(schema.checks.siteId, site.id))
    .orderBy(desc(schema.checks.checkedAt))
    .limit(10)
    .all()
    .map((row) => ({
      siteId: row.siteId,
      layer: row.layer,
      result: row.result,
      httpStatus: row.httpStatus ?? undefined,
      latencyMs: row.latencyMs ?? undefined,
      failureReason: row.failureReason ?? undefined,
      checkedAt: row.checkedAt,
    }));

  const next = deriveNextState(prev, recent);
  const uptime30d = computeUptime30d(db, site.id);

  db.insert(schema.siteStatus).values({
    siteId: site.id,
    currentState: next.state,
    stateSince: next.stateSince,
    uptime30dPct: uptime30d,
    lastCheckAt: probe.checkedAt,
    communityFlag: prevRow?.communityFlag ?? false,
  }).onConflictDoUpdate({
    target: schema.siteStatus.siteId,
    set: {
      currentState: next.state,
      stateSince: next.stateSince,
      uptime30dPct: uptime30d,
      lastCheckAt: probe.checkedAt,
    },
  }).run();
}

function computeUptime30d(db: Db, siteId: string): number | null {
  const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const rows = db.select().from(schema.checks)
    .where(eq(schema.checks.siteId, siteId))
    .all();
  const recent = rows.filter((r) => r.checkedAt >= since);
  if (recent.length < 5) return null; // not enough data yet
  const up = recent.filter((r) => r.result === 'up').length;
  return (up / recent.length) * 100;
}
```

- [ ] **Step 4: Run tests, all pass**

```bash
npm -w @dtb/monitor test
```

Expected: 16 tests pass (6 + 7 + 3).

- [ ] **Step 5: Commit**

```bash
git add packages/monitor/src/loop.ts packages/monitor/tests/loop.test.ts
git commit -m "feat(monitor): runOneTick orchestrates probe → persist → state

Reads enabled sites, runs HTTP check, writes checks row, recomputes
site_status via deriveNextState. Uptime% computed from last 30 days
of checks, null until at least 5 samples exist."
```

---

## Task 8 — Long-running monitor daemon

**Files:**
- Create: `packages/monitor/src/index.ts`

- [ ] **Step 1: Implement the entry point**

`packages/monitor/src/index.ts`:

```typescript
import { createDb } from '@dtb/db';
import { runOneTick } from './loop.js';
import { resolve } from 'node:path';

const dbPath = process.env.DTB_DB_PATH ?? resolve('data', 'dtb.sqlite');
const intervalMs = Number(process.env.DTB_TICK_MS ?? 2 * 60 * 1000);

const db = createDb(dbPath);

console.log(`[monitor] starting, db=${dbPath}, interval=${intervalMs}ms`);

let running = false;
async function tick() {
  if (running) {
    console.log('[monitor] previous tick still in flight, skipping');
    return;
  }
  running = true;
  try {
    await runOneTick(db);
    console.log(`[monitor] tick OK ${new Date().toISOString()}`);
  } catch (err) {
    console.error('[monitor] tick failed:', err);
  } finally {
    running = false;
  }
}

await tick();                       // run once immediately
setInterval(tick, intervalMs);

// Keep the event loop alive
process.on('SIGINT', () => { console.log('\n[monitor] shutting down'); process.exit(0); });
```

- [ ] **Step 2: Run it manually for ~30 seconds**

```bash
npm run db:migrate
npm run db:seed
DTB_TICK_MS=10000 npm run dev:monitor
# Observe two ticks pass; Ctrl+C to stop.
```

Expected: console prints `[monitor] starting...`, then `[monitor] tick OK ...` once immediately and once 10s later.

Verify DB:

```bash
npx -y sqlite-utils data/dtb.sqlite "SELECT COUNT(*) AS n, MIN(result), MAX(result) FROM checks;"
```

Expected: `n` ≥ 2.

- [ ] **Step 3: Commit**

```bash
git add packages/monitor/src/index.ts
git commit -m "feat(monitor): long-running daemon entry point

setInterval-based tick loop, default 2 min, configurable via DTB_TICK_MS.
Reentrancy-guarded; logs each tick result."
```

---

## Task 9 — Next.js web app scaffold

**Files:**
- Create: `apps/web/package.json`, `apps/web/next.config.ts`, `apps/web/postcss.config.mjs`, `apps/web/tsconfig.json`, `apps/web/app/layout.tsx`, `apps/web/app/page.tsx`, `apps/web/app/globals.css`

- [ ] **Step 1: Create the app directory and `package.json`**

```bash
mkdir -p apps/web/app apps/web/components apps/web/lib apps/web/e2e apps/web/public
```

`apps/web/package.json`:

```json
{
  "name": "@dtb/web",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start -p 3000",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "@dtb/db": "*",
    "@dtb/shared": "*",
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.49.0",
    "@tailwindcss/postcss": "^4.0.0",
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/react": "^16.1.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "^15.1.0",
    "happy-dom": "^15.0.0",
    "tailwindcss": "^4.0.0"
  }
}
```

```bash
npm install
```

Expected: 0 vulnerabilities (or known low-severity), Next 15 installed.

- [ ] **Step 2: Configure Next**

`apps/web/next.config.ts`:

```typescript
import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
};

export default config;
```

`apps/web/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "ES2023"],
    "jsx": "preserve",
    "noEmit": true,
    "allowJs": true,
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`apps/web/postcss.config.mjs`:

```javascript
export default {
  plugins: { '@tailwindcss/postcss': {} },
};
```

- [ ] **Step 3: Define design tokens + Tailwind v4 import in globals.css**

`apps/web/app/globals.css`:

```css
@import 'tailwindcss';

@theme {
  --color-bg: #F7F9FC;
  --color-paper: #FFFFFF;
  --color-paper-2: #F1F4F9;
  --color-border: #E3E8F0;
  --color-border-strong: #C9D2E0;
  --color-ink: #0E1B2D;
  --color-ink-soft: #3C4A5E;
  --color-ink-dim: #6A7589;
  --color-ink-faint: #9BA5B6;
  --color-blue: #1E3A8A;
  --color-blue-deep: #0F1F5F;
  --color-blue-bright: #2C56C9;
  --color-blue-soft: #E6EDFB;
  --color-saffron: #F08C2A;
  --color-saffron-soft: #FDF1E3;
  --color-green: #138808;
  --color-green-soft: #E4F4DD;
  --color-red: #B91C1C;
  --color-red-soft: #FCE7E7;
  --color-amber: #B45309;
  --color-amber-soft: #FBEFD9;
  --color-spark-up: #15803D;
  --color-spark-degraded: #B45309;
  --color-spark-down: #B91C1C;
  --color-spark-track: #EDF0F5;

  --font-sans: 'Plus Jakarta Sans', system-ui, sans-serif;
  --font-serif: 'Spectral', Georgia, serif;
  --font-hi: 'Noto Sans Devanagari', sans-serif;
}

@layer base {
  html, body { background: var(--color-bg); color: var(--color-ink); }
  body {
    font-family: var(--font-sans);
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
  }
}

/* Focus-mode: when notify form is focused, collapse side panels */
.layout {
  display: grid;
  grid-template-columns: minmax(310px, 1fr) minmax(0, 1.55fr) minmax(330px, 1fr);
  transition: grid-template-columns 380ms cubic-bezier(0.4, 0, 0.2, 1);
}
.layout:has(.notify-form:focus-within) {
  grid-template-columns: 0fr minmax(0, 1fr) 0fr;
}
.layout:has(.notify-form:focus-within) .col-side {
  opacity: 0;
  transform: scale(0.96);
  pointer-events: none;
  transition: opacity 280ms ease, transform 380ms cubic-bezier(0.4, 0, 0.2, 1);
}
.col-side {
  transition: opacity 280ms ease, transform 380ms cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}
```

- [ ] **Step 4: Root layout with fonts**

`apps/web/app/layout.tsx`:

```typescript
import './globals.css';
import { Plus_Jakarta_Sans, Spectral, Noto_Sans_Devanagari } from 'next/font/google';
import type { ReactNode } from 'react';

const sans = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-sans-loaded', display: 'swap' });
const serif = Spectral({ subsets: ['latin'], weight: ['400', '500', '600'], style: ['italic'], variable: '--font-serif-loaded', display: 'swap' });
const hi = Noto_Sans_Devanagari({ subsets: ['devanagari'], variable: '--font-hi-loaded', display: 'swap' });

export const metadata = {
  title: 'Downtime Bhavan · An unofficial observatory',
  description: 'Live status of India\'s most-used government websites. Get a free WhatsApp alert when your Sarkari site comes back up.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} ${hi.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 5: A placeholder homepage that just confirms fonts load**

`apps/web/app/page.tsx`:

```typescript
export default function Page() {
  return (
    <main style={{ padding: 48 }}>
      <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 32, fontWeight: 700 }}>
        Downtime <span style={{ color: 'var(--color-blue)' }}>Bhavan</span>
      </h1>
      <p style={{ fontFamily: 'var(--font-hi)', marginTop: 8 }}>डाउनटाइम भवन — placeholder</p>
      <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', marginTop: 12, color: 'var(--color-blue)' }}>
        coming soon.
      </p>
    </main>
  );
}
```

- [ ] **Step 6: Start dev server**

```bash
npm run dev:web
```

Expected: `Local: http://localhost:3000`. Open it, confirm:
- "Downtime Bhavan" renders in Plus Jakarta Sans (sans-serif)
- "डाउनटाइम भवन" renders in Noto Sans Devanagari
- "coming soon." renders in Spectral italic, navy
- No console errors

Kill with Ctrl+C.

- [ ] **Step 7: Commit**

```bash
git add apps/web package.json package-lock.json
git commit -m "feat(web): Next.js 15 + Tailwind v4 scaffold with design tokens

Loads Plus Jakarta Sans, Spectral italic, Noto Sans Devanagari via
next/font/google. Tailwind v4 @theme block defines all design tokens
from spec §4. Focus-mode layout CSS in globals.css."
```

---

## Task 10 — Read-only DB client for web

**Files:**
- Create: `apps/web/lib/db.ts`

- [ ] **Step 1: Create the singleton**

`apps/web/lib/db.ts`:

```typescript
import { createDb } from '@dtb/db';
import { resolve } from 'node:path';

const dbPath = process.env.DTB_DB_PATH ?? resolve(process.cwd(), '..', '..', 'data', 'dtb.sqlite');

let _db: ReturnType<typeof createDb> | null = null;

/** Singleton Drizzle client for the web process. Opens the SAME file the
 *  monitor writes to. WAL mode in createDb() makes concurrent reads safe. */
export function getDb() {
  if (!_db) _db = createDb(dbPath);
  return _db;
}
```

- [ ] **Step 2: Commit (no test — covered by the API route test in Task 11)**

```bash
git add apps/web/lib/db.ts
git commit -m "feat(web): singleton Drizzle client opening the shared SQLite file"
```

---

## Task 11 — GET /api/status

**Files:**
- Create: `apps/web/app/api/status/route.ts`, `apps/web/lib/status-derive.ts`, `apps/web/lib/status-derive.test.ts`

- [ ] **Step 1: Write the failing test for `buildLast24h`**

`apps/web/lib/status-derive.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { buildLast24h } from './status-derive.js';

const hour = 60 * 60 * 1000;

describe('buildLast24h', () => {
  it('returns 24 buckets, oldest first, all unknown for empty input', () => {
    const now = 1_700_000_000_000;
    const buckets = buildLast24h([], now);
    expect(buckets).toHaveLength(24);
    expect(buckets.every((b) => b.state === 'unknown')).toBe(true);
    expect(buckets[0]!.hourStart).toBeLessThan(buckets[23]!.hourStart);
  });

  it('places a check into the correct hour bucket', () => {
    const now = 1_700_000_000_000;
    const fourHoursAgo = now - 4 * hour - 1_000;
    const buckets = buildLast24h(
      [{ checkedAt: fourHoursAgo, result: 'down' }],
      now,
    );
    // 24 buckets, oldest first. The "4 hours ago" bucket is at index 19 (24 - 1 - 4).
    expect(buckets[19]!.state).toBe('down');
    expect(buckets[18]!.state).toBe('unknown');
    expect(buckets[20]!.state).toBe('unknown');
  });

  it('worst-of-hour wins: any down beats degraded beats up', () => {
    const now = 1_700_000_000_000;
    const sameHour = now - 2 * hour - 30_000;
    const buckets = buildLast24h(
      [
        { checkedAt: sameHour, result: 'up' },
        { checkedAt: sameHour + 5_000, result: 'degraded' },
        { checkedAt: sameHour + 10_000, result: 'down' },
      ],
      now,
    );
    expect(buckets[21]!.state).toBe('down');
  });
});
```

- [ ] **Step 2: Run, watch it fail**

```bash
npm -w @dtb/web test
```

Expected: 3 tests fail.

- [ ] **Step 3: Implement `buildLast24h`**

`apps/web/lib/status-derive.ts`:

```typescript
import type { SiteState } from '@dtb/shared';

const HOUR = 60 * 60 * 1000;

export interface BucketInput {
  checkedAt: number;
  result: 'up' | 'degraded' | 'down';
}

export interface HourBucket {
  hourStart: number;
  state: SiteState | 'unknown';
}

/** Turn a list of recent checks into exactly 24 hourly buckets,
 *  oldest first, ending at `now`. Worst result wins per hour. */
export function buildLast24h(checks: BucketInput[], now: number): HourBucket[] {
  const buckets: HourBucket[] = [];
  for (let i = 23; i >= 0; i--) {
    buckets.push({ hourStart: now - (i + 1) * HOUR, state: 'unknown' });
  }

  for (const c of checks) {
    const idx = 24 - 1 - Math.floor((now - c.checkedAt) / HOUR);
    if (idx < 0 || idx > 23) continue;
    buckets[idx]!.state = worstOf(buckets[idx]!.state, c.result);
  }

  return buckets;
}

const rank: Record<SiteState | 'unknown', number> = {
  unknown: 0, working: 1, degraded: 2, down: 3,
};

function worstOf(a: SiteState | 'unknown', b: 'up' | 'degraded' | 'down'): SiteState {
  const mapped: SiteState = b === 'up' ? 'working' : b;
  return rank[mapped] >= rank[a] ? mapped : (a as SiteState);
}
```

- [ ] **Step 4: Run, watch it pass**

```bash
npm -w @dtb/web test
```

Expected: 3 tests pass.

- [ ] **Step 5: Implement the API route**

`apps/web/app/api/status/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { schema } from '@dtb/db';
import { getDb } from '@/lib/db';
import { buildLast24h } from '@/lib/status-derive';
import type { SiteStatusSnapshot } from '@dtb/shared';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = getDb();
  const now = Date.now();

  const sites = db.select().from(schema.sites)
    .where(eq(schema.sites.enabled, true)).all();

  const snapshots: SiteStatusSnapshot[] = sites.map((site) => {
    const status = db.select().from(schema.siteStatus)
      .where(eq(schema.siteStatus.siteId, site.id)).get();

    const since = now - 24 * 60 * 60 * 1000;
    const recent = db.select().from(schema.checks)
      .where(eq(schema.checks.siteId, site.id))
      .orderBy(desc(schema.checks.checkedAt))
      .all()
      .filter((r) => r.checkedAt >= since);

    return {
      siteId: site.id,
      name: site.name,
      url: site.url,
      currentState: status?.currentState ?? 'working',
      stateSince: status?.stateSince ?? now,
      uptime30dPct: status?.uptime30dPct ?? null,
      lastCheckAt: status?.lastCheckAt ?? now,
      communityFlag: status?.communityFlag ?? false,
      last24h: buildLast24h(
        recent.map((r) => ({ checkedAt: r.checkedAt, result: r.result })),
        now,
      ),
    };
  });

  return NextResponse.json({ sites: snapshots, now });
}
```

- [ ] **Step 6: Manual sanity check**

```bash
# In one terminal:
npm run dev:monitor
# In another:
npm run dev:web
# In a third:
curl -s http://localhost:3000/api/status | head -c 800
```

Expected: JSON with `{ sites: [{ siteId: "aadhaar-ssup", ..., last24h: [...] }], now: ... }`.

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib apps/web/app/api
git commit -m "feat(web): GET /api/status endpoint

Reads from shared SQLite. Returns snapshot per enabled site including
24-hour bucketed status history (worst-of-hour). Pure function buildLast24h
is unit-tested separately."
```

---

## Task 12 — AshokaMark + Tricolor + Header components

**Files:**
- Create: `apps/web/components/AshokaMark.tsx`, `apps/web/components/Tricolor.tsx`, `apps/web/components/Header.tsx`, `apps/web/components/Header.test.tsx`

- [ ] **Step 1: AshokaMark — SVG component**

`apps/web/components/AshokaMark.tsx`:

```typescript
interface Props { size?: number; spokeOpacity?: number; }

/** 24-spoke Ashoka-chakra-inspired mark from the v6 mockup. */
export function AshokaMark({ size = 28, spokeOpacity = 0.6 }: Props) {
  const angles = [15, 30, 45, 60, 75, 105, 120, 135, 150, 165, 195, 210, 225, 240, 255, 285, 300, 315, 330, 345];
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <circle cx="50" cy="50" r="34" />
      <circle cx="50" cy="50" r="4" fill="currentColor" />
      <g strokeWidth={1.8}>
        <line x1="50" y1="20" x2="50" y2="34" />
        <line x1="50" y1="80" x2="50" y2="66" />
        <line x1="20" y1="50" x2="34" y2="50" />
        <line x1="80" y1="50" x2="66" y2="50" />
        <line x1="29" y1="29" x2="39" y2="39" />
        <line x1="71" y1="71" x2="61" y2="61" />
        <line x1="29" y1="71" x2="39" y2="61" />
        <line x1="71" y1="29" x2="61" y2="39" />
        {angles.map((a) => (
          <line key={a} x1="50" y1="22" x2="50" y2="30" opacity={spokeOpacity} transform={`rotate(${a} 50 50)`} />
        ))}
      </g>
    </svg>
  );
}
```

- [ ] **Step 2: Tricolor strip**

`apps/web/components/Tricolor.tsx`:

```typescript
export function Tricolor() {
  return (
    <div style={{ height: 3, display: 'flex' }}>
      <span style={{ flex: 1, background: 'var(--color-saffron)' }} />
      <span style={{ flex: 1, background: 'var(--color-paper)', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }} />
      <span style={{ flex: 1, background: 'var(--color-green)' }} />
    </div>
  );
}
```

- [ ] **Step 3: Header component test**

`apps/web/components/Header.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Header } from './Header.js';

describe('Header', () => {
  it('renders the brand wordmark in English and Hindi', () => {
    render(<Header />);
    expect(screen.getByText('Downtime')).toBeInTheDocument();
    expect(screen.getByText('Bhavan')).toBeInTheDocument();
    expect(screen.getByText(/डाउनटाइम भवन/)).toBeInTheDocument();
  });

  it('renders the Sarkari Mode theme toggle', () => {
    render(<Header />);
    expect(screen.getByRole('button', { name: /Sarkari Mode/i })).toBeInTheDocument();
  });

  it('renders the nav with all expected links', () => {
    render(<Header />);
    ['Status', 'Janta Darbar', 'Leaderboard', 'Methodology', 'API'].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });
});
```

You'll need a Vitest setup file for happy-dom + testing-library. Create `vitest.config.ts` at repo root if not already:

`vitest.config.ts` (root):

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
});
```

`vitest.setup.ts` (root):

```typescript
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 4: Implement Header**

`apps/web/components/Header.tsx`:

```typescript
import { AshokaMark } from './AshokaMark.js';

export function Header() {
  return (
    <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-6 sticky top-0 z-50 px-7 py-3.5 bg-[var(--color-paper)] border-b border-[var(--color-border)]">
      <div className="flex items-center gap-3">
        <div className="w-[38px] h-[38px] rounded-full bg-[var(--color-blue)] flex items-center justify-center text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1),0_1px_2px_rgba(15,31,95,0.18)]">
          <AshokaMark size={28} />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-[17px] font-bold tracking-tight text-[var(--color-ink)]">
            Downtime <span className="text-[var(--color-blue)]">Bhavan</span>
          </span>
          <span className="text-xs font-medium text-[var(--color-ink-dim)] mt-0.5" style={{ fontFamily: 'var(--font-hi)' }}>
            डाउनटाइम भवन · An unofficial observatory
          </span>
        </div>
      </div>

      <nav className="flex gap-0.5 bg-[var(--color-paper-2)] p-1 rounded-full">
        {[
          { label: 'Status', active: true },
          { label: 'Janta Darbar' },
          { label: 'Leaderboard' },
          { label: 'Methodology' },
          { label: 'API' },
        ].map((item) => (
          <a key={item.label}
             className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all ${
               item.active
                 ? 'bg-[var(--color-paper)] text-[var(--color-blue)] shadow-[0_1px_2px_rgba(15,31,95,0.06)]'
                 : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
             }`}>
            {item.label}
          </a>
        ))}
      </nav>

      <div className="flex items-center justify-end gap-3.5">
        <span className="inline-flex items-center gap-2 text-xs font-medium text-[var(--color-ink-dim)]">
          <span className="w-[7px] h-[7px] rounded-full bg-[var(--color-green)] animate-pulse" />
          Live · Mumbai · <b className="text-[var(--color-ink)] font-semibold">14:32 IST</b>
        </span>
        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border-strong)] text-[12.5px] font-semibold text-[var(--color-ink-soft)] hover:bg-[var(--color-saffron-soft)] hover:border-[var(--color-saffron)] hover:text-[var(--color-saffron)] transition-all">
          <span>🇮🇳</span> Sarkari Mode
        </button>
      </div>
    </header>
  );
}
```

- [ ] **Step 5: Run tests**

```bash
npm -w @dtb/web test
```

Expected: 6 tests pass (3 status-derive + 3 Header).

- [ ] **Step 6: Commit**

```bash
git add apps/web/components vitest.config.ts vitest.setup.ts
git commit -m "feat(web): Header, AshokaMark, Tricolor components

Ports v6 markup to React. Sarkari Mode toggle is a stub (no theme switch
yet — that's Plan 2). Vitest+happy-dom configured."
```

---

## Task 13 — Sparkline + StatusItem components

**Files:**
- Create: `apps/web/components/Sparkline.tsx`, `apps/web/components/Sparkline.test.tsx`, `apps/web/components/StatusItem.tsx`

- [ ] **Step 1: Write Sparkline test**

`apps/web/components/Sparkline.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Sparkline } from './Sparkline.js';
import type { HourBucket } from '@/lib/status-derive';

const bucket = (state: HourBucket['state']): HourBucket => ({ hourStart: 0, state });

describe('Sparkline', () => {
  it('renders 24 bars', () => {
    const buckets = Array.from({ length: 24 }, () => bucket('working'));
    const { container } = render(<Sparkline buckets={buckets} />);
    expect(container.querySelectorAll('[data-bar]')).toHaveLength(24);
  });

  it('applies the correct class per state', () => {
    const buckets = [bucket('working'), bucket('degraded'), bucket('down'), bucket('unknown'), ...Array.from({ length: 20 }, () => bucket('working'))];
    const { container } = render(<Sparkline buckets={buckets} />);
    const bars = container.querySelectorAll('[data-bar]');
    expect(bars[0]!.getAttribute('data-state')).toBe('working');
    expect(bars[1]!.getAttribute('data-state')).toBe('degraded');
    expect(bars[2]!.getAttribute('data-state')).toBe('down');
    expect(bars[3]!.getAttribute('data-state')).toBe('unknown');
  });
});
```

- [ ] **Step 2: Implement Sparkline (uniform height, color-only)**

`apps/web/components/Sparkline.tsx`:

```typescript
import type { HourBucket } from '@/lib/status-derive';

const COLOR_BY_STATE: Record<HourBucket['state'], string> = {
  working: 'var(--color-spark-up)',
  degraded: 'var(--color-spark-degraded)',
  down: 'var(--color-spark-down)',
  unknown: 'var(--color-spark-track)',
};

const OPACITY_BY_STATE: Record<HourBucket['state'], number> = {
  working: 0.92,
  degraded: 0.88,
  down: 0.92,
  unknown: 1,
};

interface Props { buckets: HourBucket[]; }

export function Sparkline({ buckets }: Props) {
  return (
    <div className="mt-2.5 flex gap-[2px] items-center h-3.5">
      {buckets.map((b, i) => (
        <span
          key={i}
          data-bar
          data-state={b.state}
          style={{
            flex: 1,
            height: '100%',
            background: COLOR_BY_STATE[b.state],
            opacity: OPACITY_BY_STATE[b.state],
            borderRadius: 1.5,
          }}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Run Sparkline tests, confirm pass**

```bash
npm -w @dtb/web test
```

Expected: 8 tests pass total.

- [ ] **Step 4: Implement StatusItem**

`apps/web/components/StatusItem.tsx`:

```typescript
import { Sparkline } from './Sparkline.js';
import type { SiteStatusSnapshot } from '@dtb/shared';

const STAMP_TEXT: Record<SiteStatusSnapshot['currentState'], string> = {
  working: 'Working', degraded: 'Degraded', down: 'Down',
};

const COLOR_BY_STATE: Record<SiteStatusSnapshot['currentState'], string> = {
  working: 'var(--color-green)', degraded: 'var(--color-amber)', down: 'var(--color-red)',
};

const SOFT_BY_STATE: Record<SiteStatusSnapshot['currentState'], string> = {
  working: 'var(--color-green-soft)', degraded: 'var(--color-amber-soft)', down: 'var(--color-red-soft)',
};

interface Props { snapshot: SiteStatusSnapshot; }

export function StatusItem({ snapshot }: Props) {
  const { name, url, currentState, uptime30dPct, last24h } = snapshot;
  const color = COLOR_BY_STATE[currentState];
  const soft = SOFT_BY_STATE[currentState];
  const stamp = STAMP_TEXT[currentState];

  return (
    <article className="grid grid-cols-[14px_1fr_auto] gap-3 items-start px-7 py-4 border-b border-[var(--color-border)] cursor-pointer transition-colors hover:bg-[var(--color-paper-2)]">
      <span
        aria-label={`${stamp} status indicator`}
        className="w-2.5 h-2.5 rounded-full mt-1.5"
        style={{ background: color, boxShadow: `0 0 0 3px ${soft}` }}
      />
      <div className="min-w-0">
        <div className="text-sm font-semibold leading-tight tracking-tight">{name}</div>
        <div className="text-[11.5px] text-[var(--color-ink-faint)] mt-0.5 font-medium truncate">{url.replace(/^https?:\/\//, '')}</div>
        <Sparkline buckets={last24h} />
      </div>
      <div className="text-right shrink-0">
        <div className="text-lg font-bold tabular-nums leading-none tracking-tight" style={{ color }}>
          {uptime30dPct === null ? '—' : Math.round(uptime30dPct)}
          <sup className="text-[11px] font-semibold text-[var(--color-ink-faint)] align-[6px] ml-px">%</sup>
        </div>
        <div className="text-[9.5px] font-semibold text-[var(--color-ink-faint)] uppercase tracking-[0.12em] mt-1">30d</div>
        <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color }}>
          {stamp}
        </div>
      </div>
    </article>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/Sparkline.tsx apps/web/components/Sparkline.test.tsx apps/web/components/StatusItem.tsx
git commit -m "feat(web): Sparkline (uniform height, color-only) + StatusItem"
```

---

## Task 14 — DepartmentStatusPanel (Server Component fetching DB)

**Files:**
- Create: `apps/web/components/DepartmentStatusPanel.tsx`

- [ ] **Step 1: Implement the panel as an async Server Component**

`apps/web/components/DepartmentStatusPanel.tsx`:

```typescript
import { eq, desc } from 'drizzle-orm';
import { schema } from '@dtb/db';
import { getDb } from '@/lib/db';
import { buildLast24h } from '@/lib/status-derive';
import { StatusItem } from './StatusItem.js';
import type { SiteStatusSnapshot } from '@dtb/shared';

export async function DepartmentStatusPanel() {
  const db = getDb();
  const now = Date.now();
  const sites = db.select().from(schema.sites).where(eq(schema.sites.enabled, true)).all();

  const snapshots: SiteStatusSnapshot[] = sites.map((site) => {
    const status = db.select().from(schema.siteStatus).where(eq(schema.siteStatus.siteId, site.id)).get();
    const checks = db.select().from(schema.checks)
      .where(eq(schema.checks.siteId, site.id))
      .orderBy(desc(schema.checks.checkedAt))
      .all()
      .filter((r) => r.checkedAt >= now - 24 * 60 * 60 * 1000);
    return {
      siteId: site.id,
      name: site.name,
      url: site.url,
      currentState: status?.currentState ?? 'working',
      stateSince: status?.stateSince ?? now,
      uptime30dPct: status?.uptime30dPct ?? null,
      lastCheckAt: status?.lastCheckAt ?? now,
      communityFlag: status?.communityFlag ?? false,
      last24h: buildLast24h(checks.map((r) => ({ checkedAt: r.checkedAt, result: r.result })), now),
    };
  });

  const counts = {
    down: snapshots.filter((s) => s.currentState === 'down').length,
    degraded: snapshots.filter((s) => s.currentState === 'degraded').length,
    working: snapshots.filter((s) => s.currentState === 'working').length,
  };

  return (
    <section className="col col-side border-r border-[var(--color-border)] bg-[var(--color-bg)] relative overflow-hidden">
      <div className="px-7 pt-6 pb-4 border-b border-[var(--color-border)] bg-[var(--color-paper)]">
        <span className="block text-[10.5px] font-semibold text-[var(--color-ink-faint)] tracking-[0.18em] uppercase">
          {snapshots.length} Departments · Mumbai checkpoint
        </span>
        <h2 className="mt-1 text-lg font-bold tracking-tight flex items-baseline gap-2.5">
          Department Status
          <span className="text-sm text-[var(--color-blue)] font-medium" style={{ fontFamily: 'var(--font-hi)' }}>विभाग स्थिति</span>
        </h2>
        <span className="text-xs text-[var(--color-ink-dim)] mt-0.5">Refreshed every 2 minutes</span>

        <div className="flex gap-3.5 mt-2.5 flex-wrap text-[12.5px] text-[var(--color-ink-soft)] font-semibold">
          <Count label="Unreachable" value={counts.down} color="var(--color-red)" soft="var(--color-red-soft)" />
          <Count label="Degraded" value={counts.degraded} color="var(--color-amber)" soft="var(--color-amber-soft)" />
          <Count label="Working" value={counts.working} color="var(--color-green)" soft="var(--color-green-soft)" />
        </div>

        <div className="flex gap-3.5 mt-3.5 pt-3.5 border-t border-dashed border-[var(--color-border)] text-[11.5px] text-[var(--color-ink-faint)] font-medium">
          <a className="cursor-pointer pb-1 border-b border-[var(--color-blue)] text-[var(--color-blue)]">Worst first</a>
          <a className="cursor-pointer pb-1 border-b border-transparent">A–Z</a>
          <a className="cursor-pointer pb-1 border-b border-transparent">Reports</a>
        </div>
      </div>

      <div className="bg-[var(--color-paper)]">
        {snapshots.map((s) => <StatusItem key={s.siteId} snapshot={s} />)}
      </div>

      <div className="px-7 py-3.5 text-center text-[11.5px] text-[var(--color-blue)] font-semibold cursor-pointer bg-[var(--color-paper)] border-t border-[var(--color-border)] hover:bg-[var(--color-blue-soft)]">
        View all {snapshots.length} departments →
      </div>
    </section>
  );
}

function Count({ label, value, color, soft }: { label: string; value: number; color: string; soft: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 leading-none">
      <span className="w-[7px] h-[7px] rounded-full" style={{ background: color, boxShadow: `0 0 0 3px ${soft}` }} />
      <b className="font-bold" style={{ color }}>{value}</b> {label}
    </span>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/DepartmentStatusPanel.tsx
git commit -m "feat(web): DepartmentStatusPanel server component

Reads sites + status + 24h checks from DB on each request (no cache).
Header includes the unreachable/degraded/working dot-row from spec §4."
```

---

## Task 15 — NotifyHero (static for walking skeleton)

**Files:**
- Create: `apps/web/components/NotifyHero.tsx`

> This task wires up the *visual* hero. The submit handler is a no-op for now. Plan 3 will replace it with the real WhatsApp OTP flow.

- [ ] **Step 1: Implement the hero**

`apps/web/components/NotifyHero.tsx`:

```typescript
'use client';

import { useEffect, useRef } from 'react';

export function NotifyHero() {
  const fieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape' && document.activeElement === fieldRef.current) {
        fieldRef.current?.blur();
      }
    }
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, []);

  return (
    <section className="col center relative bg-[var(--color-bg)] flex flex-col overflow-hidden">
      <div className="max-w-[760px] mx-auto px-14 pt-20 pb-16 text-center relative z-10">
        <div className="inline-flex items-center gap-2.5 text-xs font-semibold text-[var(--color-ink-dim)] mb-6">
          <span className="w-7 h-px bg-[var(--color-border-strong)]" />
          <span>
            <span className="text-[var(--color-blue)] font-semibold" style={{ fontFamily: 'var(--font-hi)' }}>सूचना सेवा</span>
            {' · Citizen Alert Service'}
          </span>
          <span className="w-7 h-px bg-[var(--color-border-strong)]" />
        </div>

        <h1 className="text-[clamp(38px,4.6vw,60px)] font-bold tracking-tight leading-[1.05] text-[var(--color-ink)]">
          Don't worry.<br />
          We'll <em className="text-[var(--color-blue)] font-semibold" style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>notify you</em> when your<br />
          <span className="italic font-medium text-[var(--color-saffron)] border-b-2 border-[var(--color-saffron-soft)] pb-px" style={{ fontFamily: 'var(--font-serif)' }}>Sarkari site</span>{' '}
          will come up.
        </h1>

        <p className="mt-5 text-base font-medium text-[var(--color-ink-dim)] leading-snug max-w-[540px] mx-auto">
          Get a free WhatsApp alert the moment any of India's <b className="text-[var(--color-ink)] font-semibold">12 most-used government websites</b> starts working again. One OTP, max <b className="text-[var(--color-ink)] font-semibold">5 active alerts</b> per number, no spam, no signup.
        </p>

        <form className="notify-form mt-10 bg-[var(--color-paper)] border border-[var(--color-border-strong)] rounded-2xl px-5.5 pl-5 py-2 flex items-center gap-2.5 shadow-[0_8px_24px_-12px_rgba(15,31,95,0.15),_0_2px_6px_-2px_rgba(15,31,95,0.08)]"
              onSubmit={(e) => { e.preventDefault(); console.log('TODO: notify flow in Plan 3'); }}>
          <span className="text-base text-[var(--color-ink-dim)] font-medium whitespace-nowrap pl-3">Notify me when</span>
          <input
            ref={fieldRef}
            className="flex-1 border-0 outline-0 bg-transparent text-base font-medium py-3.5 min-w-0 text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)]"
            placeholder="the Aadhaar update portal starts working"
          />
          <button className="bg-[var(--color-blue)] text-white border-0 px-5 py-3 rounded-[9px] text-[13.5px] font-bold inline-flex items-center gap-2 transition-all hover:bg-[var(--color-blue-deep)]">
            Set alert
          </button>
        </form>

        <div className="mt-3 text-xs text-[var(--color-ink-faint)] flex items-center justify-center gap-3">
          {['WhatsApp delivery', 'One-time OTP', 'No signup', 'Free, always'].map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="w-3 h-3 text-[var(--color-green)]"><polyline points="20 6 9 17 4 12" /></svg>
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/NotifyHero.tsx
git commit -m "feat(web): NotifyHero (visuals only, no submit handler)

Hero copy locked per spec §4. Form submission is a console.log stub
until Plan 3 (WhatsApp OTP). Focus-mode collapse handled by globals.css
:has() rule + .notify-form class."
```

---

## Task 16 — JantaDarbarPanel (static stub)

**Files:**
- Create: `apps/web/components/JantaDarbarPanel.tsx`

- [ ] **Step 1: Static stub with 3 sample posts**

`apps/web/components/JantaDarbarPanel.tsx`:

```typescript
const POSTS = [
  { site: 'Aadhaar', state: 'degraded', tag: 'otp-not-coming', body: 'tried 6 times. office wala bola "kal aana"', time: '12s ago', reactions: { angry: 24, same: 89 } },
  { site: 'GST',     state: 'down',     tag: 'error-5xx',      body: 'my CA is crying. filing deadline Friday.',  time: '34s ago', reactions: { sad: 156, same: 412 } },
  { site: 'EPFO',    state: 'down',     tag: 'blank-page',     body: '23 hours of darkness. epfo we miss you.',    time: '1m ago',  reactions: { laugh: 87, same: 203 } },
] as const;

const DOT_COLOR: Record<string, string> = { down: 'var(--color-red)', degraded: 'var(--color-amber)', working: 'var(--color-green)' };

export function JantaDarbarPanel() {
  return (
    <section className="col col-side bg-[var(--color-paper)] border-r-0">
      <div className="px-7 pt-6 pb-4 border-b border-[var(--color-border)]">
        <span className="block text-[10.5px] font-semibold text-[var(--color-ink-faint)] tracking-[0.18em] uppercase">
          Coming in Plan 4 · Live grievances
        </span>
        <h2 className="mt-1 text-lg font-bold tracking-tight flex items-baseline gap-2.5">
          Janta Darbar
          <span className="text-sm text-[var(--color-blue)] font-medium" style={{ fontFamily: 'var(--font-hi)' }}>जनता दरबार</span>
        </h2>
        <span className="text-xs text-[var(--color-ink-dim)] mt-0.5">The people's court of broken portals</span>
      </div>

      <div>
        {POSTS.map((p, i) => (
          <article key={i} className="px-7 py-4 border-b border-[var(--color-border)] cursor-pointer hover:bg-[var(--color-paper-2)] transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: DOT_COLOR[p.state] }} />
                {p.site}
                <span className="text-[var(--color-ink-faint)] font-medium text-[11px] ml-1">· {p.tag}</span>
              </span>
              <span className="text-[11px] text-[var(--color-ink-faint)] font-medium">{p.time}</span>
            </div>
            <div className="text-sm font-medium leading-snug">{p.body}</div>
          </article>
        ))}
      </div>

      <div className="sticky bottom-0 bg-[var(--color-paper)] border-t border-[var(--color-border)] px-7 py-3.5 text-center">
        <button className="bg-[var(--color-blue)] text-white border-0 px-4.5 py-3.5 rounded-[11px] text-[13px] font-bold w-full inline-flex items-center justify-center gap-2.5 shadow-[0_4px_12px_-4px_rgba(30,58,138,0.4),_inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-[var(--color-blue-deep)] transition-all" disabled>
          + File a grievance
          <span className="bg-white/20 text-white px-1.5 py-0.5 rounded-full text-[10.5px] font-bold tracking-wide ml-1">coming soon</span>
        </button>
        <div className="mt-2 text-[11px] text-[var(--color-ink-faint)] font-medium">
          <span className="text-[var(--color-ink-soft)] font-semibold" style={{ fontFamily: 'var(--font-hi)' }}>शिकायत दर्ज करें</span> · live in Plan 4
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/JantaDarbarPanel.tsx
git commit -m "feat(web): JantaDarbarPanel static stub

Placeholder for the live grievance stream. CTA disabled — full feed and
submission arrive in Plan 4."
```

---

## Task 17 — Homepage assembly + footer

**Files:**
- Modify: `apps/web/app/page.tsx`

- [ ] **Step 1: Replace placeholder page with the real 3-column layout**

`apps/web/app/page.tsx`:

```typescript
import { Header } from '@/components/Header';
import { Tricolor } from '@/components/Tricolor';
import { DepartmentStatusPanel } from '@/components/DepartmentStatusPanel';
import { NotifyHero } from '@/components/NotifyHero';
import { JantaDarbarPanel } from '@/components/JantaDarbarPanel';

export const dynamic = 'force-dynamic';

export default async function Page() {
  return (
    <>
      <Header />
      <Tricolor />
      <main className="layout min-h-[calc(100vh-80px)]">
        <DepartmentStatusPanel />
        <NotifyHero />
        <JantaDarbarPanel />
      </main>
      <footer className="border-t border-[var(--color-border)] bg-[var(--color-paper)] px-7 py-4 flex justify-between items-center text-[11.5px] text-[var(--color-ink-faint)] font-medium">
        <div>
          <span className="text-[var(--color-saffron)] font-bold tracking-[0.08em] uppercase text-[10.5px]">◆ Unofficial Observatory ◆</span>
          &nbsp;&nbsp;
          <b className="text-[var(--color-ink-soft)] font-bold">Downtime Bhavan</b> · Not affiliated with any government body · Data from Mumbai · Refreshed every 2 min
        </div>
        <div className="flex gap-4.5">
          <a className="hover:text-[var(--color-blue)] cursor-pointer">Methodology</a>
          <a className="hover:text-[var(--color-blue)] cursor-pointer">API</a>
          <a className="hover:text-[var(--color-blue)] cursor-pointer">Press</a>
          <a className="hover:text-[var(--color-blue)] cursor-pointer">Contact</a>
        </div>
      </footer>
    </>
  );
}
```

- [ ] **Step 2: Run the whole thing**

```bash
# Terminal 1
npm run dev:monitor

# Terminal 2  (wait until monitor has ticked at least once)
npm run dev:web
```

Visit `http://localhost:3000`. Expected:
- Header with Ashoka mark, "Downtime Bhavan / डाउनटाइम भवन"
- Tricolor strip
- Left panel: "Department Status · विभाग स्थिति", one item (Aadhaar), with sparkline + uptime %
- Center: hero copy "Don't worry. We'll *notify you* when your *Sarkari site* will come up." + form
- Right panel: Janta Darbar stub
- Footer

Click the notify input. Both side panels collapse smoothly (~380ms). Press Esc — they return.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/page.tsx
git commit -m "feat(web): assemble homepage with 3-col layout + footer

End of walking skeleton: real DB-backed status displayed in v6 design.
Focus-mode interaction verified working via :has(.notify-form:focus-within)."
```

---

## Task 18 — E2E smoke test + dev script + tag v0.1.0

**Files:**
- Create: `playwright.config.ts` (root), `apps/web/e2e/homepage.spec.ts`

- [ ] **Step 1: Playwright config**

`playwright.config.ts`:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './apps/web/e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
  },
  webServer: {
    command: 'npm run dev:web',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
```

- [ ] **Step 2: Smoke test**

`apps/web/e2e/homepage.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test('homepage renders the 3-column layout with real status data', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Department Status/ })).toBeVisible();
  await expect(page.getByText(/Aadhaar/)).toBeVisible();
  await expect(page.getByText(/Don't worry/)).toBeVisible();
  await expect(page.getByText(/Janta Darbar/)).toBeVisible();
  await expect(page.getByText(/Unofficial Observatory/)).toBeVisible();
});

test('focus mode: clicking notify input collapses side panels', async ({ page }) => {
  await page.goto('/');
  const leftPanel = page.locator('section.col-side').first();
  await expect(leftPanel).toBeVisible();

  const initialBox = await leftPanel.boundingBox();
  expect(initialBox).not.toBeNull();
  expect(initialBox!.width).toBeGreaterThan(100);

  await page.getByPlaceholder(/Aadhaar update portal/).click();
  await page.waitForTimeout(500); // wait for transition

  const collapsedBox = await leftPanel.boundingBox();
  // Either 0-width or hidden — both indicate focus mode active.
  expect(collapsedBox === null || collapsedBox.width < 5).toBeTruthy();

  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  const restoredBox = await leftPanel.boundingBox();
  expect(restoredBox!.width).toBeGreaterThan(100);
});
```

- [ ] **Step 3: Run e2e**

```bash
# Make sure monitor has run at least once so there's data
npm run db:migrate
npm run db:seed
DTB_TICK_MS=5000 timeout 8 npm run dev:monitor || true   # quick boot, write some data
npx playwright install --with-deps chromium
npm run test:e2e
```

Expected: both tests pass. (The collapse test may need a small `waitForTimeout` adjustment depending on machine speed.)

- [ ] **Step 4: Wire up the concurrent `dev` script (already in root package.json)**

Verify by running it:

```bash
npm run dev
# Ctrl+C after you confirm both monitor and web are running and homepage loads.
```

- [ ] **Step 5: Bump version and tag**

```bash
npm version 0.1.0-walking-skeleton --no-git-tag-version
git add package.json package-lock.json
git commit -m "release: v0.1.0-walking-skeleton

End-to-end vertical slice working:
- Monitor probes Aadhaar SSUP every 2 min
- HTTP check, state machine, DB persistence
- Homepage renders v6 design from real DB data
- Focus-mode interaction verified by e2e

Next: Plan 2 — expand to 12 sites + headless layer-2 checks."
git tag v0.1.0-walking-skeleton
```

- [ ] **Step 6: Manual smoke test**

```bash
npm run dev
```

Open http://localhost:3000. Verify the whole UI works as designed (per v6 mockup). Verify status data is real (monitor terminal shows tick logs). Verify focus mode. Verify uptime % is `—` (since not 30 days of data) but the sparkline shows the latest hour.

**Done with Plan 1.** Plan 2 expands this to all 12 sites + headless validation layer.

---

## Self-Review

**Spec coverage:**

| Spec section | Covered in this plan? |
|---|---|
| §2 V1 scope — Status tracker | ✅ partial (1 site, HTTP only — Plan 2 expands) |
| §2 V1 scope — Notify-me | ⏭ stub UI only; Plan 3 |
| §2 V1 scope — Janta Darbar | ⏭ stub UI only; Plan 4 |
| §2 V1 scope — Public uptime stats | ✅ 30d % + 24h sparkline |
| §2 V1 scope — Sarkari Mode toggle | ⏭ button visible, no theme switch yet (Plan 5) |
| §2 V1 scope — Donations | ⏭ Plan 5 |
| §4 Brand/visual | ✅ design tokens + components from v6 |
| §5 Detection — HTTP layer | ✅ |
| §5 Detection — Headless layer | ⏭ Plan 2 |
| §5 Detection — Community signal | ⏭ Plan 4 |
| §5 State machine | ✅ pure function + 7 unit tests |
| §6 Notify-me | ⏭ Plan 3 |
| §7 Janta Darbar | ⏭ Plan 4 |
| §8 Tech stack — VPS | ⏭ Plan 6 (local dev only here) |
| §8 Data model — sites/checks/site_status | ✅ |
| §8 Data model — subscriptions/grievances/etc. | ⏭ Plan 3-5 |
| §10 Privacy / `/privacy` etc. | ⏭ Plan 5 |
| §12 V1 prereqs | ⏭ user-side (parallel) |

No spec requirements that belong in walking skeleton are uncovered.

**Placeholder scan:**

No "TBD," no "TODO," no "implement later." Every code step has the actual code. Every command has the expected output. The `console.log('TODO: notify flow in Plan 3')` in Task 15 is *intentional* (the form submit is explicitly a stub until Plan 3) and is called out plainly in the task description, not hiding a real gap.

**Type consistency:**

- `SiteState` used identically across `shared/types.ts`, `monitor/state-machine.ts`, `db/schema.ts` (as text enum), and `web/components/StatusItem.tsx`.
- `CheckResult` is the contract used by `checkHttp`'s return type, `deriveNextState`'s input, and `runOneTick`'s persistence.
- `SiteStatusSnapshot` is what the API route returns and what `StatusItem` consumes — single source of truth in `shared/`.
- `buildLast24h` returns `HourBucket[]`; `Sparkline` consumes `HourBucket[]`. Match.

No inconsistencies found.

**Ambiguity check:**

- "Run the seed CLI" — explicit `npm -w @dtb/db run seed` command shown.
- "Verify with sqlite" — exact `sqlite-utils` command given.
- "Expected" output is stated for every command that has visible output.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-28-walking-skeleton.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration with clean context per task. Best when the plan is long (this one is 18 tasks) and you want me to maintain quality oversight without my context filling up.

**2. Inline Execution** — Execute tasks in this session using executing-plans. Batched execution with checkpoints for your review. Best if you want to watch the code go in live and chat about details as we build.

**Which approach?**
