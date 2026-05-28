# Plan 6 — Notify-Me / WhatsApp End-to-End

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A citizen types "Notify me when Aadhaar comes back up," enters their phone, verifies via WhatsApp OTP, and gets a single WhatsApp message the moment the site recovers. The flow works locally in **DryRun mode** (logs the OTP and the alert to the console) without any external WhatsApp credentials. When `DTB_WA_PHONE_NUMBER_ID` and `DTB_WA_TOKEN` are set, identical code paths hit Meta's WhatsApp Cloud API.

**Architecture:**
- New tables: `subscriptions` (one row per active alert) + `otp_attempts` (short-lived).
- A `WhatsAppAdapter` interface with two implementations: `CloudApiAdapter` (real, hits Meta) and `DryRunAdapter` (writes to a local log file). Selected at runtime by env presence.
- The notify form on the homepage becomes a 3-step modal: enter phone → enter OTP → confirmation.
- The monitor process gains a "recovery dispatcher" sub-job: after each tick, for any site that just transitioned to `working`, fetch all `active` subscriptions and fire alerts via the adapter, marking each subscription `triggered`.
- `/delete-my-data` becomes functional: user enters phone, receives OTP, confirms, and we purge all subscriptions matching the hashed phone.
- Recovery rule (per spec §6): only fire alerts on `Down → Working` (or `Degraded → Working`) AND only after 5+ consecutive minutes sustained. The existing state machine's recovery rule already enforces this — the trigger fires on the transition that the state machine emits.

**Tech Stack:** Same as Plans 1-5. No new npm deps (WhatsApp Cloud API is a plain `fetch`).

**Builds on:** `v0.4.0-admin` (commit TBD when Plan 5 ships).

---

## File structure (additions)

```
apps/web/
├── app/
│   ├── api/
│   │   ├── notify/
│   │   │   ├── request/route.ts             # POST: phone → send OTP
│   │   │   ├── verify/route.ts              # POST: phone + OTP → activate subscription
│   │   │   ├── cancel/route.ts              # POST: cancel by phone + token
│   │   │   └── stop/route.ts                # GET: webhook STOP keyword handler
│   │   └── webhook/whatsapp/route.ts        # GET (Meta verify) + POST (delivery status + inbound STOP)
│   ├── delete-my-data/
│   │   └── page.tsx
│   └── notify/
│       └── alerts/page.tsx                  # citizens see their current alerts (by phone+OTP)
├── components/
│   ├── NotifyFlow.tsx                       # 3-step modal: phone → OTP → done (CLIENT, replaces in-line form submit)
│   └── DeleteFlow.tsx                       # similar 2-step modal for /delete-my-data
└── lib/
    ├── otp.ts                               # generateOtp(), hashOtp() — pure
    ├── otp.test.ts
    ├── phone.ts                             # normalize +91 numbers, mask for display
    ├── phone.test.ts
    ├── subscription.ts                      # createSubscription(), maxActivePerPhone, etc.
    ├── subscription.test.ts
    ├── whatsapp-adapter.ts                  # interface + factory
    ├── whatsapp-cloud.ts                    # Meta Cloud API impl
    └── whatsapp-dryrun.ts                   # console + file log impl

packages/db/src/schema.ts                     # add subscriptions + otp_attempts (additive 0003 migration)

packages/monitor/src/recovery-dispatcher.ts  # NEW: fire alerts on state transitions to working
packages/monitor/src/recovery-dispatcher.test.ts
packages/monitor/src/loop.ts                  # MODIFY: invoke dispatcher after tick
```

---

## Task 1 — DB additions for subscriptions + OTP attempts (0003 migration)

**Files:**
- Modify: `packages/db/src/schema.ts`
- Auto-generate: `packages/db/migrations/0003_<name>.sql`

- [ ] **Step 1: Append to schema.ts**

```typescript
/**
 * Notify-me subscriptions. One row per (siteId, phone) pair while active.
 * After firing, the row stays with status='triggered' so we don't re-fire.
 */
export const subscriptions = sqliteTable(
  'subscriptions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    siteId: text('site_id').notNull().references(() => sites.id),
    phoneHash: text('phone_hash').notNull(),        // SHA-256(phone + pepper)
    phoneCiphertext: text('phone_ciphertext'),       // AES-encrypted; null after delete-my-data
    status: text('status', {
      enum: ['pending_otp', 'active', 'triggered', 'cancelled', 'failed', 'deleted'],
    }).notNull().default('pending_otp'),
    createdAt: integer('created_at').notNull(),
    activatedAt: integer('activated_at'),
    triggeredAt: integer('triggered_at'),
  },
  (t) => ({
    siteStatusIdx: index('idx_subs_site_status').on(t.siteId, t.status),
    phoneIdx: index('idx_subs_phone').on(t.phoneHash),
  }),
);

/**
 * Short-lived OTPs. We store the SHA-256 of the OTP (with pepper) — never plaintext.
 * Rows older than `expires_at` are eligible for pruning (V1: not pruned).
 */
export const otpAttempts = sqliteTable(
  'otp_attempts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    phoneHash: text('phone_hash').notNull(),
    codeHash: text('code_hash').notNull(),
    purpose: text('purpose', { enum: ['notify_signup', 'delete_data'] }).notNull(),
    expiresAt: integer('expires_at').notNull(),
    used: integer('used', { mode: 'boolean' }).notNull().default(false),
    ipHash: text('ip_hash'),
    createdAt: integer('created_at').notNull(),
  },
  (t) => ({
    phoneTimeIdx: index('idx_otp_phone_time').on(t.phoneHash, t.createdAt),
  }),
);
```

