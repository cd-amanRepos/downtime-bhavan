import { eq } from 'drizzle-orm';
import { schema } from '@dtb/db';
import { getDb } from '@/lib/db';
import { PageShell } from '@/components/PageShell';
import { JsonLd } from '@/components/JsonLd';
import { buildMetadata } from '@/lib/seo/metadata';
import {
  buildBreadcrumbSchema,
  buildItemListSchema,
} from '@/lib/seo/schema';
import { SITE_URL } from '@/lib/seo/constants';

export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Tracked Indian government websites',
  description:
    'All Indian government websites currently tracked by Downtime Bhavan, with live status and 30-day uptime.',
  path: '/sites',
});

type SiteState = 'working' | 'degraded' | 'down';

const STATE_LABEL: Record<SiteState, string> = {
  working: 'WORKING',
  degraded: 'DEGRADED',
  down: 'UNREACHABLE',
};

const STATE_COLOR: Record<SiteState, string> = {
  working: 'var(--color-green)',
  degraded: 'var(--color-amber)',
  down: 'var(--color-red)',
};

const STATE_SOFT: Record<SiteState, string> = {
  working: 'var(--color-green-soft)',
  degraded: 'var(--color-amber-soft)',
  down: 'var(--color-red-soft)',
};

export default async function Page() {
  const db = getDb();
  const sites = db
    .select({
      id: schema.sites.id,
      name: schema.sites.name,
      url: schema.sites.url,
    })
    .from(schema.sites)
    .where(eq(schema.sites.enabled, true))
    .all();

  const statuses = db.select().from(schema.siteStatus).all();
  const statusMap = new Map(statuses.map((s) => [s.siteId, s]));

  return (
    <PageShell active="status">
      <JsonLd
        data={[
          buildBreadcrumbSchema([
            { name: 'Home', url: SITE_URL },
            { name: 'Sites', url: `${SITE_URL}/sites` },
          ]),
          buildItemListSchema({
            items: sites.map((s) => ({
              url: `${SITE_URL}/sites/${s.id}`,
              name: s.name,
            })),
          }),
        ]}
      />

      <div className="max-w-3xl mx-auto py-12 px-7">
        <h1 className="text-3xl font-bold tracking-tight mb-3">Tracked sites</h1>
        <p className="text-[var(--color-ink-dim)] mb-2 leading-relaxed">
          These are the Indian government websites currently observed by Downtime
          Bhavan. Status updates roughly every two minutes from an Indian VPS.
          The list grows as we add headless validation for more portals.
        </p>
        <p
          className="text-[var(--color-ink-dim)] mb-8 text-sm"
          style={{ fontFamily: 'var(--font-hi)' }}
        >
          विभाग स्थिति · {sites.length}{' '}
          {sites.length === 1 ? 'portal' : 'portals'} currently observed
        </p>

        <ul className="border border-[var(--color-border)] rounded-2xl overflow-hidden bg-[var(--color-paper)]">
          {sites.map((s) => {
            const status = statusMap.get(s.id);
            const state: SiteState =
              (status?.currentState as SiteState | undefined) ?? 'working';
            const uptime = status?.uptime30dPct ?? null;
            const color = STATE_COLOR[state];
            const soft = STATE_SOFT[state];
            const label = STATE_LABEL[state];

            return (
              <li key={s.id}>
                <a
                  href={`/sites/${s.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-[var(--color-paper-2)] border-b border-[var(--color-border)] last:border-b-0 no-underline text-inherit transition-colors"
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span
                      aria-label={`${label} status indicator`}
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{
                        background: color,
                        boxShadow: `0 0 0 3px ${soft}`,
                      }}
                    />
                    <span className="font-medium text-[var(--color-ink)] tracking-tight truncate">
                      {s.name}
                    </span>
                  </span>
                  <span className="flex items-center gap-2 shrink-0 ml-4">
                    <span
                      className="text-[11px] font-bold uppercase tracking-[0.12em]"
                      style={{ color }}
                    >
                      {label}
                    </span>
                    <span className="text-[var(--color-ink-faint)]">·</span>
                    <span className="text-xs text-[var(--color-ink-dim)] tabular-nums">
                      {uptime === null
                        ? 'Tracking started recently'
                        : `${uptime.toFixed(1)}%`}
                    </span>
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </PageShell>
  );
}
