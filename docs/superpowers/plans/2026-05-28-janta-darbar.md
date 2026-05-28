# Plan 3 — Janta Darbar Live

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Take the homepage right panel from static stub to a real, live grievance system. Citizens click "File a grievance," submit a captcha-verified report against any monitored site, and the grievance appears in everyone's feed within seconds via Server-Sent Events. Reactions and community-report-driven hiding work end-to-end. The community-flag → site_status.degraded path lights up when enough grievances pile up.

**Architecture:**
- Two new DB tables (`grievances`, `reactions`) added as an additive migration. The schema already has `community_flag` on `site_status` — Plan 3 just turns it on.
- All grievance APIs live in `apps/web/app/api/grievance/`. SSE stream broadcasts via an in-process `EventEmitter` singleton — fine for V1 single-VM Fly.io deployment.
- The monitor process gets a new sub-job: every 60 seconds, recompute `community_flag` for each site based on a rolling 10-minute grievance count.
- Cloudflare Turnstile in dev uses Cloudflare's documented always-pass test keys, so no Cloudflare account is needed until production deploy.

**Tech Stack:** Same as Plan 1. New additions:
- `eventsource` polyfill (only for Vitest tests; browsers ship native `EventSource`)
- Cloudflare Turnstile (test sitekey `1x00000000000000000000AA` / secret `1x0000000000000000000000000000000AA` for dev)

**Builds on:** `v0.1.0-walking-skeleton` (commit `35a2f79`). Plan 1 must be complete.

**Reference:** `docs/superpowers/specs/2026-05-28-downtime-bhavan-design.md` §7 (Janta Darbar)

---

## File structure (additions only)

```
downtime-bhavan/
├── apps/
│   └── web/
│       ├── app/
│       │   └── api/
│       │       └── grievance/
│       │           ├── route.ts                    # POST  /api/grievance
│       │           ├── stream/route.ts             # GET   /api/grievance/stream (SSE)
│       │           ├── recent/route.ts             # GET   /api/grievance/recent (initial-load JSON)
│       │           └── [id]/
│       │               ├── react/route.ts          # POST  /api/grievance/[id]/react
│       │               └── report/route.ts         # POST  /api/grievance/[id]/report
│       ├── components/
│       │   ├── GrievanceForm.tsx                   # NEW   submission modal (client)
│       │   ├── GrievancePost.tsx                   # NEW   single post (client; reaction state)
│       │   ├── GrievanceStream.tsx                 # NEW   client wrapper: initial fetch + SSE subscribe
│       │   ├── ReactionPill.tsx                    # NEW   reaction button with optimistic update
│       │   └── JantaDarbarPanel.tsx                # MODIFY now thin wrapper around GrievanceStream
│       └── lib/
│           ├── grievance-bus.ts                    # NEW   in-process EventEmitter singleton
│           ├── grievance-filter.ts                 # NEW   banned-word filter (pure)
│           ├── grievance-filter.test.ts            # NEW
│           ├── rate-limit.ts                       # NEW   DB-backed IP rate limit
│           ├── rate-limit.test.ts                  # NEW
│           ├── turnstile.ts                        # NEW   server-side verify
│           └── ip.ts                               # NEW   extract+hash client IP from headers
├── packages/
│   ├── db/
│   │   ├── src/
│   │   │   └── schema.ts                           # MODIFY add grievances, reactions, rate_limit_attempts
│   │   └── migrations/
│   │       └── 0001_<auto>.sql                     # auto-generated additive migration
│   └── monitor/
│       └── src/
│           ├── community-flag.ts                   # NEW   rolling-count → site_status.community_flag
│           ├── community-flag.test.ts              # NEW
│           └── index.ts                            # MODIFY add a parallel community-flag interval
├── config/
│   └── banned-words.json                           # NEW   editable banned-word list (English + Hinglish)
└── .env.example                                    # NEW   document required env vars
```

**Each file does one thing:**
- `grievance-bus.ts` — single source of grievance events for the SSE stream. `emit('new', grievance)` from submit handlers, `subscribe()` from SSE route. Pure pub-sub, no DB.
- `grievance-filter.ts` — `filterGrievance(text) → { ok, reason }`. Pure function: banned words, length, repeated-chars spam pattern. No I/O.
- `rate-limit.ts` — `checkRateLimit(db, ipHash, action) → { allowed, retryAfterMs }`. DB-backed sliding window. One per action (`grievance:submit`, `grievance:react`, `grievance:report`).
- `turnstile.ts` — `verifyTurnstile(token, ip) → boolean`. Hits Cloudflare's verify endpoint server-side.
- `ip.ts` — `getClientIpHash(request) → string`. Reads `cf-connecting-ip` or `x-forwarded-for` (depending on host), hashes with pepper.
- `community-flag.ts` — `recomputeCommunityFlags(db) → void`. Reads recent grievances, updates `site_status.community_flag`.

---

## Task 1 — DB schema additions

**Files:**
- Modify: `packages/db/src/schema.ts`
- Create: `packages/db/migrations/0001_<auto>.sql` (auto-generated)

- [ ] **Step 1: Extend the schema**

In `packages/db/src/schema.ts`, after the existing `siteStatus` table definition, add:

```typescript
/**
 * Citizen grievances — the Janta Darbar feed.
 * Append-only from API; `visible` and `reportsCount` are mutated by moderation.
 */
export const grievances = sqliteTable(
  'grievances',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    siteId: text('site_id').notNull().references(() => sites.id),
    tag: text('tag', {
      enum: [
        'otp-not-coming', 'error-5xx', 'blank-page',
        'slow', 'login-failed', 'payment-failed', 'other',
      ],
    }).notNull(),
    body: text('body').notNull(),               // ≤140 chars, enforced at API layer
    ipHash: text('ip_hash').notNull(),
    createdAt: integer('created_at').notNull(),
    visible: integer('visible', { mode: 'boolean' }).notNull().default(true),
    reportsCount: integer('reports_count').notNull().default(0),
  },
  (t) => ({
    siteTimeIdx: index('idx_grievances_site_time').on(t.siteId, t.createdAt),
    recentIdx: index('idx_grievances_recent').on(t.createdAt),
  }),
);

/**
 * Reactions on grievances. PK is (grievance_id, ip_hash, kind) so the same
 * IP can react once per kind per grievance — toggle by re-clicking (deletes the row).
 */
export const reactions = sqliteTable(
  'reactions',
  {
    grievanceId: integer('grievance_id').notNull().references(() => grievances.id),
    ipHash: text('ip_hash').notNull(),
    kind: text('kind', { enum: ['angry', 'sad', 'laugh', 'same'] }).notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.grievanceId, t.ipHash, t.kind] }),
  }),
);

/**
 * Sliding-window rate limit. One row per (action, ip_hash, slot_minute).
 * Keeps a count per minute; expired slots can be pruned by a periodic job
 * (V1: not pruned — small data, single user model).
 */
export const rateLimitAttempts = sqliteTable(
  'rate_limit_attempts',
  {
    action: text('action').notNull(),          // 'grievance:submit', 'grievance:react', etc.
    ipHash: text('ip_hash').notNull(),
    slotMinute: integer('slot_minute').notNull(),  // floor(epoch_ms / 60_000)
    count: integer('count').notNull().default(0),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.action, t.ipHash, t.slotMinute] }),
  }),
);
```

Add `primaryKey` to the existing import line at top of file:

```typescript
import { sqliteTable, text, integer, real, index, primaryKey } from 'drizzle-orm/sqlite-core';
```

- [ ] **Step 2: Generate the additive migration**

```bash
npm -w @dtb/db run migrate:generate
```

Expected: new file `packages/db/migrations/0001_<some-name>.sql` containing `CREATE TABLE grievances ...`, `CREATE TABLE reactions ...`, `CREATE TABLE rate_limit_attempts ...`, and their indexes.

- [ ] **Step 3: Apply migration**

```bash
npm run db:migrate
```

Expected: `✓ Migrated /Users/woofwoof/Desktop/govt-website-tracker/data/dtb.sqlite`. Verify:

```bash
sqlite3 data/dtb.sqlite ".schema grievances"
sqlite3 data/dtb.sqlite ".schema reactions"
sqlite3 data/dtb.sqlite ".schema rate_limit_attempts"
```

All 3 should print non-empty schemas.

- [ ] **Step 4: Update the schema sanity test**

In `packages/db/tests/schema.test.ts`, after the existing test, add:

