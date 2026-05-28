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
