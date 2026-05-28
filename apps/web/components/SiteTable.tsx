import { eq, desc } from 'drizzle-orm';
import { schema } from '@dtb/db';
import { getDb } from '@/lib/db';
import { buildLast24h } from '@/lib/status-derive';
import { Sparkline } from './Sparkline.js';
import type { SiteStatusSnapshot } from '@dtb/shared';

const STATE_LABEL: Record<SiteStatusSnapshot['currentState'], string> = {
  working: 'Working', degraded: 'Degraded', down: 'Down',
};
const STATE_COLOR: Record<SiteStatusSnapshot['currentState'], string> = {
  working: 'var(--color-green)', degraded: 'var(--color-amber)', down: 'var(--color-red)',
};
const STATE_SOFT: Record<SiteStatusSnapshot['currentState'], string> = {
  working: 'var(--color-green-soft)', degraded: 'var(--color-amber-soft)', down: 'var(--color-red-soft)',
};

const STATE_RANK: Record<SiteStatusSnapshot['currentState'], number> = {
  down: 0, degraded: 1, working: 2,
};

export async function SiteTable() {
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

  // Worst-first sort (most broken at the top is the most useful default)
  snapshots.sort((a, b) => {
    const r = STATE_RANK[a.currentState] - STATE_RANK[b.currentState];
    if (r !== 0) return r;
    return (a.uptime30dPct ?? 100) - (b.uptime30dPct ?? 100);
  });

  return (
    <div className="border border-[var(--color-border)] rounded-2xl overflow-hidden bg-[var(--color-paper)]">
      <table className="w-full">
        <thead className="bg-[var(--color-paper-2)] border-b border-[var(--color-border)]">
          <tr className="text-left text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-faint)]">
            <th className="px-5 py-3 w-[60px]">#</th>
            <th className="px-3 py-3">Department</th>
            <th className="px-3 py-3 w-[160px]">24-hour history</th>
            <th className="px-3 py-3 w-[100px] text-right">30d uptime</th>
            <th className="px-3 py-3 w-[120px]">Status</th>
          </tr>
        </thead>
        <tbody>
          {snapshots.map((s, i) => (
            <tr key={s.siteId} className="border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-paper-2)]">
              <td className="px-5 py-4 text-[12px] font-mono font-semibold text-[var(--color-ink-faint)]">{String(i+1).padStart(2,'0')}</td>
              <td className="px-3 py-4">
                <a href={`/sites/${s.siteId}`} className="block">
                  <div className="font-semibold text-[var(--color-ink)] tracking-tight">{s.name}</div>
                  <div className="text-[11.5px] text-[var(--color-ink-faint)] mt-0.5 font-medium">{s.url.replace(/^https?:\/\//, '')}</div>
                </a>
              </td>
              <td className="px-3 py-4">
                <Sparkline buckets={s.last24h} />
              </td>
              <td className="px-3 py-4 text-right">
                <span className="text-lg font-bold tabular-nums" style={{ color: STATE_COLOR[s.currentState] }}>
                  {s.uptime30dPct === null ? '—' : Math.round(s.uptime30dPct)}
                  <sup className="text-xs ml-px text-[var(--color-ink-faint)]">%</sup>
                </span>
              </td>
              <td className="px-3 py-4">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.1em]"
                      style={{ color: STATE_COLOR[s.currentState] }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: STATE_COLOR[s.currentState], boxShadow: `0 0 0 3px ${STATE_SOFT[s.currentState]}` }} />
                  {STATE_LABEL[s.currentState]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