```typescript
  it('can insert a grievance, a reaction, and a rate-limit row', () => {
    const db = createDb(':memory:');
    const sqlite = (db as any).$client as import('better-sqlite3').Database;
    sqlite.exec(`
      CREATE TABLE sites (id TEXT PRIMARY KEY, name TEXT, url TEXT, config_json TEXT, enabled INTEGER DEFAULT 1);
      CREATE TABLE grievances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        site_id TEXT, tag TEXT, body TEXT, ip_hash TEXT, created_at INTEGER,
        visible INTEGER DEFAULT 1, reports_count INTEGER DEFAULT 0
      );
      CREATE TABLE reactions (
        grievance_id INTEGER, ip_hash TEXT, kind TEXT, created_at INTEGER,
        PRIMARY KEY (grievance_id, ip_hash, kind)
      );
      CREATE TABLE rate_limit_attempts (
        action TEXT, ip_hash TEXT, slot_minute INTEGER, count INTEGER,
        PRIMARY KEY (action, ip_hash, slot_minute)
      );
    `);

    db.insert(schema.sites).values({ id: 's', name: 'S', url: 'https://s', configJson: '{}', enabled: true }).run();

    db.insert(schema.grievances).values({
      siteId: 's', tag: 'otp-not-coming', body: 'never came',
      ipHash: 'abc', createdAt: 1, visible: true, reportsCount: 0,
    }).run();
    const gs = db.select().from(schema.grievances).all();
    expect(gs).toHaveLength(1);

    db.insert(schema.reactions).values({
      grievanceId: gs[0]!.id, ipHash: 'abc', kind: 'angry', createdAt: 1,
    }).run();
    expect(db.select().from(schema.reactions).all()).toHaveLength(1);

    db.insert(schema.rateLimitAttempts).values({
      action: 'grievance:submit', ipHash: 'abc', slotMinute: 100, count: 1,
    }).run();
    expect(db.select().from(schema.rateLimitAttempts).all()).toHaveLength(1);
  });
```

Run tests:

```bash
npm -w @dtb/db test
```

Expected: 2 schema tests pass (1 existing + 1 new) plus the 3 seed tests = 5 total.

- [ ] **Step 5: Commit**

```bash
git add packages/db
git commit -m "feat(db): add grievances, reactions, rate_limit_attempts tables

Additive 0001 migration. Grievances are append-only with soft-delete via
visible flag; reactions are composite-PK so each IP can toggle a single
reaction per kind per grievance; rate_limit_attempts is a per-minute
sliding-window counter keyed by (action, ip_hash, slot_minute)."
```

---

## Task 2 — Banned-word filter (pure, TDD)

**Files:**
- Create: `config/banned-words.json`, `apps/web/lib/grievance-filter.ts`, `apps/web/lib/grievance-filter.test.ts`

- [ ] **Step 1: Banned-word list**

`config/banned-words.json`:

```json
{
  "version": 1,
  "english": [
    "fuck", "shit", "bitch", "asshole", "cunt", "dick",
    "nigger", "faggot", "retard"
  ],
  "hinglish": [
    "chutiya", "bhenchod", "madarchod", "behenchod", "mc", "bc",
    "randi", "gandu", "lund", "chut", "gaand"
  ],
  "communal": [
    "katua", "pajeet", "mulla", "khatmal", "musalla"
  ],
  "spam": [
    "click here", "buy now", "free crypto", "telegram channel",
    "join my", "dm me"
  ]
}
```

NOTE: this list is non-exhaustive. It's a starting point and will be refined when real users start submitting. The communal slurs section is included because Indian-context grievance feeds attract these — they ship hidden, not in user-visible UI.

- [ ] **Step 2: Failing tests (TDD)**

`apps/web/lib/grievance-filter.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { filterGrievance } from './grievance-filter.js';

describe('filterGrievance', () => {
  it('passes a clean grievance', () => {
    expect(filterGrievance('OTP not coming since morning')).toEqual({ ok: true });
  });

  it('rejects empty input', () => {
    expect(filterGrievance('')).toEqual({ ok: false, reason: 'empty' });
    expect(filterGrievance('   ')).toEqual({ ok: false, reason: 'empty' });
  });

  it('rejects text over 140 chars', () => {
    const long = 'a'.repeat(141);
    expect(filterGrievance(long)).toEqual({ ok: false, reason: 'too_long' });
  });

  it('rejects English profanity (case-insensitive, whole-word)', () => {
    expect(filterGrievance('this is shit')).toEqual({ ok: false, reason: 'banned_word' });
    expect(filterGrievance('SHIT')).toEqual({ ok: false, reason: 'banned_word' });
  });

  it('rejects Hinglish abuse', () => {
    expect(filterGrievance('mc kya kar raha hai')).toEqual({ ok: false, reason: 'banned_word' });
    expect(filterGrievance('bhenchod portal')).toEqual({ ok: false, reason: 'banned_word' });
  });

  it('does NOT trigger false positives on word fragments', () => {
    // "as" appears inside "case", not a whole word match
    expect(filterGrievance('class started late')).toEqual({ ok: true });
    expect(filterGrievance('bcoz of the deadline')).toEqual({ ok: true });
  });

  it('detects spam patterns like "click here"', () => {
    expect(filterGrievance('click here for free crypto')).toEqual({ ok: false, reason: 'spam' });
  });

  it('rejects repeated-character spam (aaaaaaa)', () => {
    expect(filterGrievance('aaaaaaaaaaaaaa')).toEqual({ ok: false, reason: 'spam' });
  });
});
```

- [ ] **Step 3: Run, watch fail**

```bash
npm test
```

Expected: 8 grievance-filter tests fail. All previous tests still pass.

- [ ] **Step 4: Implement**

`apps/web/lib/grievance-filter.ts`:

```typescript
import bannedWordsJson from '../../../config/banned-words.json' with { type: 'json' };

const ALL_BANNED: string[] = [
  ...bannedWordsJson.english,
  ...bannedWordsJson.hinglish,
  ...bannedWordsJson.communal,
];
const SPAM_PHRASES: string[] = bannedWordsJson.spam;

const REPEATED_CHARS = /(.)\1{6,}/i; // 7+ of the same char in a row

export type FilterReason =
  | 'empty'
  | 'too_long'
  | 'banned_word'
  | 'spam';

export interface FilterResult {
  ok: boolean;
  reason?: FilterReason;
}

/**
 * Pure function: classify whether a grievance body is acceptable.
 * No I/O, no async, no DB. Caller persists if `ok === true`.
 */
export function filterGrievance(rawBody: string): FilterResult {
  const body = rawBody.trim();
  if (body.length === 0) return { ok: false, reason: 'empty' };
  if (body.length > 140) return { ok: false, reason: 'too_long' };

  const lower = body.toLowerCase();
  for (const phrase of SPAM_PHRASES) {
    if (lower.includes(phrase)) return { ok: false, reason: 'spam' };
  }
  if (REPEATED_CHARS.test(body)) return { ok: false, reason: 'spam' };

  // Whole-word ban check: split on non-word characters
  const tokens = lower.split(/[^a-z0-9]+/).filter(Boolean);
  const banned = new Set(ALL_BANNED.map((w) => w.toLowerCase()));
  for (const t of tokens) {
    if (banned.has(t)) return { ok: false, reason: 'banned_word' };
  }
  return { ok: true };
}
```

- [ ] **Step 5: Tests pass**

```bash
npm test
```

Expected: 8 new tests pass. Total test count grows by 8.

- [ ] **Step 6: Commit**

```bash
git add config/banned-words.json apps/web/lib/grievance-filter.ts apps/web/lib/grievance-filter.test.ts
git commit -m "feat(web): pure grievance content filter

Whole-word ban list (English + Hinglish + communal slurs + spam phrases),
length check (≤140), repeated-character spam pattern. Pure function — no
DB, no I/O. List lives in config/banned-words.json so it can be tuned
without redeployment."
```

---

## Task 3 — Client IP extraction + DB-backed rate limit

**Files:**
- Create: `apps/web/lib/ip.ts`, `apps/web/lib/rate-limit.ts`, `apps/web/lib/rate-limit.test.ts`

- [ ] **Step 1: IP extraction helper**

`apps/web/lib/ip.ts`:

