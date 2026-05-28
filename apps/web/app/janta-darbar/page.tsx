import { PageShell } from '@/components/PageShell';
import { GrievanceListPage } from '@/components/GrievanceListPage';
import { eq, desc, and, gte } from 'drizzle-orm';
import { schema } from '@dtb/db';
import { getDb } from '@/lib/db';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd } from '@/components/JsonLd';
import {
  buildBreadcrumbSchema,
  buildItemListSchema,
} from '@/lib/seo/schema';
import { SITE_URL } from '@/lib/seo/constants';

export const dynamic = 'force-dynamic';
export const metadata = buildMetadata({
  title: 'Janta Darbar · citizen grievances against Indian government websites',
  description: "Live citizen grievances against India's government portals — tagged, time-stamped, and anonymous. The public-pulse layer of Downtime Bhavan.",
  path: '/janta-darbar',
});

export default async function Page() {
  const db = getDb();
  const sites = db.select().from(schema.sites).where(eq(schema.sites.enabled, true)).all();
  const since = Date.now() - 24 * 60 * 60 * 1000; // last 24h instead of 60min on the homepage

  const recent = db.select().from(schema.grievances)
    .where(and(eq(schema.grievances.visible, true), gte(schema.grievances.createdAt, since)))
    .orderBy(desc(schema.grievances.createdAt))
    .limit(200)
    .all();

  const reactionRows = db.select().from(schema.reactions).all();
  const counts: Record<number, Record<string, number>> = {};
  for (const r of reactionRows) {
    const m = counts[r.grievanceId] ?? (counts[r.grievanceId] = {});
    m[r.kind] = (m[r.kind] ?? 0) + 1;
  }
  const statuses = db.select().from(schema.siteStatus).all();
  const stateById = new Map(statuses.map((s) => [s.siteId, s.currentState] as const));

  const initial = recent.map((g) => ({
    id: g.id, siteId: g.siteId, tag: g.tag, body: g.body, createdAt: g.createdAt,
    reactions: counts[g.id] ?? {},
  }));
  const siteLookup = sites.map((s) => ({ id: s.id, name: s.name, state: stateById.get(s.id) }));

  const jsonLd: object[] = [
    buildBreadcrumbSchema([
      { name: 'Home', url: SITE_URL },
      { name: 'Janta Darbar', url: `${SITE_URL}/janta-darbar` },
    ]),
    buildItemListSchema({
      items: recent.slice(0, 10).map((g) => ({
        url: `${SITE_URL}/sites/${g.siteId}`,
        name: `${g.tag} — ${g.body.slice(0, 60)}`,
      })),
    }),
  ];

  return (
    <PageShell active="janta-darbar">
      <JsonLd data={jsonLd} />
      <div className="mb-8">
        <span className="block text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-faint)] mb-1">
          {initial.length} grievances · Last 24 hours
        </span>
        <h1 className="text-3xl font-bold tracking-tight flex items-baseline gap-3">
          Janta Darbar
          <span className="text-xl text-[var(--color-blue)] font-medium" style={{ fontFamily: 'var(--font-hi)' }}>जनता दरबार</span>
        </h1>
        <p className="text-[var(--color-ink-dim)] mt-2 max-w-[640px]">
          The people's court of broken portals. Filter by department, sort by recency or
          most-reacted, file your own.
        </p>
      </div>

      <GrievanceListPage initial={initial} sites={siteLookup} />
    </PageShell>
  );
}
