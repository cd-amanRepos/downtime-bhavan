import { eq, desc, and, gte } from 'drizzle-orm';
import { schema } from '@dtb/db';
import { getDb } from '@/lib/db';
import { GrievanceStream } from './GrievanceStream.js';

export async function JantaDarbarPanel() {
  const db = getDb();
  const sites = db.select().from(schema.sites).where(eq(schema.sites.enabled, true)).all();
  const since = Date.now() - 60 * 60 * 1000;

  const recent = db.select().from(schema.grievances)
    .where(and(eq(schema.grievances.visible, true), gte(schema.grievances.createdAt, since)))
    .orderBy(desc(schema.grievances.createdAt))
    .limit(40)
    .all();

  const reactions = db.select().from(schema.reactions).all();
  const counts: Record<number, Record<string, number>> = {};
  for (const r of reactions) {
    const m = counts[r.grievanceId] ?? (counts[r.grievanceId] = {});
    m[r.kind] = (m[r.kind] ?? 0) + 1;
  }

  // also need each site's current state for the colored dot
  const statuses = db.select().from(schema.siteStatus).all();
  const stateById = new Map(statuses.map((s) => [s.siteId, s.currentState] as const));

  const initial = recent.map((g) => ({
    id: g.id, siteId: g.siteId, tag: g.tag, body: g.body, createdAt: g.createdAt,
    reactions: counts[g.id] ?? {},
  }));
  const siteLookup = sites.map((s) => ({ id: s.id, name: s.name, state: stateById.get(s.id) }));

  return (
    <section className="col col-side bg-[var(--color-paper)] border-r-0 border-t lg:border-t-0 border-[var(--color-border)]">
      <div className="px-4 md:px-7 pt-5 md:pt-6 pb-4 border-b border-[var(--color-border)]">
        <span className="block text-[10.5px] font-semibold text-[var(--color-ink-faint)] tracking-[0.18em] uppercase">
          {initial.length} in last 60 min · Live grievances
        </span>
        <h2 className="mt-1 text-lg font-bold tracking-tight flex items-baseline gap-2.5">
          Janta Darbar
          <span className="text-sm text-[var(--color-blue)] font-medium" style={{ fontFamily: 'var(--font-hi)' }}>जनता दरबार</span>
        </h2>
        <span className="text-xs text-[var(--color-ink-dim)] mt-0.5">The people's court of broken portals</span>
      </div>

      <GrievanceStream initial={initial} sites={siteLookup} />

      <div className="px-4 md:px-7 py-3 text-center text-[11.5px] text-[var(--color-blue)] font-semibold cursor-pointer bg-[var(--color-paper-2)] border-t border-[var(--color-border)] hover:bg-[var(--color-blue-soft)]">
        <a href="/janta-darbar">View all grievances →</a>
      </div>
    </section>
  );
}