```typescript
import { createHash } from 'node:crypto';

const PEPPER = process.env.DTB_IP_PEPPER ?? 'dev-only-pepper-replace-in-prod';

/**
 * Read the client IP from upstream headers, in priority order:
 *   1. cf-connecting-ip (Cloudflare)
 *   2. fly-client-ip (Fly.io)
 *   3. x-forwarded-for (first hop)
 *   4. x-real-ip
 *
 * Hash with a server-side pepper before returning so the raw IP never
 * touches our DB or logs.
 */
export function getClientIpHash(headers: Headers): string {
  const raw =
    headers.get('cf-connecting-ip') ??
    headers.get('fly-client-ip') ??
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headers.get('x-real-ip') ??
    'unknown';
  return createHash('sha256').update(raw + ':' + PEPPER).digest('hex').slice(0, 32);
}
```

- [ ] **Step 2: Rate-limit tests (TDD)**

`apps/web/lib/rate-limit.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit, RATE_LIMITS } from './rate-limit.js';
import { createDb } from '@dtb/db';
import Database from 'better-sqlite3';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function freshDb() {
  const path = join(mkdtempSync(join(tmpdir(), 'dtb-rl-')), 'test.sqlite');
  const raw = new Database(path);
  raw.exec(`
    CREATE TABLE rate_limit_attempts (
      action TEXT, ip_hash TEXT, slot_minute INTEGER, count INTEGER,
      PRIMARY KEY (action, ip_hash, slot_minute)
    );
  `);
  raw.close();
  return createDb(path);
}

describe('checkRateLimit', () => {
  const ip = 'abc123';

  it('allows first request', () => {
    const db = freshDb();
    expect(checkRateLimit(db, ip, 'grievance:submit', Date.now())).toEqual({ allowed: true });
  });

  it('allows up to the per-minute limit', () => {
    const db = freshDb();
    const now = Date.now();
    const limit = RATE_LIMITS['grievance:submit']!.perMinute;
    for (let i = 0; i < limit; i++) {
      const r = checkRateLimit(db, ip, 'grievance:submit', now);
      expect(r.allowed).toBe(true);
    }
  });

  it('blocks when the per-minute limit is exceeded', () => {
    const db = freshDb();
    const now = Date.now();
    const limit = RATE_LIMITS['grievance:submit']!.perMinute;
    for (let i = 0; i < limit; i++) {
      checkRateLimit(db, ip, 'grievance:submit', now);
    }
    const blocked = checkRateLimit(db, ip, 'grievance:submit', now);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it('allows again after the minute slot rolls over', () => {
    const db = freshDb();
    const now = Date.now();
    const limit = RATE_LIMITS['grievance:submit']!.perMinute;
    for (let i = 0; i < limit; i++) {
      checkRateLimit(db, ip, 'grievance:submit', now);
    }
    expect(checkRateLimit(db, ip, 'grievance:submit', now + 61_000).allowed).toBe(true);
  });

  it('enforces hourly cap across multiple minute slots', () => {
    const db = freshDb();
    const start = Date.now();
    const hourlyLimit = RATE_LIMITS['grievance:submit']!.perHour;
    let consumed = 0;
    // distribute across 60 different minute slots to bypass per-minute
    for (let m = 0; m < 60 && consumed < hourlyLimit; m++) {
      const slotTime = start + m * 60_000;
      const r = checkRateLimit(db, ip, 'grievance:submit', slotTime);
      expect(r.allowed).toBe(true);
      consumed++;
    }
    // 61st minute slot — one above hourly limit if hourlyLimit < 60.
    // Use the LATEST slot to ensure we're inside the 1-hour window:
    const sixtyFirst = start + 59 * 60_000 + 1_000;
    const blocked = checkRateLimit(db, ip, 'grievance:submit', sixtyFirst);
    if (hourlyLimit <= 60) {
      expect(blocked.allowed).toBe(false);
    } else {
      // limit > 60 means above test isn't conclusive; skip-assertion path
      expect(blocked.allowed).toBe(true);
    }
  });

  it('different actions have independent counters', () => {
    const db = freshDb();
    const now = Date.now();
    const limit = RATE_LIMITS['grievance:submit']!.perMinute;
    for (let i = 0; i < limit; i++) {
      checkRateLimit(db, ip, 'grievance:submit', now);
    }
    // submit is now blocked, but react should still work
    expect(checkRateLimit(db, ip, 'grievance:react', now).allowed).toBe(true);
  });
});
```

- [ ] **Step 3: Implement rate limiter**

`apps/web/lib/rate-limit.ts`:

```typescript
import { and, eq, gte } from 'drizzle-orm';
import { schema, type Db } from '@dtb/db';

export const RATE_LIMITS = {
  'grievance:submit': { perMinute: 5, perHour: 30 },
  'grievance:react':  { perMinute: 60, perHour: 600 },
  'grievance:report': { perMinute: 10, perHour: 60 },
} as const;
export type RateLimitAction = keyof typeof RATE_LIMITS;

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs?: number;
}

/**
 * Check + record a rate-limited action. ATOMIC: this function both reads
 * the existing counts and increments the current slot in one logical step.
 * Call BEFORE doing the work; if `allowed: true`, proceed; otherwise reject.
 *
 * Uses two windows simultaneously:
 *   - perMinute: count in the current 60-second slot
 *   - perHour:   sum across all slots in the last 60 minutes
 *
 * `now` is injectable for tests.
 */
export function checkRateLimit(
  db: Db,
  ipHash: string,
  action: RateLimitAction,
  now: number = Date.now(),
): RateLimitResult {
  const limits = RATE_LIMITS[action];
  const currentSlot = Math.floor(now / 60_000);
  const hourAgoSlot = currentSlot - 60;

  // Sum of attempts in the last 60 slots
  const recent = db.select().from(schema.rateLimitAttempts)
    .where(and(
      eq(schema.rateLimitAttempts.action, action),
      eq(schema.rateLimitAttempts.ipHash, ipHash),
      gte(schema.rateLimitAttempts.slotMinute, hourAgoSlot),
    ))
    .all();

  const hourCount = recent.reduce((sum, r) => sum + r.count, 0);
  const currentSlotCount = recent.find((r) => r.slotMinute === currentSlot)?.count ?? 0;

  if (currentSlotCount >= limits.perMinute) {
    return { allowed: false, retryAfterMs: 60_000 - (now % 60_000) };
  }
  if (hourCount >= limits.perHour) {
    return { allowed: false, retryAfterMs: 60 * 60_000 }; // approximate
  }

  // Allowed — record the attempt
  db.insert(schema.rateLimitAttempts).values({
    action, ipHash, slotMinute: currentSlot, count: 1,
  }).onConflictDoUpdate({
    target: [schema.rateLimitAttempts.action, schema.rateLimitAttempts.ipHash, schema.rateLimitAttempts.slotMinute],
    set: { count: currentSlotCount + 1 },
  }).run();

  return { allowed: true };
}
```

- [ ] **Step 4: Tests pass**

```bash
npm test
```

Expected: 6 rate-limit tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/ip.ts apps/web/lib/rate-limit.ts apps/web/lib/rate-limit.test.ts
git commit -m "feat(web): DB-backed sliding-window rate limit + IP hash helper

Per-action limits defined in code (submit: 5/min 30/hr; react: 60/min 600/hr;
report: 10/min 60/hr). Atomic check+increment in one call. IP hashed with
server pepper before storage — raw IPs never written to DB or logs."
```

---

## Task 4 — Turnstile verifier

**Files:**
- Create: `apps/web/lib/turnstile.ts`, `.env.example`

- [ ] **Step 1: Document env vars**

`.env.example` at repo root:

```bash
# === Janta Darbar / Plan 3 ===

# Cloudflare Turnstile — register a free site at https://dash.cloudflare.com/?to=/:account/turnstile
# In dev, use the documented always-pass test keys:
#   sitekey: 1x00000000000000000000AA
#   secret:  1x0000000000000000000000000000000AA
NEXT_PUBLIC_TURNSTILE_SITEKEY=1x00000000000000000000AA
DTB_TURNSTILE_SECRET=1x0000000000000000000000000000000AA

# Pepper for IP hashing. Generate with: openssl rand -hex 32
DTB_IP_PEPPER=dev-only-pepper-replace-in-prod

# === Existing (Plan 1) ===
DTB_DB_PATH=/Users/woofwoof/Desktop/govt-website-tracker/data/dtb.sqlite
DTB_WEB_PORT=3210
DTB_TICK_MS=120000
```

- [ ] **Step 2: Implement Turnstile verify**

`apps/web/lib/turnstile.ts`:

```typescript
const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Server-side verify a Turnstile token from the client.
 * In dev with the always-pass test secret, this always returns true
 * for any non-empty token. In production with a real secret, Cloudflare
 * validates the token and returns success/failure.
 */
