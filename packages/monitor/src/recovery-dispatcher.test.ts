import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDb, schema } from '@dtb/db';
import { eq } from 'drizzle-orm';
import { dispatchRecoveryAlerts } from './recovery-dispatcher.js';
import { createCipheriv, randomBytes } from 'node:crypto';

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

/** Bootstrap an in-memory DB with all tables needed for the dispatcher. */
function makeDb() {
  const db = createDb(':memory:');
  const sqlite = (db as any).$client as import('better-sqlite3').Database;
  sqlite.exec(`
    CREATE TABLE sites (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, url TEXT NOT NULL,
      config_json TEXT NOT NULL DEFAULT '{}', enabled INTEGER DEFAULT 1
    );
    CREATE TABLE checks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site_id TEXT, checked_at INTEGER, layer TEXT, result TEXT,
      http_status INTEGER, latency_ms INTEGER, failure_reason TEXT
    );
    CREATE TABLE site_status (
      site_id TEXT PRIMARY KEY, current_state TEXT, state_since INTEGER,
      uptime_30d_pct REAL, last_check_at INTEGER, community_flag INTEGER DEFAULT 0
    );
    CREATE TABLE subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site_id TEXT NOT NULL,
      phone_hash TEXT NOT NULL,
      phone_ciphertext TEXT,
      kind TEXT NOT NULL DEFAULT 'email',
      status TEXT NOT NULL DEFAULT 'pending_otp',
      created_at INTEGER NOT NULL,
      activated_at INTEGER,
      triggered_at INTEGER
    );
  `);
  return db;
}

/** Same 32-byte dev key as the dispatcher's fallback. */
const DEV_KEY = Buffer.from('dev-32-byte-key-replace-in-prod!'.slice(0, 32).padEnd(32, '0'));

/** Encrypt a phone number using AES-256-GCM (12-byte IV | 16-byte tag | ciphertext). */
function encryptPhone(phone: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', DEV_KEY, iv);
  const ct = Buffer.concat([cipher.update(phone, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString('base64');
}

// ------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------

describe('dispatchRecoveryAlerts', () => {
  beforeEach(() => {
    // Ensure DryRun mode (no Meta creds) so sendRecoveryMessage just logs
    vi.stubEnv('DTB_WA_PHONE_NUMBER_ID', '');
    vi.stubEnv('DTB_WA_TOKEN', '');
  });

  it('returns early and does nothing when justRecoveredSiteIds is empty', async () => {
    const db = makeDb();
    // No sites or subscriptions seeded — would throw if it tried to query
    await expect(dispatchRecoveryAlerts(db, [])).resolves.toBeUndefined();
  });

  it('flips status to triggered and purges ciphertext for an active subscription', async () => {
    const db = makeDb();

    // Insert a site
    db.insert(schema.sites).values({
      id: 'aadhaar-ssup',
      name: 'Aadhaar Self-Service Portal',
      url: 'https://uidai.gov.in/ssup',
      configJson: '{}',
      enabled: true,
    }).run();

    const ciphertext = encryptPhone('+919876543210');

    // Insert an active subscription with an encrypted phone (WhatsApp kind)
    db.insert(schema.subscriptions).values({
      siteId: 'aadhaar-ssup',
      phoneHash: 'hash123',
      phoneCiphertext: ciphertext,
      kind: 'whatsapp',
      status: 'active',
      createdAt: Date.now(),
    }).run();

    await dispatchRecoveryAlerts(db, ['aadhaar-ssup']);

    const subs = db.select().from(schema.subscriptions).all();
    expect(subs).toHaveLength(1);
    expect(subs[0]?.status).toBe('triggered');
    expect(subs[0]?.phoneCiphertext).toBeNull();
    expect(subs[0]?.triggeredAt).toBeTypeOf('number');
  });

  it('skips (does not mutate) a subscription when phone_ciphertext is null', async () => {
    const db = makeDb();

    db.insert(schema.sites).values({
      id: 'passport-seva',
      name: 'Passport Seva',
      url: 'https://passportindia.gov.in',
      configJson: '{}',
      enabled: true,
    }).run();

    // Subscription with no ciphertext (e.g. after delete-my-data partial wipe)
    db.insert(schema.subscriptions).values({
      siteId: 'passport-seva',
      phoneHash: 'hash456',
      phoneCiphertext: null,
      kind: 'whatsapp',
      status: 'active',
      createdAt: Date.now(),
    }).run();

    await dispatchRecoveryAlerts(db, ['passport-seva']);

    // New dispatcher skips null-ciphertext subs silently — status stays unchanged
    const subs = db.select().from(schema.subscriptions).all();
    expect(subs).toHaveLength(1);
    expect(subs[0]?.status).toBe('active');
    expect(subs[0]?.phoneCiphertext).toBeNull();
  });
});
