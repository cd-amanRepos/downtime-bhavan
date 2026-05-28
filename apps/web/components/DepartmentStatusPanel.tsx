import { eq, desc } from 'drizzle-orm';
import { schema } from '@dtb/db';
import { getDb } from '@/lib/db';
import { buildLast24h } from '@/lib/status-derive';
import { StatusItem } from './StatusItem.js';
import type { SiteStatusSnapshot } from '@dtb/shared';

export async function DepartmentStatusPanel() {
  const db = getDb();
  const now = Date.now();
  const sites = db.select().from(schema.sites).where(eq(schema.sites.enabled, true)).all();

  const snapshots: SiteStatusSnapshot[] = sites.map((site) => {
    const status = db.select().from(schema.siteStatus).where(eq(schema.siteStatus.siteId, site.id)).get();
    const checks = db.select().from(schema.checks)
      .where(eq(schema.checks.siteId, site.id))
      .orderBy(desc(schema.checks.checkedAt))
      .all()
      .filter((r) => r.checkedAt >= now - 24 * 60 * 60 * 1000);
    return {
      siteId: site.id,
      name: site.name,
      url: site.url,
      currentState: status?.currentState ?? 'working',
      stateSince: status?.stateSince ?? now,
      uptime30dPct: status?.uptime30dPct ?? null,
      lastCheckAt: status?.lastCheckAt ?? now,
      communityFlag: status?.communityFlag ?? false,
      last24h: buildLast24h(checks.map((r) => ({ checkedAt: r.checkedAt, result: r.result })), now),
    };
  });

  const counts = {
    down: snapshots.filter((s) => s.currentState === 'down').length,
    degraded: snapshots.filter((s) => s.currentState === 'degraded').length,
    working: snapshots.filter((s) => s.currentState === 'working').length,
  };

  return (
    <section className="col col-side border-t lg:border-t-0 lg:border-r border-[var(--color-border)] bg-[var(--color-bg)] relative overflow-hidden">
      <div className="px-4 md:px-7 pt-5 md:pt-6 pb-4 border-b border-[var(--color-border)] bg-[var(--color-paper)]">
        <span className="block text-[10.5px] font-semibold text-[var(--color-ink-faint)] tracking-[0.18em] uppercase">
          {snapshots.length} Departments · Mumbai checkpoint
        </span>
        <h2 className="mt-1 text-lg font-bold tracking-tight flex items-baseline gap-2.5">
          Department Status
          <span className="text-sm text-[var(--color-blue)] font-medium" style={{ fontFamily: 'var(--font-hi)' }}>विभाग स्थिति</span>
        </h2>
        <span className="text-xs text-[var(--color-ink-dim)] mt-0.5">Refreshed every 2 minutes</span>

        <div className="flex gap-3.5 mt-2.5 flex-wrap text-[12.5px] text-[var(--color-ink-soft)] font-semibold">
          <Count label="Unreachable" value={counts.down} color="var(--color-red)" soft="var(--color-red-soft)" />
          <Count label="Degraded" value={counts.degraded} color="var(--color-amber)" soft="var(--color-amber-soft)" />
          <Count label="Working" value={counts.working} color="var(--color-green)" soft="var(--color-green-soft)" />
        </div>

        <div className="flex gap-3.5 mt-3.5 pt-3.5 border-t border-dashed border-[var(--color-border)] text-[11.5px] text-[var(--color-ink-faint)] font-medium">
          <a className="cursor-pointer pb-1 border-b border-[var(--color-blue)] text-[var(--color-blue)]">Worst first</a>
          <a className="cursor-pointer pb-1 border-b border-transparent">A–Z</a>
          <a className="cursor-pointer pb-1 border-b border-transparent">Reports</a>
        </div>
      </div>

      <div className="bg-[var(--color-paper)]">
        {snapshots.map((s) => <StatusItem key={s.siteId} snapshot={s} />)}
      </div>

      <a href="/departments" className="block px-4 md:px-7 py-3.5 text-center text-[11.5px] text-[var(--color-blue)] font-semibold bg-[var(--color-paper)] border-t border-[var(--color-border)] hover:bg-[var(--color-blue-soft)]">
        View all {snapshots.length} departments →
      </a>
    </section>
  );
}

function Count({ label, value, color, soft }: { label: string; value: number; color: string; soft: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 leading-none">
      <span className="w-[7px] h-[7px] rounded-full" style={{ background: color, boxShadow: `0 0 0 3px ${soft}` }} />
      <b className="font-bold" style={{ color }}>{value}</b> {label}
    </span>
  );
}