export async function verifyTurnstile(token: string, ip?: string): Promise<boolean> {
  if (!token) return false;

  const secret = process.env.DTB_TURNSTILE_SECRET;
  if (!secret) {
    console.warn('[turnstile] DTB_TURNSTILE_SECRET not set — allowing in dev. SET BEFORE PRODUCTION.');
    return true;
  }

  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set('remoteip', ip);

  try {
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    if (!res.ok) return false;
    const data = await res.json() as { success: boolean };
    return data.success === true;
  } catch (err) {
    console.error('[turnstile] verify error', err);
    return false;
  }
}
```

NOTE: no test file for this — the real network call would require either mocking fetch (a lot of setup) or hitting Cloudflare for real (flaky in CI). The function is small and either works (via Cloudflare) or returns false. Coverage will come from integration tests in Task 8.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/turnstile.ts .env.example
git commit -m "feat(web): server-side Turnstile verify + .env.example

Hits Cloudflare's siteverify endpoint with the secret + token. Dev mode
uses Cloudflare's documented always-pass test keys so local development
needs zero external setup. .env.example documents every required var
for future deployers."
```

---

## Task 5 — In-process grievance event bus

**Files:**
- Create: `apps/web/lib/grievance-bus.ts`

- [ ] **Step 1: Implement the bus**

`apps/web/lib/grievance-bus.ts`:

```typescript
import { EventEmitter } from 'node:events';

/**
 * Single-process pub-sub for grievance events. Survives Next.js hot reload
 * in dev (we attach to globalThis), and is the broadcast channel between
 * the POST /api/grievance handler and the GET /api/grievance/stream SSE.
 *
 * Limitation: this is in-process. If we ever scale to multiple Node
 * instances behind a load balancer, swap for Redis pub-sub. Not needed for
 * V1's single-VM Fly.io deployment.
 */

export interface BusEvents {
  'grievance:new': {
    id: number;
    siteId: string;
    tag: string;
    body: string;
    createdAt: number;
  };
  'grievance:react': { grievanceId: number; kind: string; delta: number };
  'grievance:hide': { grievanceId: number };
}

const KEY = Symbol.for('dtb.grievance-bus');
type Global = typeof globalThis & { [k: symbol]: EventEmitter | undefined };
const g = globalThis as Global;

if (!g[KEY]) {
  const emitter = new EventEmitter();
  emitter.setMaxListeners(500); // accommodate many SSE clients
  g[KEY] = emitter;
}

export const grievanceBus = g[KEY]!;

export function emitGrievanceEvent<K extends keyof BusEvents>(
  kind: K,
  payload: BusEvents[K],
): void {
  grievanceBus.emit(kind, payload);
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/lib/grievance-bus.ts
git commit -m "feat(web): in-process event bus for grievance pub-sub

Attaches a Node EventEmitter to globalThis under a Symbol so it survives
Next dev hot-reload. Used by POST /api/grievance (emit) and GET /api/grievance/stream
(subscribe). 500-listener ceiling sized for V1 concurrent SSE clients."
```

---

## Task 6 — POST /api/grievance (submit)

**Files:**
- Create: `apps/web/app/api/grievance/route.ts`

- [ ] **Step 1: Implement**

`apps/web/app/api/grievance/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { schema } from '@dtb/db';
import { getDb } from '@/lib/db';
import { filterGrievance } from '@/lib/grievance-filter';
import { checkRateLimit } from '@/lib/rate-limit';
import { verifyTurnstile } from '@/lib/turnstile';
import { getClientIpHash } from '@/lib/ip';
import { emitGrievanceEvent } from '@/lib/grievance-bus';

const VALID_TAGS = new Set([
  'otp-not-coming', 'error-5xx', 'blank-page', 'slow',
  'login-failed', 'payment-failed', 'other',
]);

export const dynamic = 'force-dynamic';

interface SubmitBody {
  siteId: string;
  tag: string;
  body: string;
  turnstileToken: string;
}

export async function POST(request: Request) {
  let payload: SubmitBody;
  try {
    payload = await request.json() as SubmitBody;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!payload.siteId || typeof payload.siteId !== 'string') {
    return NextResponse.json({ error: 'site_required' }, { status: 400 });
  }
  if (!VALID_TAGS.has(payload.tag)) {
    return NextResponse.json({ error: 'invalid_tag' }, { status: 400 });
  }

  const filter = filterGrievance(payload.body ?? '');
  if (!filter.ok) {
    return NextResponse.json({ error: 'moderation_failed', reason: filter.reason }, { status: 422 });
  }

  const ipHash = getClientIpHash(request.headers);
  const db = getDb();

  // Rate-limit BEFORE Turnstile so abusers don't burn our Cloudflare quota
  const rl = checkRateLimit(db, ipHash, 'grievance:submit');
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', retry_after_ms: rl.retryAfterMs },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.retryAfterMs ?? 60_000) / 1000)) } },
    );
  }

  const passed = await verifyTurnstile(payload.turnstileToken, request.headers.get('cf-connecting-ip') ?? undefined);
  if (!passed) {
    return NextResponse.json({ error: 'captcha_failed' }, { status: 403 });
  }

  // Confirm the site exists and is enabled
  const site = db.select().from(schema.sites)
    .where(eq(schema.sites.id, payload.siteId)).get();
  if (!site || !site.enabled) {
    return NextResponse.json({ error: 'site_not_tracked' }, { status: 400 });
  }

  const now = Date.now();
  const inserted = db.insert(schema.grievances).values({
    siteId: payload.siteId,
    tag: payload.tag as never, // narrowed by VALID_TAGS check above
    body: payload.body.trim(),
    ipHash,
    createdAt: now,
    visible: true,
    reportsCount: 0,
  }).returning().get();

  emitGrievanceEvent('grievance:new', {
    id: inserted.id,
    siteId: inserted.siteId,
    tag: inserted.tag,
    body: inserted.body,
    createdAt: inserted.createdAt,
  });

  return NextResponse.json({ id: inserted.id, createdAt: inserted.createdAt }, { status: 201 });
}
```

- [ ] **Step 2: Build verify**

```bash
npm run -w @dtb/web build
```

Expected: `Compiled successfully`. The route appears in the routes list as `/api/grievance` (Dynamic).

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/grievance/route.ts
git commit -m "feat(web): POST /api/grievance submission endpoint

Pipeline: validate payload → check banned-word filter (422) → check
rate-limit (429) → verify Turnstile (403) → verify site is tracked (400)
→ insert + emit to event bus. Returns {id, createdAt} on 201."
```

---

## Task 7 — GET /api/grievance/recent + /api/grievance/stream

**Files:**
- Create: `apps/web/app/api/grievance/recent/route.ts`, `apps/web/app/api/grievance/stream/route.ts`

- [ ] **Step 1: Recent (initial load JSON)**

`apps/web/app/api/grievance/recent/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { desc, eq, and, gte } from 'drizzle-orm';
import { schema } from '@dtb/db';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '40', 10), 100);
  const since = Date.now() - 60 * 60 * 1000; // last hour
  const db = getDb();

  const rows = db.select().from(schema.grievances)
    .where(and(
      eq(schema.grievances.visible, true),
      gte(schema.grievances.createdAt, since),
    ))
    .orderBy(desc(schema.grievances.createdAt))
    .limit(limit)
    .all();

  // attach reaction counts in one extra query
  const reactionRows = db.select().from(schema.reactions).all();
  const reactionCounts: Record<number, Record<string, number>> = {};
  for (const r of reactionRows) {
    const m = reactionCounts[r.grievanceId] ?? (reactionCounts[r.grievanceId] = {});
    m[r.kind] = (m[r.kind] ?? 0) + 1;
  }

  return NextResponse.json({
    grievances: rows.map((g) => ({
      id: g.id, siteId: g.siteId, tag: g.tag, body: g.body, createdAt: g.createdAt,
      reactions: reactionCounts[g.id] ?? {},
    })),
  });
}
```

- [ ] **Step 2: SSE stream**

`apps/web/app/api/grievance/stream/route.ts`:

```typescript
import { grievanceBus } from '@/lib/grievance-bus';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const encoder = new TextEncoder();

