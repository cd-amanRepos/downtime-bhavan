import { PageShell } from '@/components/PageShell';
import { eq, count } from 'drizzle-orm';
import { schema } from '@dtb/db';
import { getDb } from '@/lib/db';
import { rankSites, type LeaderboardInput } from '@/lib/leaderboard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Leaderboard · Downtime Bhavan' };

function fmtHours(ms: number): string {
  const h = Math.floor(ms / (60 * 60 * 1000));
  const m = Math.floor((ms / 60_000)) % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export default async function Page() {
  const db = getDb();
  const sites = db.select().from(schema.sites).where(eq(schema.sites.enabled, true)).all();
  const statuses = db.select().from(schema.siteStatus).all();
  const statusBySite = new Map(statuses.map((s) => [s.siteId, s] as const));

  const inputs: LeaderboardInput[] = sites.map((site) => {
    const status = statusBySite.get(site.id);
    const reports = db.select({ n: count() }).from(schema.grievances)
      .where(eq(schema.grievances.siteId, site.id)).get()?.n ?? 0;
    // V1: longestOutageMs computed as (now - state_since) if currently Down, else 0.
    // A proper history-scan version comes in a future plan.
    const longestOutageMs = status?.currentState === 'down'
      ? Date.now() - (status.stateSince ?? Date.now())
      : 0;
    return {
      siteId: site.id, name: site.name,
      uptime30dPct: status?.uptime30dPct ?? null,
      totalReports: reports, longestOutageMs,
    };
  });

  const ranked = rankSites(inputs);

  return (
    <PageShell active="leaderboard">
      <div className="text-center mb-10">
        <span className="block text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[var(--color-saffron)] mb-2">
          Awards Ceremony · {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
        </span>
        <h1 className="text-4xl font-bold tracking-tight">
          Worst Performing<br/>
          <em className="text-[var(--color-red)] font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>Government Websites.</em>
        </h1>
        <p className="text-[var(--color-ink-dim)] mt-3 max-w-[540px] mx-auto">
          Ranked by 30-day uptime, ascending. Three special trophies for the most spectacular failures.
        </p>
      </div>

      <div className="border border-[var(--color-border)] rounded-2xl overflow-hidden bg-[var(--color-paper)]">
        {ranked.map((r) => (
          <div key={r.siteId} className={`flex items-center gap-6 px-6 py-5 border-b border-[var(--color-border)] last:border-b-0 ${r.trophy ? 'bg-[var(--color-saffron-soft)]/30' : ''} hover:bg-[var(--color-paper-2)]`}>
            <span className="text-3xl font-bold tabular-nums text-[var(--color-ink-faint)] w-12 text-right">
              {r.rank}
            </span>
            <a href={`/sites/${r.siteId}`} className="flex-1">
              <div className="flex items-center gap-3">
                <span className="text-base font-bold tracking-tight text-[var(--color-ink)]">{r.name}</span>
                {r.trophy && <span className="text-xs font-bold px-2 py-0.5 rounded bg-[var(--color-saffron)] text-white tracking-wide">{r.trophy}</span>}
              </div>
              <div className="text-[12px] text-[var(--color-ink-faint)] mt-0.5 font-medium">
                {r.totalReports} citizen grievances · {r.longestOutageMs > 0 ? `currently down for ${fmtHours(r.longestOutageMs)}` : 'no current outage'}
              </div>
            </a>
            <div className="text-right">
              <span className="text-2xl font-bold tabular-nums" style={{ color: r.uptime30dPct !== null && r.uptime30dPct < 50 ? 'var(--color-red)' : r.uptime30dPct !== null && r.uptime30dPct < 80 ? 'var(--color-amber)' : 'var(--color-green)' }}>
                {r.uptime30dPct === null ? '—' : Math.round(r.uptime30dPct)}
                <sup className="text-sm text-[var(--color-ink-faint)] ml-px">%</sup>
              </span>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-faint)] mt-0.5">30d uptime</p>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-[var(--color-ink-faint)] italic">
        All awards self-issued by Downtime Bhavan. Not affiliated with any government body.
      </p>
    </PageShell>
  );
}