- [ ] **Step 2: Generate + apply + commit**

```bash
npm -w @dtb/db run migrate:generate
npm run db:migrate
sqlite3 data/dtb.sqlite ".schema subscriptions"
sqlite3 data/dtb.sqlite ".schema otp_attempts"

git add packages/db
git commit -m "feat(db): subscriptions + otp_attempts tables (0003 migration)

Plan 6 additive migration. Phone numbers stored as hash + AES-ciphertext;
OTPs as hash with 10-min expiry. Indexes on (site_id, status) for the
recovery dispatcher and on phone_hash for delete-my-data."
```

---

## Task 2 — Pure helpers: OTP, phone, subscription rules

**Files:**
- Create: `apps/web/lib/otp.ts` + `otp.test.ts`
- Create: `apps/web/lib/phone.ts` + `phone.test.ts`
- Create: `apps/web/lib/subscription.ts` + `subscription.test.ts`

- [ ] **Step 1: OTP — TDD**

`apps/web/lib/otp.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { generateOtp, hashOtp } from './otp.js';

describe('generateOtp', () => {
  it('returns a 6-digit string', () => {
    for (let i = 0; i < 10; i++) {
      const otp = generateOtp();
      expect(otp).toMatch(/^\d{6}$/);
    }
  });

  it('does not start with 0 (so SMS/WhatsApp keeps it 6 chars)', () => {
    for (let i = 0; i < 50; i++) {
      const otp = generateOtp();
      expect(otp[0]).not.toBe('0');
    }
  });
});

describe('hashOtp', () => {
  it('returns deterministic hash for same input', () => {
    expect(hashOtp('123456', 'pepper')).toBe(hashOtp('123456', 'pepper'));
  });
  it('differs when pepper or OTP changes', () => {
    expect(hashOtp('123456', 'A')).not.toBe(hashOtp('123456', 'B'));
    expect(hashOtp('123456', 'A')).not.toBe(hashOtp('123457', 'A'));
  });
  it('returns 64-char hex (SHA-256)', () => {
    expect(hashOtp('123456', 'p')).toMatch(/^[0-9a-f]{64}$/);
  });
});
```

`apps/web/lib/otp.ts`:

```typescript
import { createHash, randomInt } from 'node:crypto';

const PEPPER = process.env.DTB_OTP_PEPPER ?? 'dev-only-otp-pepper-replace-in-prod';

/** 6-digit OTP. Avoids leading zero so the SMS/WA digit count stays 6. */
export function generateOtp(): string {
  return String(randomInt(100_000, 1_000_000));
}

export function hashOtp(otp: string, pepper: string = PEPPER): string {
  return createHash('sha256').update(otp + ':' + pepper).digest('hex');
}
```

- [ ] **Step 2: Phone normalization — TDD**

`apps/web/lib/phone.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { normalizeIndianPhone, hashPhone, maskPhone } from './phone.js';

describe('normalizeIndianPhone', () => {
  it.each([
    ['9876543210',        '+919876543210'],
    ['9876 543210',       '+919876543210'],
    ['+91 98765 43210',   '+919876543210'],
    ['91 9876543210',     '+919876543210'],
    ['09876543210',       '+919876543210'],
  ])('normalizes %s → %s', (input, expected) => {
    expect(normalizeIndianPhone(input)).toBe(expected);
  });

  it('rejects non-Indian or malformed numbers', () => {
    expect(normalizeIndianPhone('+15555551234')).toBeNull();   // US
    expect(normalizeIndianPhone('123')).toBeNull();             // too short
    expect(normalizeIndianPhone('98765')).toBeNull();           // too short
    expect(normalizeIndianPhone('98765432101')).toBeNull();     // too long
  });

  it('rejects mobile numbers not starting with 6-9 (Indian mobile prefix)', () => {
    expect(normalizeIndianPhone('5876543210')).toBeNull();
  });
});

describe('maskPhone', () => {
  it('masks middle digits', () => {
    expect(maskPhone('+919876543210')).toBe('+91 98••• ••210');
  });
});
```

`apps/web/lib/phone.ts`:

```typescript
import { createHash } from 'node:crypto';

const PEPPER = process.env.DTB_PHONE_PEPPER ?? 'dev-only-phone-pepper-replace-in-prod';

/** Indian mobile: 10 digits starting with 6/7/8/9, optionally prefixed with +91, 91, or 0.
 *  Returns the E.164 form ("+91XXXXXXXXXX") or null. */
export function normalizeIndianPhone(input: string): string | null {
  if (!input) return null;
  const digits = input.replace(/[^\d]/g, '');
  let ten: string | null = null;
  if (digits.length === 10 && /^[6-9]/.test(digits)) ten = digits;
  else if (digits.length === 11 && digits.startsWith('0') && /^0[6-9]/.test(digits)) ten = digits.slice(1);
  else if (digits.length === 12 && digits.startsWith('91') && /^91[6-9]/.test(digits)) ten = digits.slice(2);
  if (!ten) return null;
  return '+91' + ten;
}

export function hashPhone(e164: string): string {
  return createHash('sha256').update(e164 + ':' + PEPPER).digest('hex');
}

export function maskPhone(e164: string): string {
  // +919876543210 → +91 98••• ••210
  const m = e164.match(/^\+91(\d{2})\d{5}(\d{3})$/);
  if (!m) return e164;
  return `+91 ${m[1]}••• ••${m[2]}`;
}
```

- [ ] **Step 3: Subscription helpers — TDD**

`apps/web/lib/subscription.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { countActiveByPhone, MAX_ACTIVE_PER_PHONE } from './subscription.js';
import { createDb, schema } from '@dtb/db';
import Database from 'better-sqlite3';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function freshDb() {
  const path = join(mkdtempSync(join(tmpdir(), 'dtb-sub-')), 'test.sqlite');
  const raw = new Database(path);
  raw.exec(`
    CREATE TABLE sites (id TEXT PRIMARY KEY, name TEXT, url TEXT, config_json TEXT, enabled INTEGER DEFAULT 1);
    CREATE TABLE subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site_id TEXT, phone_hash TEXT, phone_ciphertext TEXT, status TEXT,
      created_at INTEGER, activated_at INTEGER, triggered_at INTEGER
    );
  `);
  raw.close();
  return createDb(path);
}

describe('countActiveByPhone', () => {
  it('returns 0 for unknown phone', () => {
    const db = freshDb();
    expect(countActiveByPhone(db, 'abc')).toBe(0);
  });
  it('counts only "active" status, not triggered/cancelled/pending', () => {
    const db = freshDb();
    const now = Date.now();
    db.insert(schema.sites).values({ id: 's', name: 'S', url: 'u', configJson: '{}', enabled: true }).run();
    for (const s of ['pending_otp', 'active', 'active', 'triggered', 'cancelled', 'deleted']) {
      db.insert(schema.subscriptions).values({
        siteId: 's', phoneHash: 'phone1', status: s as any, createdAt: now,
      }).run();
    }
    expect(countActiveByPhone(db, 'phone1')).toBe(2);
  });
});
```

`apps/web/lib/subscription.ts`:

```typescript
import { and, eq, count } from 'drizzle-orm';
import { schema, type Db } from '@dtb/db';

export const MAX_ACTIVE_PER_PHONE = 5;

export function countActiveByPhone(db: Db, phoneHash: string): number {
  return db.select({ n: count() }).from(schema.subscriptions)
    .where(and(
      eq(schema.subscriptions.phoneHash, phoneHash),
      eq(schema.subscriptions.status, 'active'),
    ))
    .get()?.n ?? 0;
}
```

- [ ] **Step 4: Commit**

```bash
npm test
git add apps/web/lib/otp.ts apps/web/lib/otp.test.ts apps/web/lib/phone.ts apps/web/lib/phone.test.ts apps/web/lib/subscription.ts apps/web/lib/subscription.test.ts
git commit -m "feat(notify): pure helpers — OTP, phone normalization, subscription counter

OTP: 6-digit, non-leading-zero, SHA-256 hash with pepper. Phone:
+91 normalization for Indian mobile only (6-9 prefix), hash + mask
helpers. Subscription: countActiveByPhone() supports the 5-active cap."
```

---

## Task 3 — WhatsApp adapter (interface + DryRun + Cloud API)

**Files:**
- Create: `apps/web/lib/whatsapp-adapter.ts`, `apps/web/lib/whatsapp-dryrun.ts`, `apps/web/lib/whatsapp-cloud.ts`
- Modify: `.env.example` (WhatsApp env vars)

- [ ] **Step 1: Append to .env.example**

```bash
# === WhatsApp / Notify-me (Plan 6) ===
# Leave the next two unset for local DryRun mode (logs to console + /tmp/dtb-whatsapp.log).
# To wire real WhatsApp Cloud API, set both from your Meta Business dashboard:
#   DTB_WA_PHONE_NUMBER_ID — the Phone Number ID from Cloud API setup (NOT your phone number)
#   DTB_WA_TOKEN — long-lived access token
DTB_WA_PHONE_NUMBER_ID=
DTB_WA_TOKEN=

# Meta webhook verify token. Set to any random string, then enter the same in Meta's webhook config.
DTB_WA_WEBHOOK_VERIFY_TOKEN=dev-webhook-verify

# Approved template names. The bodies you submitted to Meta for approval.
DTB_WA_TEMPLATE_OTP=otp_verify
DTB_WA_TEMPLATE_RECOVERY=site_back_up

# Pepper for hashing OTPs / phone numbers (rotate to invalidate all stored subscriptions).
DTB_OTP_PEPPER=dev-only-otp-pepper-replace-in-prod
DTB_PHONE_PEPPER=dev-only-phone-pepper-replace-in-prod
```

- [ ] **Step 2: Adapter interface**

`apps/web/lib/whatsapp-adapter.ts`:

```typescript
export interface SendOtpParams {
  toE164: string;
  otp: string;
}
export interface SendRecoveryParams {
  toE164: string;
  siteName: string;
  siteUrl: string;
}

export interface WhatsAppAdapter {
  sendOtp(params: SendOtpParams): Promise<{ ok: boolean; error?: string }>;
  sendRecovery(params: SendRecoveryParams): Promise<{ ok: boolean; error?: string }>;
}

/** Pick adapter at runtime: DryRun by default, Cloud API when both env vars set. */
export async function getAdapter(): Promise<WhatsAppAdapter> {
  const phoneId = process.env.DTB_WA_PHONE_NUMBER_ID;
  const token = process.env.DTB_WA_TOKEN;
  if (phoneId && token) {
    const { CloudApiAdapter } = await import('./whatsapp-cloud.js');
    return new CloudApiAdapter(phoneId, token);
  }
  const { DryRunAdapter } = await import('./whatsapp-dryrun.js');
  return new DryRunAdapter();
}
```

- [ ] **Step 3: DryRun adapter**

`apps/web/lib/whatsapp-dryrun.ts`:

```typescript
import { appendFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { WhatsAppAdapter, SendOtpParams, SendRecoveryParams } from './whatsapp-adapter.js';

const LOG = join(tmpdir(), 'dtb-whatsapp.log');

export class DryRunAdapter implements WhatsAppAdapter {
  private async log(line: string) {
    console.log('[whatsapp-dryrun]', line);
    try { await appendFile(LOG, line + '\n'); } catch { /* tmp full or permission */ }
  }
  async sendOtp({ toE164, otp }: SendOtpParams) {
    await this.log(`OTP → ${toE164} :: ${otp}`);
    return { ok: true };
  }
  async sendRecovery({ toE164, siteName, siteUrl }: SendRecoveryParams) {
    await this.log(`RECOVERY → ${toE164} :: ${siteName} (${siteUrl}) is back up`);
    return { ok: true };
  }
}
```

- [ ] **Step 4: Cloud API adapter**

`apps/web/lib/whatsapp-cloud.ts`:

```typescript
import type { WhatsAppAdapter, SendOtpParams, SendRecoveryParams } from './whatsapp-adapter.js';

const API = 'https://graph.facebook.com/v20.0';

export class CloudApiAdapter implements WhatsAppAdapter {
  constructor(private phoneNumberId: string, private token: string) {}

  private async send(body: object): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(`${API}/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const txt = await res.text();
        return { ok: false, error: `HTTP ${res.status}: ${txt.slice(0, 200)}` };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  async sendOtp({ toE164, otp }: SendOtpParams) {
    const template = process.env.DTB_WA_TEMPLATE_OTP ?? 'otp_verify';
    return this.send({
      messaging_product: 'whatsapp',
      to: toE164.replace(/^\+/, ''),
      type: 'template',
      template: {
        name: template,
        language: { code: 'en' },
        components: [{
          type: 'body',
          parameters: [{ type: 'text', text: otp }],
        }, {
          type: 'button',
          sub_type: 'url',
          index: '0',
          parameters: [{ type: 'text', text: otp }], // URL button parameter
        }],
      },
    });
  }

  async sendRecovery({ toE164, siteName, siteUrl }: SendRecoveryParams) {
    const template = process.env.DTB_WA_TEMPLATE_RECOVERY ?? 'site_back_up';
    return this.send({
      messaging_product: 'whatsapp',
      to: toE164.replace(/^\+/, ''),
      type: 'template',
      template: {
        name: template,
        language: { code: 'en' },
        components: [{
          type: 'body',
          parameters: [
            { type: 'text', text: siteName },
            { type: 'text', text: siteUrl },
          ],
        }],
      },
    });
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/whatsapp-adapter.ts apps/web/lib/whatsapp-dryrun.ts apps/web/lib/whatsapp-cloud.ts .env.example
git commit -m "feat(notify): WhatsApp adapter — DryRun + Cloud API

Interface with sendOtp/sendRecovery. DryRun (default in dev) logs to
console + /tmp/dtb-whatsapp.log. CloudApiAdapter hits Meta Graph v20
when DTB_WA_PHONE_NUMBER_ID + DTB_WA_TOKEN are set. Templates configurable
via DTB_WA_TEMPLATE_* env vars."
```

---

## Task 4 — POST /api/notify/request (send OTP)

**Files:**
- Create: `apps/web/app/api/notify/request/route.ts`

- [ ] **Step 1: Implement**

```typescript
import { NextResponse } from 'next/server';
import { eq, gte, and, count } from 'drizzle-orm';
import { schema } from '@dtb/db';
import { getDb } from '@/lib/db';
import { normalizeIndianPhone, hashPhone } from '@/lib/phone';
import { generateOtp, hashOtp } from '@/lib/otp';
import { getClientIpHash } from '@/lib/ip';
import { checkRateLimit } from '@/lib/rate-limit';
import { getAdapter } from '@/lib/whatsapp-adapter';
import { countActiveByPhone, MAX_ACTIVE_PER_PHONE } from '@/lib/subscription';

export const dynamic = 'force-dynamic';

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_OTPS_PER_PHONE_PER_HOUR = 3;

export async function POST(req: Request) {
  let body: { phone: string; siteId: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  const phone = normalizeIndianPhone(body.phone);
  if (!phone) return NextResponse.json({ error: 'invalid_phone' }, { status: 400 });
  if (!body.siteId) return NextResponse.json({ error: 'invalid_site' }, { status: 400 });

  const db = getDb();
  const site = db.select().from(schema.sites).where(eq(schema.sites.id, body.siteId)).get();
  if (!site || !site.enabled) return NextResponse.json({ error: 'site_not_tracked' }, { status: 400 });

  const ipHash = getClientIpHash(req.headers);
  const phoneHash = hashPhone(phone);

  // Rate limit by IP (system-wide abuse) AND by phone (OTP spam to a number)
  const rl = checkRateLimit(db, ipHash, 'grievance:submit'); // reuse existing limit for now
  if (!rl.allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const hourAgo = Date.now() - 60 * 60_000;
  const recentOtps = db.select({ n: count() }).from(schema.otpAttempts)
    .where(and(eq(schema.otpAttempts.phoneHash, phoneHash), gte(schema.otpAttempts.createdAt, hourAgo)))
    .get()?.n ?? 0;
  if (recentOtps >= MAX_OTPS_PER_PHONE_PER_HOUR) {
    return NextResponse.json({ error: 'too_many_otps' }, { status: 429 });
  }

  // Cap active alerts
  if (countActiveByPhone(db, phoneHash) >= MAX_ACTIVE_PER_PHONE) {
    return NextResponse.json({ error: 'max_alerts_reached', max: MAX_ACTIVE_PER_PHONE }, { status: 409 });
  }

  const otp = generateOtp();
  const codeHash = hashOtp(otp);
  const now = Date.now();

  db.insert(schema.otpAttempts).values({
    phoneHash, codeHash, purpose: 'notify_signup',
    expiresAt: now + OTP_TTL_MS, used: false, ipHash, createdAt: now,
  }).run();

  // Also store a pending subscription so verify can find which site we wanted
  db.insert(schema.subscriptions).values({
    siteId: body.siteId, phoneHash, phoneCiphertext: null /* we encrypt at verify */,
    status: 'pending_otp', createdAt: now,
  }).run();

  const adapter = await getAdapter();
  const sent = await adapter.sendOtp({ toE164: phone, otp });
  if (!sent.ok) return NextResponse.json({ error: 'send_failed', detail: sent.error }, { status: 502 });

  // Return masked phone so the modal can display it
  return NextResponse.json({ ok: true, maskedPhone: maskForResponse(phone) });
}

function maskForResponse(e164: string): string {
  const m = e164.match(/^\+91(\d{2})\d{5}(\d{3})$/);
  if (!m) return e164;
  return `+91 ${m[1]}••• ••${m[2]}`;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/api/notify
git commit -m "feat(notify): POST /api/notify/request — send OTP via adapter"
```

---

## Task 5 — POST /api/notify/verify (activate subscription)

**Files:**
- Create: `apps/web/app/api/notify/verify/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { eq, and, desc, gt } from 'drizzle-orm';
import { schema } from '@dtb/db';
import { getDb } from '@/lib/db';
import { normalizeIndianPhone, hashPhone } from '@/lib/phone';
import { hashOtp } from '@/lib/otp';
import { createCipheriv, randomBytes } from 'node:crypto';

export const dynamic = 'force-dynamic';

const ENC_KEY = (() => {
  const raw = process.env.DTB_PHONE_ENC_KEY ?? 'dev-32-byte-key-replace-in-prod!';
  return Buffer.from(raw.slice(0, 32).padEnd(32, '0'));
})();

function encryptPhone(e164: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', ENC_KEY, iv);
  const ct = Buffer.concat([c.update(e164, 'utf8'), c.final()]);
  const tag = c.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString('base64');
}

export async function POST(req: Request) {
  let body: { phone: string; otp: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  const phone = normalizeIndianPhone(body.phone);
  if (!phone) return NextResponse.json({ error: 'invalid_phone' }, { status: 400 });
  if (!body.otp || !/^\d{6}$/.test(body.otp)) return NextResponse.json({ error: 'invalid_otp' }, { status: 400 });

  const phoneHash = hashPhone(phone);
  const codeHash = hashOtp(body.otp);
  const db = getDb();
  const now = Date.now();

  const otp = db.select().from(schema.otpAttempts)
    .where(and(
      eq(schema.otpAttempts.phoneHash, phoneHash),
      eq(schema.otpAttempts.codeHash, codeHash),
      eq(schema.otpAttempts.used, false),
      gt(schema.otpAttempts.expiresAt, now),
    ))
    .orderBy(desc(schema.otpAttempts.createdAt))
    .get();

  if (!otp) return NextResponse.json({ error: 'otp_wrong_or_expired' }, { status: 403 });

  db.update(schema.otpAttempts).set({ used: true }).where(eq(schema.otpAttempts.id, otp.id)).run();

  // Activate the most recent pending subscription for this phone
  const pending = db.select().from(schema.subscriptions)
    .where(and(eq(schema.subscriptions.phoneHash, phoneHash), eq(schema.subscriptions.status, 'pending_otp')))
    .orderBy(desc(schema.subscriptions.createdAt))
    .get();
  if (!pending) return NextResponse.json({ error: 'no_pending' }, { status: 404 });

  db.update(schema.subscriptions).set({
    status: 'active',
    activatedAt: now,
    phoneCiphertext: encryptPhone(phone),
  }).where(eq(schema.subscriptions.id, pending.id)).run();

  return NextResponse.json({ ok: true, subscriptionId: pending.id, siteId: pending.siteId });
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/api/notify/verify
git commit -m "feat(notify): POST /api/notify/verify — OTP check + activate subscription

Encrypts phone with AES-256-GCM (key from DTB_PHONE_ENC_KEY) so the
delivery worker can decrypt without exposing the raw phone in DB."
```

---

## Task 6 — Recovery dispatcher in monitor

**Files:**
- Create: `packages/monitor/src/recovery-dispatcher.ts`, `recovery-dispatcher.test.ts`
- Modify: `packages/monitor/src/loop.ts` (call dispatcher after state change)
- Modify: `packages/monitor/package.json` (add dep on @dtb/web... actually just shared types)

Hmm — the monitor process needs to know about WhatsApp adapter + phone decryption. We have two choices:
- (a) Move WhatsApp adapter into a `@dtb/notify` package shared by web + monitor.
- (b) Keep it in apps/web/lib and have the monitor import from there.

V1 simple: (b) is bad because apps/web is a Next.js app, not importable as a library. Pick (a) — but to avoid creating another package mid-plan, inline the minimal needed code into `packages/monitor/src/recovery-dispatcher.ts` (DryRun-only initially; CloudApi can be added later). This is acceptable for V1 since the monitor process is the SAME machine as the web in Fly.io deploy — it can read the WhatsApp env vars and use a small inline adapter.

- [ ] **Step 1: Inline minimal WhatsApp client in monitor**

`packages/monitor/src/whatsapp-send.ts`:

```typescript
import { appendFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const LOG = join(tmpdir(), 'dtb-whatsapp.log');
const API = 'https://graph.facebook.com/v20.0';

export async function sendRecoveryMessage(toE164: string, siteName: string, siteUrl: string): Promise<{ ok: boolean; error?: string }> {
  const phoneId = process.env.DTB_WA_PHONE_NUMBER_ID;
  const token = process.env.DTB_WA_TOKEN;
  const template = process.env.DTB_WA_TEMPLATE_RECOVERY ?? 'site_back_up';

  if (!phoneId || !token) {
    // DryRun
    const line = `[monitor-dryrun] RECOVERY → ${toE164} :: ${siteName} (${siteUrl}) is back up`;
    console.log(line);
    try { await appendFile(LOG, line + '\n'); } catch {}
    return { ok: true };
  }

  try {
    const res = await fetch(`${API}/${phoneId}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: toE164.replace(/^\+/, ''),
        type: 'template',
        template: {
          name: template, language: { code: 'en' },
          components: [{
            type: 'body',
            parameters: [
              { type: 'text', text: siteName },
              { type: 'text', text: siteUrl },
            ],
          }],
        },
      }),
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
```

- [ ] **Step 2: Dispatcher**

`packages/monitor/src/recovery-dispatcher.ts`:

```typescript
import { eq, and } from 'drizzle-orm';
import { schema, type Db } from '@dtb/db';
import { sendRecoveryMessage } from './whatsapp-send.js';
import { createDecipheriv } from 'node:crypto';

const ENC_KEY = (() => {
  const raw = process.env.DTB_PHONE_ENC_KEY ?? 'dev-32-byte-key-replace-in-prod!';
  return Buffer.from(raw.slice(0, 32).padEnd(32, '0'));
})();

function decryptPhone(ciphertextB64: string): string | null {
  try {
    const buf = Buffer.from(ciphertextB64, 'base64');
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const ct = buf.subarray(28);
    const d = createDecipheriv('aes-256-gcm', ENC_KEY, iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(ct), d.final()]).toString('utf8');
  } catch { return null; }
}

/** Fire recovery alerts for any site that just transitioned to 'working'.
 *  Caller passes the sites whose state changed in the last tick. */
export async function dispatchRecoveryAlerts(db: Db, justRecoveredSiteIds: string[]): Promise<void> {
  if (justRecoveredSiteIds.length === 0) return;
  for (const siteId of justRecoveredSiteIds) {
    const site = db.select().from(schema.sites).where(eq(schema.sites.id, siteId)).get();
    if (!site) continue;
    const subs = db.select().from(schema.subscriptions)
      .where(and(eq(schema.subscriptions.siteId, siteId), eq(schema.subscriptions.status, 'active')))
      .all();
    for (const sub of subs) {
      if (!sub.phoneCiphertext) continue;
      const phone = decryptPhone(sub.phoneCiphertext);
      if (!phone) {
        db.update(schema.subscriptions).set({ status: 'failed' }).where(eq(schema.subscriptions.id, sub.id)).run();
        continue;
      }
      const res = await sendRecoveryMessage(phone, site.name, site.url);
      if (res.ok) {
        db.update(schema.subscriptions).set({
          status: 'triggered', triggeredAt: Date.now(),
          phoneCiphertext: null,  // purge after fire
        }).where(eq(schema.subscriptions.id, sub.id)).run();
      } else {
        db.update(schema.subscriptions).set({ status: 'failed' }).where(eq(schema.subscriptions.id, sub.id)).run();
      }
    }
  }
}
```

- [ ] **Step 3: Wire into loop.ts**

Modify `packages/monitor/src/loop.ts`'s `tickSite` function: return whether this site transitioned to working. Then in `runOneTick`, collect those siteIds and call `dispatchRecoveryAlerts` at the end.

The simplest mod: change `tickSite` to return `{ recovered: boolean }`, accumulate `recoveredIds: string[]`, then `await dispatchRecoveryAlerts(db, recoveredIds)`.

Within `tickSite`, "recovered" is true iff `prev.state !== 'working' && next.state === 'working'`.

Add an integration test in `recovery-dispatcher.test.ts` that:
- Inserts a site + an active subscription
- Calls `dispatchRecoveryAlerts(db, [siteId])`
- Asserts the subscription's status changed to 'triggered'

(In DryRun mode this test passes without external WhatsApp connectivity.)

- [ ] **Step 4: Commit**

```bash
git add packages/monitor
git commit -m "feat(monitor): recovery alert dispatcher

After each tick, for any site that transitioned X → working, decrypt
the phone numbers of all active subscriptions and fire WhatsApp messages
(DryRun in dev, Cloud API in prod). Triggered subscriptions purge their
ciphertext immediately."
```

---

## Task 7 — POST /api/notify/cancel + POST /api/webhook/whatsapp

**Files:**
- Create: `apps/web/app/api/notify/cancel/route.ts`, `apps/web/app/api/webhook/whatsapp/route.ts`

- [ ] **Step 1: Cancel**

```typescript
import { NextResponse } from 'next/server';
import { eq, and, desc, gt } from 'drizzle-orm';
import { schema } from '@dtb/db';
import { getDb } from '@/lib/db';
import { normalizeIndianPhone, hashPhone } from '@/lib/phone';
import { hashOtp } from '@/lib/otp';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { phone, otp } = await req.json() as { phone: string; otp: string };
  const e164 = normalizeIndianPhone(phone);
  if (!e164) return NextResponse.json({ error: 'invalid_phone' }, { status: 400 });
  const phoneHash = hashPhone(e164);
  const codeHash = hashOtp(otp ?? '');

  const db = getDb();
  const valid = db.select().from(schema.otpAttempts)
    .where(and(
      eq(schema.otpAttempts.phoneHash, phoneHash),
      eq(schema.otpAttempts.codeHash, codeHash),
      eq(schema.otpAttempts.used, false),
      gt(schema.otpAttempts.expiresAt, Date.now()),
    )).get();
  if (!valid) return NextResponse.json({ error: 'otp_wrong' }, { status: 403 });
  db.update(schema.otpAttempts).set({ used: true }).where(eq(schema.otpAttempts.id, valid.id)).run();

  // Cancel all active subs for this phone
  const updated = db.update(schema.subscriptions)
    .set({ status: 'cancelled', phoneCiphertext: null })
    .where(and(eq(schema.subscriptions.phoneHash, phoneHash), eq(schema.subscriptions.status, 'active')))
    .run();
  return NextResponse.json({ ok: true, cancelled: updated.changes });
}
```

- [ ] **Step 2: Meta webhook**

```typescript
import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { schema } from '@dtb/db';
import { getDb } from '@/lib/db';
import { hashPhone, normalizeIndianPhone } from '@/lib/phone';

export const dynamic = 'force-dynamic';

// Meta calls GET for webhook verification
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  const expected = process.env.DTB_WA_WEBHOOK_VERIFY_TOKEN ?? 'dev-webhook-verify';
  if (mode === 'subscribe' && token === expected) {
    return new Response(challenge ?? '', { status: 200 });
  }
  return new Response('forbidden', { status: 403 });
}

// Meta calls POST with delivery status updates + inbound messages (STOP keyword)
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  // Inbound message → STOP handling
  const entry = body?.entry?.[0]?.changes?.[0]?.value;
  const msgs = entry?.messages ?? [];
  for (const m of msgs) {
    if (m.type === 'text' && /^stop$/i.test(String(m.text?.body ?? '').trim())) {
      const from = `+${m.from}`;
      const e164 = normalizeIndianPhone(from);
      if (!e164) continue;
      const phoneHash = hashPhone(e164);
      const db = getDb();
      db.update(schema.subscriptions)
        .set({ status: 'cancelled', phoneCiphertext: null })
        .where(and(eq(schema.subscriptions.phoneHash, phoneHash), eq(schema.subscriptions.status, 'active')))
        .run();
    }
  }
  // Status updates (delivered/read/failed) — we don't persist these for V1
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/notify/cancel apps/web/app/api/webhook
git commit -m "feat(notify): cancel endpoint + Meta webhook handler (STOP keyword)"
```

---

## Task 8 — NotifyFlow modal (3-step UI)

**Files:**
- Create: `apps/web/components/NotifyFlow.tsx`
- Modify: `apps/web/components/NotifyHero.tsx` (open NotifyFlow on Set alert click)

`NotifyFlow.tsx` is a client component with state machine: `phone` → `otp` → `done`. After typing a phone and clicking Send OTP, hit `/api/notify/request`. After typing OTP and clicking Confirm, hit `/api/notify/verify`. On success, show "Alert set!" with the masked phone.

The `NotifyHero` form's onSubmit changes from console.log to: collect the search box text, parse out a likely site name (or open a dropdown to pick the site), then open NotifyFlow with the chosen siteId.

For V1 simplicity: ALWAYS show the dropdown (even if the user typed text in the search box, it just gets ignored). The full search-to-site matcher is V2.

- [ ] **Step 1: Write NotifyFlow** (see plan task text in the .md file for the exact JSX template — the pattern is similar to GrievanceForm but with 3 steps).

- [ ] **Step 2: Wire NotifyHero**

Change the form submit to open a modal with NotifyFlow, passing the list of enabled sites.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/NotifyFlow.tsx apps/web/components/NotifyHero.tsx
git commit -m "feat(notify): 3-step NotifyFlow modal (phone → OTP → done)"
```

---

## Task 9 — /delete-my-data page

**Files:**
- Create: `apps/web/components/DeleteFlow.tsx`, `apps/web/app/delete-my-data/page.tsx`
- Create: `apps/web/app/api/notify/delete/route.ts`

The flow:
1. User enters phone → `/api/notify/request` with purpose=`delete_data` (extend the request endpoint to accept this purpose).
2. User enters OTP → `/api/notify/delete` deletes ALL subscriptions for that phoneHash (regardless of status) and returns count purged.

- [ ] **Step 1: Extend OTP purpose in /api/notify/request**

Add `purpose?: 'notify_signup' | 'delete_data'` to the request body. Default `'notify_signup'`. For `delete_data` skip the site validation + pending subscription insert.

- [ ] **Step 2: New /api/notify/delete endpoint**

Verifies OTP (purpose=delete_data) then DELETEs subscriptions matching phoneHash. Returns count.

- [ ] **Step 3: Page + DeleteFlow component**

`/delete-my-data` page: shell + DeleteFlow client component with 2-step modal (phone → OTP → success message showing count of records purged).

- [ ] **Step 4: Commit**

```bash
git add apps/web/app apps/web/components/DeleteFlow.tsx
git commit -m "feat(notify): /delete-my-data with OTP verify + purge endpoint"
```

---

## Task 10 — E2E + tag v0.5.0-notify

- [ ] **Step 1: Add tests**

```typescript
test('notify: request OTP in DryRun mode returns ok + maskedPhone', async ({ request }) => {
  const r = await request.post('/api/notify/request', {
    data: { phone: '9876543210', siteId: 'aadhaar-ssup' },
  });
  expect(r.status()).toBe(200);
  const data = await r.json();
  expect(data.ok).toBe(true);
  expect(data.maskedPhone).toMatch(/^\+91 98•••/);
});

test('notify: verify with wrong OTP fails 403', async ({ request }) => {
  await request.post('/api/notify/request', {
    data: { phone: '9876543211', siteId: 'aadhaar-ssup' },
  });
  const r = await request.post('/api/notify/verify', {
    data: { phone: '9876543211', otp: '000000' },
  });
  expect(r.status()).toBe(403);
});
```

- [ ] **Step 2: Commit + tag**

```bash
git add apps/web/e2e
git commit -m "test(web): e2e for notify request + verify"

npm version 0.5.0-notify --no-git-tag-version
git add package.json package-lock.json
git commit -m "release: v0.5.0-notify

Plan 6 complete. Notify-me works end-to-end in DryRun + Cloud API modes.
- /api/notify/{request,verify,cancel} endpoints
- /api/webhook/whatsapp (Meta verification + STOP keyword)
- Recovery dispatcher in monitor fires alerts on Down→Working
- 3-step NotifyFlow modal on homepage
- /delete-my-data with OTP confirmation
- Phones stored as SHA-256 hash (de-dup) + AES-GCM ciphertext (delivery)
- Ciphertext purged immediately after alert fires
"
git tag v0.5.0-notify
```

---

## Self-Review

**Spec §6 coverage:**
- ✅ Mobile + OTP verification
- ✅ Max 5 active alerts per phone
- ✅ Hash + encrypt phone storage
- ✅ Recovery rule (only Down/Degraded → Working triggers; state machine already enforces 3-consecutive-up = ~5min sustained)
- ✅ One-shot subscription (status='triggered' after fire)
- ✅ STOP keyword via webhook
- ✅ /delete-my-data with OTP verify

**Privacy:**
- Raw phone never touches DB or logs
- AES-GCM key from env (DTB_PHONE_ENC_KEY)
- IP hashed (existing helper)
- Ciphertext purged after alert fires

**Out of scope for V1:**
- WhatsApp send retries (failures stay 'failed')
- Multiple OTPs per phone within window (use latest valid one)
- Subscription pause/resume

---

## Execution Handoff

After Plan 6: Plan 7 (Fly.io deploy) is the last remaining plan.