function sseEvent(name: string, data: unknown): string {
  return `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      // initial hello
      controller.enqueue(encoder.encode(sseEvent('hello', { ts: Date.now() })));

      const onNew = (g: unknown) => {
        try {
          controller.enqueue(encoder.encode(sseEvent('grievance:new', g)));
        } catch { /* client disconnected */ }
      };
      const onReact = (g: unknown) => {
        try {
          controller.enqueue(encoder.encode(sseEvent('grievance:react', g)));
        } catch { /* client disconnected */ }
      };
      const onHide = (g: unknown) => {
        try {
          controller.enqueue(encoder.encode(sseEvent('grievance:hide', g)));
        } catch { /* client disconnected */ }
      };

      grievanceBus.on('grievance:new', onNew);
      grievanceBus.on('grievance:react', onReact);
      grievanceBus.on('grievance:hide', onHide);

      // keep-alive ping every 25s so proxies don't time out
      const interval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping ${Date.now()}\n\n`));
        } catch { /* disconnected */ }
      }, 25_000);

      // attach cleanup to the underlying request close — Next 15 closes the
      // controller automatically on disconnect, surfacing via cancel()
      (controller as unknown as { _cleanup?: () => void })._cleanup = () => {
        grievanceBus.off('grievance:new', onNew);
        grievanceBus.off('grievance:react', onReact);
        grievanceBus.off('grievance:hide', onHide);
        clearInterval(interval);
      };
    },
    cancel() {
      // Called by Next when the client disconnects.
      // The cleanup function was stashed on the controller in start().
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
```

- [ ] **Step 3: Manual sanity (curl)**

In one terminal start the dev server:

```bash
npm run dev:web
```

In another, connect to the stream:

```bash
curl -N http://localhost:3210/api/grievance/stream
```

Expected: receives `event: hello\ndata: {"ts":...}\n\n` immediately, then periodic `: ping ...\n\n` lines. Leave it open.

Then in a third terminal, submit a grievance against Aadhaar:

```bash
# First seed the site if not already
npm run db:seed

curl -X POST http://localhost:3210/api/grievance \
  -H 'Content-Type: application/json' \
  -d '{
    "siteId": "aadhaar-ssup",
    "tag": "otp-not-coming",
    "body": "OTP not arriving even after 6 attempts",
    "turnstileToken": "dev-token"
  }'
```

Expected: HTTP 201 with `{"id":1, "createdAt":...}`. The curl in terminal 2 should print a `grievance:new` event immediately.

Stop with Ctrl+C in both curls. Kill the dev server.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/grievance/recent apps/web/app/api/grievance/stream
git commit -m "feat(web): grievance recent JSON + SSE live stream

/api/grievance/recent serves the last hour of visible grievances with
attached reaction counts for initial page load. /api/grievance/stream is
a Server-Sent Events endpoint that subscribes to the in-process event bus
and pushes grievance:new, grievance:react, grievance:hide events to clients.
25s keep-alive pings prevent proxy timeouts."
```

---

## Task 8 — Reactions + reports endpoints

**Files:**
- Create: `apps/web/app/api/grievance/[id]/react/route.ts`, `apps/web/app/api/grievance/[id]/report/route.ts`

- [ ] **Step 1: Reactions (toggle on/off)**

`apps/web/app/api/grievance/[id]/react/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { eq, and, count } from 'drizzle-orm';
import { schema } from '@dtb/db';
import { getDb } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';
import { getClientIpHash } from '@/lib/ip';
import { emitGrievanceEvent } from '@/lib/grievance-bus';

const VALID_KINDS = new Set(['angry', 'sad', 'laugh', 'same']);

export const dynamic = 'force-dynamic';

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await ctx.params;
  const id = parseInt(idStr, 10);
  if (Number.isNaN(id)) return NextResponse.json({ error: 'bad_id' }, { status: 400 });

  let kind: string;
  try { ({ kind } = await request.json() as { kind: string }); }
  catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  if (!VALID_KINDS.has(kind)) return NextResponse.json({ error: 'bad_kind' }, { status: 400 });

  const ipHash = getClientIpHash(request.headers);
  const db = getDb();

  const rl = checkRateLimit(db, ipHash, 'grievance:react');
  if (!rl.allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const grievance = db.select().from(schema.grievances).where(eq(schema.grievances.id, id)).get();
  if (!grievance || !grievance.visible) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  // Toggle: if the reaction exists, delete it; otherwise insert.
  const existing = db.select().from(schema.reactions)
    .where(and(
      eq(schema.reactions.grievanceId, id),
      eq(schema.reactions.ipHash, ipHash),
      eq(schema.reactions.kind, kind as never),
    )).get();

  let delta: 1 | -1;
  if (existing) {
    db.delete(schema.reactions)
      .where(and(
        eq(schema.reactions.grievanceId, id),
        eq(schema.reactions.ipHash, ipHash),
        eq(schema.reactions.kind, kind as never),
      )).run();
    delta = -1;
  } else {
    db.insert(schema.reactions).values({
      grievanceId: id, ipHash, kind: kind as never, createdAt: Date.now(),
    }).run();
    delta = 1;
  }

  const newCount = db.select({ n: count() }).from(schema.reactions)
    .where(and(eq(schema.reactions.grievanceId, id), eq(schema.reactions.kind, kind as never)))
    .get()?.n ?? 0;

  emitGrievanceEvent('grievance:react', { grievanceId: id, kind, delta });

  return NextResponse.json({ count: newCount, toggled: delta });
}
```

- [ ] **Step 2: Reports (auto-hide at ≥3)**

`apps/web/app/api/grievance/[id]/report/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { schema } from '@dtb/db';
import { getDb } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';
import { getClientIpHash } from '@/lib/ip';
import { emitGrievanceEvent } from '@/lib/grievance-bus';

export const dynamic = 'force-dynamic';

const HIDE_THRESHOLD = 3;

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await ctx.params;
  const id = parseInt(idStr, 10);
  if (Number.isNaN(id)) return NextResponse.json({ error: 'bad_id' }, { status: 400 });

  const ipHash = getClientIpHash(request.headers);
  const db = getDb();

  const rl = checkRateLimit(db, ipHash, 'grievance:report');
  if (!rl.allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const grievance = db.select().from(schema.grievances).where(eq(schema.grievances.id, id)).get();
  if (!grievance) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // Note: we don't track WHICH IPs reported (to keep the row narrow). This
  // means the same IP can report multiple times; for V1 that's acceptable.
  const newCount = grievance.reportsCount + 1;
  const nowHidden = newCount >= HIDE_THRESHOLD && grievance.visible;

  db.update(schema.grievances)
    .set({
      reportsCount: newCount,
      ...(nowHidden ? { visible: false } : {}),
    })
    .where(eq(schema.grievances.id, id)).run();

  if (nowHidden) emitGrievanceEvent('grievance:hide', { grievanceId: id });

  return NextResponse.json({ reportsCount: newCount, hidden: !grievance.visible || nowHidden });
}
```

- [ ] **Step 3: Build verify**

```bash
npm run -w @dtb/web build
```

Expected: `Compiled successfully`. New routes appear.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/grievance/\[id\]
git commit -m "feat(web): grievance reactions + reports endpoints

POST /api/grievance/[id]/react toggles a reaction (insert if missing,
delete if present) and returns the new count. POST /api/grievance/[id]/report
increments reports_count and auto-hides the grievance at ≥3 reports.
Both emit on the event bus so SSE subscribers see the change."
```

---

## Task 9 — Community auto-flag job in monitor

**Files:**
- Create: `packages/monitor/src/community-flag.ts`, `packages/monitor/tests/community-flag.test.ts`
- Modify: `packages/monitor/src/index.ts`

- [ ] **Step 1: TDD — write the test first**

`packages/monitor/tests/community-flag.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
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

