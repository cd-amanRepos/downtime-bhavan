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
