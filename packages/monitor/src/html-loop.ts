import { eq, desc } from 'drizzle-orm';
import { schema, type Db } from '@dtb/db';
import { checkHtml } from './html-check.js';
import { deriveNextState, type PreviousState } from './state-machine.js';
import { dispatchRecoveryAlerts } from './recovery-dispatcher.js';

/** Run one HTML probe cycle: for each enabled site, fetch the page,
 *  validate selectors from its config, persist the result, and let the
 *  state machine react. Slower than HTTP-only tick (more bytes per probe,
 *  potential JS-less rendering quirks), so the daemon schedules this on
 *  a longer interval — every 15 min by default. */
export async function runOneHtmlTick(db: Db): Promise<void> {
  const sites = db.select().from(schema.sites).where(eq(schema.sites.enabled, true)).all();
  const recoveredIds: string[] = [];

  for (const site of sites) {
    let mustExist: readonly string[] = [];
    let mustNotExist: readonly string[] = [];
    try {
      const cfg = JSON.parse(site.configJson) as {
        selectors?: { mustExist?: string[]; mustNotExist?: string[] };
        headlessTimeoutMs?: number;
      };
      mustExist = cfg.selectors?.mustExist ?? [];
      mustNotExist = cfg.selectors?.mustNotExist ?? [];
    } catch {
      // Malformed config — fall back to bare "is the page non-empty HTML" check
    }

    const probe = await checkHtml(site.url, { mustExist, mustNotExist });
    db.insert(schema.checks).values({
      siteId: site.id,
      checkedAt: probe.checkedAt,
      layer: 'headless',
      result: probe.result,
      httpStatus: probe.httpStatus,
      latencyMs: probe.latencyMs,
      failureReason: probe.failureReason,
    }).run();

    const prevRow = db.select().from(schema.siteStatus)
      .where(eq(schema.siteStatus.siteId, site.id)).get();
    const prev: PreviousState = prevRow
      ? { state: prevRow.currentState, stateSince: prevRow.stateSince }
      : { state: 'working', stateSince: probe.checkedAt };

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
    db.update(schema.siteStatus)
      .set({ currentState: next.state, stateSince: next.stateSince, lastCheckAt: probe.checkedAt })
      .where(eq(schema.siteStatus.siteId, site.id))
      .run();

    if (prev.state !== 'working' && next.state === 'working') {
      recoveredIds.push(site.id);
    }
  }

  await dispatchRecoveryAlerts(db, recoveredIds);
}