function insertGrievances(db: ReturnType<typeof createDb>, count: number, now: number, windowMs: number) {
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
    // only 1 grievance — well below threshold
    insertGrievances(db, 1, now, COMMUNITY_FLAG_WINDOW_MS);
    recomputeCommunityFlag(db, now);
    const status = db.select().from(schema.siteStatus).all()[0]!;
    expect(status.communityFlag).toBe(false);
  });

  it('only counts visible grievances', async () => {
    const db = await makeDb();
    const now = Date.now();
    insertGrievances(db, COMMUNITY_FLAG_THRESHOLD, now, COMMUNITY_FLAG_WINDOW_MS);
    // hide all
    db.update(schema.grievances).set({ visible: false }).run();
    recomputeCommunityFlag(db, now);
    const status = db.select().from(schema.siteStatus).all()[0]!;
    expect(status.communityFlag).toBe(false);
  });
});
```

- [ ] **Step 2: Run, watch fail**

```bash
npm -w @dtb/monitor test
```

Expected: 5 community-flag tests fail (module not found).

- [ ] **Step 3: Implement**

`packages/monitor/src/community-flag.ts`:

```typescript
import { and, eq, gte, count } from 'drizzle-orm';
import { schema, type Db } from '@dtb/db';

/**
 * Spec §7: A site is community-flagged Degraded if ≥20 visible grievances
 * arrive within any rolling 10-minute window. We re-evaluate this every
 * minute from the monitor process.
 */
export const COMMUNITY_FLAG_THRESHOLD = 20;
export const COMMUNITY_FLAG_WINDOW_MS = 10 * 60 * 1000;

/** Recompute community_flag for every site in one pass. */
export function recomputeCommunityFlag(db: Db, now: number = Date.now()): void {
  const since = now - COMMUNITY_FLAG_WINDOW_MS;
  const sites = db.select().from(schema.sites).where(eq(schema.sites.enabled, true)).all();

  for (const site of sites) {
    const n = db.select({ n: count() }).from(schema.grievances)
      .where(and(
        eq(schema.grievances.siteId, site.id),
        eq(schema.grievances.visible, true),
        gte(schema.grievances.createdAt, since),
      ))
      .get()?.n ?? 0;

    const shouldFlag = n >= COMMUNITY_FLAG_THRESHOLD;
    db.update(schema.siteStatus)
      .set({ communityFlag: shouldFlag })
      .where(eq(schema.siteStatus.siteId, site.id))
      .run();
  }
}
```

- [ ] **Step 4: Tests pass**

```bash
npm -w @dtb/monitor test
```

Expected: 5 community-flag tests pass alongside the existing 16.

- [ ] **Step 5: Wire into the daemon**

Modify `packages/monitor/src/index.ts`. Find the existing `setInterval(tick, intervalMs);` line and add right below it:

```typescript
import { recomputeCommunityFlag } from './community-flag.js';

const COMMUNITY_FLAG_TICK_MS = 60_000;

function communityTick() {
  try {
    recomputeCommunityFlag(db);
  } catch (err) {
    console.error('[monitor] community flag recompute failed:', err);
  }
}
communityTick(); // run once immediately
setInterval(communityTick, COMMUNITY_FLAG_TICK_MS);
```

Adjust the import at the top of the file accordingly. Then verify:

```bash
DTB_TICK_MS=999999999 timeout 5 npm run dev:monitor || true
```

Expected: starts, logs "[monitor] tick OK", and silently runs the community-flag job (no crash).

- [ ] **Step 6: Commit**

```bash
git add packages/monitor/src/community-flag.ts packages/monitor/tests/community-flag.test.ts packages/monitor/src/index.ts
git commit -m "feat(monitor): community-flag recompute job, 60s interval

Counts visible grievances per site in the last 10 minutes. Sets
site_status.community_flag = true if ≥20, false otherwise. Runs alongside
the HTTP probe loop on the same daemon process. Pure function + 5 tests
covering threshold, window, hidden-grievance exclusion, flag-clearing."
```

---

## Task 10 — GrievanceForm submission modal (client)

**Files:**
- Create: `apps/web/components/GrievanceForm.tsx`

This is a client component with a Turnstile widget. Loads the Cloudflare Turnstile script via `<Script>`.

- [ ] **Step 1: Implement**

`apps/web/components/GrievanceForm.tsx`:

```typescript
'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';

interface Site { id: string; name: string; }
interface Props {
  sites: Site[];
  onClose: () => void;
  onSubmitted: () => void;
}

const TAGS = [
  { value: 'otp-not-coming', label: 'OTP not coming' },
  { value: 'error-5xx',      label: 'Error 5xx' },
  { value: 'blank-page',     label: 'Blank page' },
  { value: 'slow',           label: 'Too slow' },
  { value: 'login-failed',   label: 'Login failed' },
  { value: 'payment-failed', label: 'Payment failed' },
  { value: 'other',          label: 'Other' },
] as const;

const SITEKEY = process.env.NEXT_PUBLIC_TURNSTILE_SITEKEY ?? '1x00000000000000000000AA';

declare global {
  interface Window {
    turnstile?: {
      render: (sel: string | HTMLElement, opts: { sitekey: string; callback: (token: string) => void }) => string;
      remove: (id: string) => void;
    };
  }
}

