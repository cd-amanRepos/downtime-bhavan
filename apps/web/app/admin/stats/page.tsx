import { count, eq, gte, and } from 'drizzle-orm';
import { schema } from '@dtb/db';
import { getDb } from '@/lib/db';
import { AdminNav } from '@/components/AdminNav';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const db = getDb();
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;

  // Per-site grievance counts in last 24h
  const sites = db.select().from(schema.sites).all();
  const perSite = sites.map((s) => {
    const n = db.select({ n: count() }).from(schema.grievances)
      .where(and(
        eq(schema.grievances.siteId, s.id),
        gte(schema.grievances.createdAt, dayAgo),
      )).get()?.n ?? 0;
    return { name: s.name, count: n };
  }).sort((a, b) => b.count - a.count);

  // Top reactions
  const allReactions = db.select().from(schema.reactions).all();
  const reactionCounts: Record<string, number> = {};
  for (const r of allReactions) reactionCounts[r.kind] = (reactionCounts[r.kind] ?? 0) + 1;

  // Recent rate-limit hits (denied attempts) — count rows in last 24h with count >= the limit
  const rlRows = db.select().from(schema.rateLimitAttempts).all();
  const recentBlocks = rlRows.length;

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      <AdminNav active="/admin/stats" />
      <div className="flex-1 p-8 max-w-[1100px]">
        <h1 className="text-2xl font-bold tracking-tight mb-6">Stats</h1>

        <h2 className="text-base font-bold mb-3">Grievances per site · last 24h</h2>
        <div className="border border-[var(--color-border)] rounded-2xl overflow-hidden bg-[var(--color-paper)] mb-8">
          {perSite.map((row, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)] last:border-b-0">
              <span className="text-sm font-medium">{row.name}</span>
              <span className="text-base font-bold tabular-nums">{row.count}</span>
            </div>
          ))}
        </div>

        <h2 className="text-base font-bold mb-3">All-time reactions</h2>
        <div className="grid grid-cols-4 gap-4 mb-8">
          {['same', 'angry', 'sad', 'laugh'].map((k) => (
            <div key={k} className="border border-[var(--color-border)] rounded-2xl bg-[var(--color-paper)] p-5">
              <p className="text-[10.5px] uppercase tracking-[0.15em] font-semibold text-[var(--color-ink-faint)] mb-2">{k}</p>
              <p className="text-2xl font-bold tabular-nums">{reactionCounts[k] ?? 0}</p>
            </div>
          ))}
        </div>

        <h2 className="text-base font-bold mb-3">Rate-limit state</h2>
        <p className="text-sm text-[var(--color-ink-dim)]">
          {recentBlocks} active rate-limit rows across all actions and IPs. Pruning runs in V2.
        </p>
      </div>
    </div>
  );
}
