import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { eq, desc, gte, and } from 'drizzle-orm';
import { PageShell } from '@/components/PageShell';
import { SiteDetailHero } from '@/components/SiteDetailHero';
import { SiteDetailHistory } from '@/components/SiteDetailHistory';
import { schema } from '@dtb/db';
import { getDb } from '@/lib/db';
import { buildLast24h } from '@/lib/status-derive';
import { GrievancePost } from '@/components/GrievancePost';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd } from '@/components/JsonLd';
import { buildBreadcrumbSchema, buildDatasetSchema } from '@/lib/seo/schema';
import { SITE_URL } from '@/lib/seo/constants';
import type { SiteStatusSnapshot } from '@dtb/shared';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ siteId: string }> }): Promise<Metadata> {
  const { siteId } = await params;
  const db = getDb();
  const site = db.select({ name: schema.sites.name }).from(schema.sites).where(eq(schema.sites.id, siteId)).get();
  if (!site) {
    return buildMetadata({
      title: 'Site not found',
      description: "This portal is not in Downtime Bhavan's tracked list.",
      path: `/sites/${siteId}`,
      noindex: true,
    });
  }
  // Length-bound the title fragment. With "· Downtime Bhavan" suffix (~18 chars),
  // we want the fragment ≤ 48 chars so the rendered title stays ≤ 66 chars.
  const longFragment = `${site.name} status · is ${site.name} down right now?`;
  const titleFragment = longFragment.length <= 48 ? longFragment : `${site.name} status`;
  return buildMetadata({
    title: titleFragment,
    description: `Live status, 30-day uptime, and recent citizen grievances for ${site.name}. Free email alert when it recovers.`,
    path: `/sites/${siteId}`,
    type: 'website',
  });
}

export default async function Page({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const db = getDb();
  const site = db.select().from(schema.sites).where(eq(schema.sites.id, siteId)).get();
  if (!site || !site.enabled) notFound();

  const now = Date.now();
  const status = db.select().from(schema.siteStatus).where(eq(schema.siteStatus.siteId, site.id)).get();

  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const checks = db.select().from(schema.checks)
    .where(and(eq(schema.checks.siteId, site.id), gte(schema.checks.checkedAt, sevenDaysAgo)))
    .all()
    .map((r) => ({ checkedAt: r.checkedAt, result: r.result }));

  const last24h = buildLast24h(checks.filter((c) => c.checkedAt >= now - 24 * 60 * 60 * 1000), now);

  const snapshot: SiteStatusSnapshot = {
    siteId: site.id, name: site.name, url: site.url,
    currentState: status?.currentState ?? 'working',
    stateSince: status?.stateSince ?? now,
    uptime30dPct: status?.uptime30dPct ?? null,
    lastCheckAt: status?.lastCheckAt ?? now,
    communityFlag: status?.communityFlag ?? false,
    last24h,
  };

  // recent grievances for this site
  const grievances = db.select().from(schema.grievances)
    .where(and(
      eq(schema.grievances.siteId, site.id),
      eq(schema.grievances.visible, true),
    ))
    .orderBy(desc(schema.grievances.createdAt))
    .limit(8)
    .all();
  const reactionRows = db.select().from(schema.reactions).all();
  const reactionCounts: Record<number, Record<string, number>> = {};
  for (const r of reactionRows) {
    const m = reactionCounts[r.grievanceId] ?? (reactionCounts[r.grievanceId] = {});
    m[r.kind] = (m[r.kind] ?? 0) + 1;
  }

  const jsonLd: object[] = [
    buildBreadcrumbSchema([
      { name: 'Home', url: SITE_URL },
      { name: 'Sites', url: `${SITE_URL}/sites` },
      { name: site.name, url: `${SITE_URL}/sites/${site.id}` },
    ]),
    {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: site.name,
      url: site.url,
      serviceType: 'Government online service',
      provider: { '@type': 'GovernmentOrganization', name: site.name },
    },
    buildDatasetSchema({
      name: `${site.name} uptime — 30 day rolling`,
      description: `30-day rolling uptime percentage for ${site.name} as measured by Downtime Bhavan from an Indian VPS.`,
      url: `${SITE_URL}/sites/${site.id}`,
    }),
  ];

  return (
    <PageShell active="status">
      <JsonLd data={jsonLd} />
      <SiteDetailHero snapshot={snapshot} />
      <SiteDetailHistory checks={checks} />

      <section className="mb-8">
        <h2 className="text-base font-bold tracking-tight mb-4">
          Recent citizen grievances
          <span className="text-[var(--color-ink-faint)] font-medium ml-2">{grievances.length}</span>
        </h2>
        <div className="border border-[var(--color-border)] rounded-2xl overflow-hidden bg-[var(--color-paper)]">
          {grievances.length === 0
            ? <div className="px-7 py-8 text-center text-sm text-[var(--color-ink-dim)]">No active grievances against {site.name}.</div>
            : grievances.map((g) => (
                <GrievancePost key={g.id} grievance={{
                  id: g.id,
                  siteName: site.name,
                  siteState: snapshot.currentState,
                  tag: g.tag,
                  body: g.body,
                  createdAt: g.createdAt,
                  reactions: reactionCounts[g.id] ?? {},
                }} />
              ))
          }
        </div>
      </section>
    </PageShell>
  );
}
