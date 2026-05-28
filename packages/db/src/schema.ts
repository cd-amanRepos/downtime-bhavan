import { sqliteTable, text, integer, real, index, primaryKey } from 'drizzle-orm/sqlite-core';

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
    httpStatus: integer('http_status'), // null when the request never reached an HTTP response (network error, timeout)
    latencyMs: integer('latency_ms'), // null when the request errored before measurement was meaningful
    failureReason: text('failure_reason'), // null when result === 'up'
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
  uptime30dPct: real('uptime_30d_pct'), // null until we have ≥5 samples in the last 30 days
  lastCheckAt: integer('last_check_at').notNull(),
  communityFlag: integer('community_flag', { mode: 'boolean' })
    .notNull()
    .default(false),
});

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
