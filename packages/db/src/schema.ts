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