export function GrievanceForm({ sites, onClose, onSubmitted }: Props) {
  const [siteId, setSiteId] = useState(sites[0]?.id ?? '');
  const [tag, setTag] = useState<typeof TAGS[number]['value']>('otp-not-coming');
  const [body, setBody] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const tsContainerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  // Render Turnstile widget once the script has loaded
  useEffect(() => {
    function tryRender() {
      if (window.turnstile && tsContainerRef.current && !widgetIdRef.current) {
        widgetIdRef.current = window.turnstile.render(tsContainerRef.current, {
          sitekey: SITEKEY,
          callback: (t: string) => setToken(t),
        });
      }
    }
    tryRender();
    const interval = setInterval(tryRender, 250);
    return () => {
      clearInterval(interval);
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token) { setError('Please complete the captcha'); return; }
    if (body.trim().length === 0) { setError('Write your grievance'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/grievance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, tag, body, turnstileToken: token }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error === 'moderation_failed' ? `Rejected: ${data.reason}`
              : data.error === 'rate_limited' ? 'You are filing too quickly. Wait a moment.'
              : data.error === 'captcha_failed' ? 'Captcha failed — refresh and try again.'
              : `Failed: ${data.error ?? res.status}`);
        setSubmitting(false);
        return;
      }
      onSubmitted();
      onClose();
    } catch (err) {
      setError('Network error. Try again.');
      setSubmitting(false);
    }
  }

  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />

      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center px-4"
           onClick={(e) => e.target === e.currentTarget && onClose()}>
        <form onSubmit={submit}
              className="bg-[var(--color-paper)] rounded-2xl p-7 max-w-[480px] w-full shadow-[0_20px_60px_-12px_rgba(15,31,95,0.5)]">
          <div className="flex justify-between items-baseline mb-1">
            <h2 className="text-xl font-bold tracking-tight">File a grievance</h2>
            <button type="button" onClick={onClose} className="text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] text-sm" aria-label="Close">✕</button>
          </div>
          <p className="text-sm text-[var(--color-ink-dim)] mb-6">
            <span style={{ fontFamily: 'var(--font-hi)' }} className="text-[var(--color-blue)] font-semibold">शिकायत दर्ज करें</span> — anonymous, 140 characters max.
          </p>

          <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--color-ink-faint)] mb-1.5">Department</label>
          <select value={siteId} onChange={(e) => setSiteId(e.target.value)}
                  className="w-full border border-[var(--color-border-strong)] rounded-lg px-3 py-2.5 text-sm font-medium bg-[var(--color-paper)] mb-4">
            {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--color-ink-faint)] mb-1.5">What broke</label>
          <select value={tag} onChange={(e) => setTag(e.target.value as typeof TAGS[number]['value'])}
                  className="w-full border border-[var(--color-border-strong)] rounded-lg px-3 py-2.5 text-sm font-medium bg-[var(--color-paper)] mb-4">
            {TAGS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>

          <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--color-ink-faint)] mb-1.5">
            Your grievance <span className="text-[var(--color-ink-faint)] font-normal normal-case">— {140 - body.length} left</span>
          </label>
          <textarea value={body} onChange={(e) => setBody(e.target.value.slice(0, 140))}
                    rows={3} placeholder="What happened?"
                    className="w-full border border-[var(--color-border-strong)] rounded-lg px-3 py-2.5 text-sm font-medium bg-[var(--color-paper)] resize-none mb-4" />

          <div ref={tsContainerRef} className="mb-4 min-h-[65px]" />

          {error && <div className="text-xs text-[var(--color-red)] font-semibold mb-3">{error}</div>}

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose}
                    className="px-4 py-2 text-sm font-semibold text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
                    className="px-5 py-2.5 bg-[var(--color-blue)] text-white text-sm font-bold rounded-lg hover:bg-[var(--color-blue-deep)] disabled:opacity-50">
              {submitting ? 'Filing...' : 'File grievance'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Build verify**

```bash
npm run -w @dtb/web build
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/GrievanceForm.tsx
git commit -m "feat(web): grievance submission modal w/ Turnstile

Department dropdown + tag dropdown + 140-char textarea + Cloudflare
Turnstile widget. Validates locally before submit, surfaces moderation /
rate-limit / captcha errors from the API with friendly copy."
```

---

## Task 11 — GrievancePost + ReactionPill components

**Files:**
- Create: `apps/web/components/GrievancePost.tsx`, `apps/web/components/ReactionPill.tsx`

- [ ] **Step 1: Reaction button (optimistic update)**

`apps/web/components/ReactionPill.tsx`:

```typescript
'use client';

import { useState } from 'react';

interface Props {
  grievanceId: number;
  kind: 'angry' | 'sad' | 'laugh' | 'same';
  initialCount: number;
  emoji: string;
  label: string;
}

export function ReactionPill({ grievanceId, kind, initialCount, emoji, label }: Props) {
  const [count, setCount] = useState(initialCount);
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    const optimisticDelta = active ? -1 : 1;
    setCount((c) => c + optimisticDelta);
    setActive((a) => !a);
    try {
      const res = await fetch(`/api/grievance/${grievanceId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind }),
      });
      if (!res.ok) {
        // rollback
        setCount((c) => c - optimisticDelta);
        setActive((a) => !a);
      } else {
        const data = await res.json() as { count: number };
        setCount(data.count); // server is the truth
      }
    } catch {
      setCount((c) => c - optimisticDelta);
      setActive((a) => !a);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button onClick={toggle} disabled={busy}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-semibold border transition-all
              ${active
                ? 'bg-[var(--color-blue-soft)] border-[var(--color-blue)] text-[var(--color-blue)]'
                : 'bg-[var(--color-paper-2)] border-[var(--color-border)] text-[var(--color-ink-soft)] hover:border-[var(--color-blue)] hover:text-[var(--color-blue)]'}
              disabled:opacity-50`}>
      <span>{emoji}</span>
      {label && <span className="text-[11px]">{label}</span>}
      <b className="font-bold tabular-nums">{count}</b>
    </button>
  );
}
```

- [ ] **Step 2: Single post**

`apps/web/components/GrievancePost.tsx`:

```typescript
import { ReactionPill } from './ReactionPill.js';

const DOT_COLOR_BY_STATE: Record<string, string> = {
  down: 'var(--color-red)',
  degraded: 'var(--color-amber)',
  working: 'var(--color-green)',
  unknown: 'var(--color-ink-faint)',
};

interface Props {
  grievance: {
    id: number;
    siteName: string;            // computed from siteId by caller
    siteState?: 'working' | 'degraded' | 'down';
    tag: string;
    body: string;
    createdAt: number;
    reactions: Partial<Record<'angry' | 'sad' | 'laugh' | 'same', number>>;
  };
}

function timeAgo(then: number): string {
  const ms = Date.now() - then;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

export function GrievancePost({ grievance: g }: Props) {
  const state = g.siteState ?? 'unknown';
  return (
    <article className="px-7 py-4 border-b border-[var(--color-border)] hover:bg-[var(--color-paper-2)] transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: DOT_COLOR_BY_STATE[state] }} />
          {g.siteName}
          <span className="text-[var(--color-ink-faint)] font-medium text-[11px] ml-1">· {g.tag}</span>
        </span>
        <span className="text-[11px] text-[var(--color-ink-faint)] font-medium">{timeAgo(g.createdAt)}</span>
      </div>
      <div className="text-sm font-medium leading-snug mb-2.5">{g.body}</div>
      <div className="flex gap-1.5 flex-wrap">
        <ReactionPill grievanceId={g.id} kind="same"  initialCount={g.reactions.same  ?? 0} emoji="✓"  label="same" />
        <ReactionPill grievanceId={g.id} kind="angry" initialCount={g.reactions.angry ?? 0} emoji="😡" label="" />
        <ReactionPill grievanceId={g.id} kind="sad"   initialCount={g.reactions.sad   ?? 0} emoji="😭" label="" />
        <ReactionPill grievanceId={g.id} kind="laugh" initialCount={g.reactions.laugh ?? 0} emoji="😂" label="" />
      </div>
    </article>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/GrievancePost.tsx apps/web/components/ReactionPill.tsx
git commit -m "feat(web): GrievancePost + ReactionPill components

ReactionPill is a client component with optimistic toggle: increments
the count immediately, rolls back if the API fails. GrievancePost is
presentational and shows site name + tag + 140-char body + 4 reaction
pills. timeAgo() helper kept inline since it's only used here."
```

---

## Task 12 — Wire JantaDarbarPanel to real data + SSE

**Files:**
- Create: `apps/web/components/GrievanceStream.tsx`
- Modify: `apps/web/components/JantaDarbarPanel.tsx`

- [ ] **Step 1: Build the live stream client**

`apps/web/components/GrievanceStream.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { GrievancePost } from './GrievancePost.js';
import { GrievanceForm } from './GrievanceForm.js';

export interface InitialGrievance {
  id: number;
  siteId: string;
  tag: string;
  body: string;
  createdAt: number;
  reactions: Partial<Record<'angry'|'sad'|'laugh'|'same', number>>;
}

interface SiteLookup { id: string; name: string; state?: 'working'|'degraded'|'down'; }

interface Props {
  initial: InitialGrievance[];
  sites: SiteLookup[];
}

export function GrievanceStream({ initial, sites }: Props) {
  const [grievances, setGrievances] = useState<InitialGrievance[]>(initial);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const es = new EventSource('/api/grievance/stream');
    es.addEventListener('grievance:new', (evt) => {
      const g = JSON.parse((evt as MessageEvent).data) as Omit<InitialGrievance, 'reactions'>;
      setGrievances((prev) => [{ ...g, reactions: {} }, ...prev].slice(0, 60));
    });
    es.addEventListener('grievance:hide', (evt) => {
      const { grievanceId } = JSON.parse((evt as MessageEvent).data) as { grievanceId: number };
      setGrievances((prev) => prev.filter((g) => g.id !== grievanceId));
    });
    es.onerror = () => { /* browser auto-reconnects */ };
    return () => es.close();
  }, []);

  const siteMap = new Map(sites.map((s) => [s.id, s] as const));

  return (
    <>
      <div>
        {grievances.length === 0 ? (
          <div className="px-7 py-10 text-center text-sm text-[var(--color-ink-dim)]">
            <p className="font-medium">No grievances yet.</p>
            <p className="mt-2 text-xs">Be the first citizen to file one.</p>
          </div>
        ) : (
          grievances.map((g) => {
            const s = siteMap.get(g.siteId);
            return (
              <GrievancePost
                key={g.id}
                grievance={{
                  id: g.id,
                  siteName: s?.name ?? g.siteId,
                  siteState: s?.state,
                  tag: g.tag,
                  body: g.body,
                  createdAt: g.createdAt,
                  reactions: g.reactions,
                }}
              />
            );
          })
        )}
      </div>

      <div className="sticky bottom-0 bg-[var(--color-paper)] border-t border-[var(--color-border)] px-7 py-3.5 text-center">
        <button onClick={() => setShowForm(true)}
                className="bg-[var(--color-blue)] text-white border-0 px-4 py-3.5 rounded-[11px] text-[13px] font-bold w-full inline-flex items-center justify-center gap-2.5 shadow-[0_4px_12px_-4px_rgba(30,58,138,0.4),_inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-[var(--color-blue-deep)] transition-all">
          + File a grievance
          <span className="bg-white/20 text-white px-1.5 py-0.5 rounded-full text-[10.5px] font-bold tracking-wide ml-1">live</span>
        </button>
        <div className="mt-2 text-[11px] text-[var(--color-ink-faint)] font-medium">
          <span className="text-[var(--color-ink-soft)] font-semibold" style={{ fontFamily: 'var(--font-hi)' }}>शिकायत दर्ज करें</span> · 140 chars, no signup
        </div>
      </div>

      {showForm && (
        <GrievanceForm
          sites={sites}
          onClose={() => setShowForm(false)}
          onSubmitted={() => { /* SSE will push the new one */ }}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: Refactor JantaDarbarPanel**

Replace `apps/web/components/JantaDarbarPanel.tsx`:

```typescript
import { eq, desc, and, gte } from 'drizzle-orm';
import { schema } from '@dtb/db';
import { getDb } from '@/lib/db';
import { GrievanceStream } from './GrievanceStream.js';

export async function JantaDarbarPanel() {
  const db = getDb();
  const sites = db.select().from(schema.sites).where(eq(schema.sites.enabled, true)).all();
  const since = Date.now() - 60 * 60 * 1000;

  const recent = db.select().from(schema.grievances)
    .where(and(eq(schema.grievances.visible, true), gte(schema.grievances.createdAt, since)))
    .orderBy(desc(schema.grievances.createdAt))
    .limit(40)
    .all();

  const reactions = db.select().from(schema.reactions).all();
  const counts: Record<number, Record<string, number>> = {};
  for (const r of reactions) {
    const m = counts[r.grievanceId] ?? (counts[r.grievanceId] = {});
    m[r.kind] = (m[r.kind] ?? 0) + 1;
  }

  // also need each site's current state for the colored dot
  const statuses = db.select().from(schema.siteStatus).all();
  const stateById = new Map(statuses.map((s) => [s.siteId, s.currentState] as const));

  const initial = recent.map((g) => ({
    id: g.id, siteId: g.siteId, tag: g.tag, body: g.body, createdAt: g.createdAt,
    reactions: counts[g.id] ?? {},
  }));
  const siteLookup = sites.map((s) => ({ id: s.id, name: s.name, state: stateById.get(s.id) }));

  return (
    <section className="col col-side bg-[var(--color-paper)] border-r-0">
      <div className="px-7 pt-6 pb-4 border-b border-[var(--color-border)]">
        <span className="block text-[10.5px] font-semibold text-[var(--color-ink-faint)] tracking-[0.18em] uppercase">
          {initial.length} in last 60 min · Live grievances
        </span>
        <h2 className="mt-1 text-lg font-bold tracking-tight flex items-baseline gap-2.5">
          Janta Darbar
          <span className="text-sm text-[var(--color-blue)] font-medium" style={{ fontFamily: 'var(--font-hi)' }}>जनता दरबार</span>
        </h2>
        <span className="text-xs text-[var(--color-ink-dim)] mt-0.5">The people's court of broken portals</span>
      </div>

      <GrievanceStream initial={initial} sites={siteLookup} />

      <div className="px-7 py-3 text-center text-[11.5px] text-[var(--color-blue)] font-semibold cursor-pointer bg-[var(--color-paper-2)] border-t border-[var(--color-border)] hover:bg-[var(--color-blue-soft)]">
        <a href="/janta-darbar">View all grievances →</a>
      </div>
    </section>
  );
}
```

NOTE: the "View all grievances →" link goes to `/janta-darbar` which doesn't exist yet — it lands as a 404 until Plan 4. That's fine for now.

- [ ] **Step 3: Build + smoke**

```bash
npm run -w @dtb/web build
```

Expected: `Compiled successfully`. Open the homepage in a browser. The right panel should now show 0 grievances (or whatever's in the DB) with a working "+ File a grievance" button.

Click the button → modal opens → fill it out → submit → grievance appears at the top of the feed immediately via SSE.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components
git commit -m "feat(web): wire Janta Darbar panel to real data + SSE + form

JantaDarbarPanel is now a Server Component that loads the last 60 min of
visible grievances + reaction counts + site name lookup, hands them to a
client GrievanceStream component which subscribes to /api/grievance/stream
for live updates and renders the submission form modal.

The 'coming soon' badge is gone — the panel is live."
```

---

## Task 13 — End-to-end smoke test

**Files:**
- Modify: `apps/web/e2e/homepage.spec.ts` (add new tests)

- [ ] **Step 1: Add e2e tests**

Append to `apps/web/e2e/homepage.spec.ts`:

```typescript
test('janta darbar: submitting a grievance shows it in the feed', async ({ page }) => {
  await page.goto('/');

  // Open form
  await page.getByRole('button', { name: /\+ File a grievance/ }).click();

  // Fill form
  await page.getByRole('combobox').first().selectOption({ index: 0 }); // first site
  await page.getByRole('combobox').nth(1).selectOption('otp-not-coming');
  await page.getByPlaceholder('What happened?').fill('e2e test grievance from playwright');

  // Wait for Turnstile to load. In dev with the always-pass key, just wait a moment.
  await page.waitForTimeout(2_500);

  // Submit
  await page.getByRole('button', { name: /^File grievance$/ }).click();

  // Verify it appears in the feed
  await expect(page.getByText('e2e test grievance from playwright')).toBeVisible({ timeout: 8_000 });
});

test('janta darbar: same-here reaction toggles count', async ({ page, request }) => {
  // Seed a grievance via API so the test doesn't depend on the previous test
  await request.post('http://localhost:3210/api/grievance', {
    data: {
      siteId: 'aadhaar-ssup',
      tag: 'blank-page',
      body: 'reaction-test seed grievance',
      turnstileToken: 'dev-token',
    },
  });

  await page.goto('/');
  const griev = page.getByText('reaction-test seed grievance').locator('xpath=ancestor::article');
  await expect(griev).toBeVisible({ timeout: 4_000 });

  const sameBtn = griev.getByRole('button', { name: /same/ });
  const initial = await sameBtn.innerText();

  await sameBtn.click();
  await page.waitForTimeout(500);
  const after = await sameBtn.innerText();
  expect(after).not.toBe(initial);
});
```

NOTE: the e2e tests require the dev server to actually be running with seed data. Playwright's `webServer` config from Plan 1 starts the web; the monitor isn't auto-started but the tests don't depend on the monitor (only the submission/reaction APIs).

- [ ] **Step 2: Run e2e**

```bash
# make sure seed data exists
npm run db:migrate
npm run db:seed
npm run test:e2e
```

Expected: 4 tests pass total (2 from Plan 1 + 2 new).

- [ ] **Step 3: Commit + tag**

```bash
git add apps/web/e2e/homepage.spec.ts
git commit -m "test(web): e2e for grievance submission + reaction toggle"

npm version 0.2.0-janta-darbar --no-git-tag-version
git add package.json package-lock.json
git commit -m "release: v0.2.0-janta-darbar

Plan 3 complete. Janta Darbar is live end-to-end:
- POST /api/grievance with Turnstile + rate-limit + content filter
- Server-Sent Events stream broadcasts to all open clients
- Reactions toggle on/off via /api/grievance/[id]/react
- Reports auto-hide grievances at ≥3 via /api/grievance/[id]/report
- Community-flag job updates site_status.community_flag every 60s
- Homepage right panel renders live feed + working submission modal

Next: Plan 4 — landing-page link pages (/janta-darbar full feed, /departments,
/leaderboard, /methodology, /donate, etc.)"
git tag v0.2.0-janta-darbar
```

---

## Self-Review

**Spec coverage (§7 Janta Darbar):**

| Spec requirement | Task |
|---|---|
| Tag dropdown (7 tags) + 140-char body | Task 10 (form) |
| Anonymous submission (no login) | Task 6 (API, no auth check) |
| Cloudflare Turnstile invisible verification | Task 4 (verifier) + Task 10 (widget) |
| IP rate-limit 5/min, 30/hour for submit | Task 3 (rate-limit) |
| Banned-word filter | Task 2 |
| Server-Sent Events real-time stream | Task 7 |
| 60-min history visible, older paginated | Tasks 7, 12 (limit 40, 60min window) |
| Per-grievance reaction counters | Tasks 8, 11 |
| Report → ≥3 auto-hide | Task 8 |
| Community auto-flag → Degraded | Task 9 |
| `View all grievances →` link to /janta-darbar | Task 12 (link present, page lands in Plan 4) |

**Type consistency:**
- `siteId: text` everywhere (string), `id: integer` for grievance rows
- `tag` enum has 7 values, validated in API + DB constraint + form options
- Reaction `kind` enum has 4 values: angry/sad/laugh/same
- IP hash is `string` (32-char hex) everywhere

**Placeholder scan:** none.

**Ambiguity check:** The "report" endpoint doesn't track which IPs reported, so the same IP can report repeatedly. This is documented in the task as an acceptable V1 trade-off. Plan 5 (admin) will add explicit moderation review for hidden grievances.

---

## Execution Handoff

**Plan complete. Two execution options:**

1. **Subagent-driven (recommended)** — fresh subagent per task, two-stage review per task.
2. **Inline execution** — execute in this session with checkpoints.

Which?
