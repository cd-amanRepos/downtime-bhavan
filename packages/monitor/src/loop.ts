import { eq, desc } from 'drizzle-orm';
import { schema, type Db } from '@dtb/db';
import { checkHttp } from './http-check.js';
import { deriveNextState, type PreviousState } from './state-machine.js';
import { dispatchRecoveryAlerts } from './recovery-dispatcher.js';

/** Run a single probe cycle: for each enabled site, run HTTP check,
 *  persist the result, and recompute site_status. */
export async function runOneTick(db: Db): Promise<void> {
  const sites = db.select().from(schema.sites).where(eq(schema.sites.enabled, true)).all();
  const recoveredIds: string[] = [];
  for (const site of sites) {
    const { recovered } = await tickSite(db, site);
    if (recovered) recoveredIds.push(site.id);
  }
  await dispatchRecoveryAlerts(db, recoveredIds);
}

async function tickSite(
  db: Db,
  site: typeof schema.sites.$inferSelect,
): Promise<{ recovered: boolean }> {
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

  const recovered = prev.state !== 'working' && next.state === 'working';
  return { recovered };
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
