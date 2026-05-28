'use client';

import { useEffect, useState } from 'react';
import { GrievancePost } from './GrievancePost.js';
import { GrievanceForm } from './GrievanceForm.js';

interface SiteLookup { id: string; name: string; state?: 'working'|'degraded'|'down'; }
interface Grievance {
  id: number; siteId: string; tag: string; body: string; createdAt: number;
  reactions: Partial<Record<'angry'|'sad'|'laugh'|'same', number>>;
}

interface Props {
  initial: Grievance[];
  sites: SiteLookup[];
}

type SortMode = 'recent' | 'top';

export function GrievanceListPage({ initial, sites }: Props) {
  const [grievances, setGrievances] = useState<Grievance[]>(initial);
  const [siteFilter, setSiteFilter] = useState<string>('');
  const [sort, setSort] = useState<SortMode>('recent');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const es = new EventSource('/api/grievance/stream');
    es.addEventListener('grievance:new', (evt) => {
      const g = JSON.parse((evt as MessageEvent).data) as Omit<Grievance, 'reactions'>;
      setGrievances((prev) => [{ ...g, reactions: {} }, ...prev]);
    });
    es.addEventListener('grievance:hide', (evt) => {
      const { grievanceId } = JSON.parse((evt as MessageEvent).data) as { grievanceId: number };
      setGrievances((prev) => prev.filter((g) => g.id !== grievanceId));
    });
    return () => es.close();
  }, []);

  const siteMap = new Map(sites.map((s) => [s.id, s] as const));

  let filtered = siteFilter ? grievances.filter((g) => g.siteId === siteFilter) : grievances;
  if (sort === 'top') {
    filtered = [...filtered].sort((a, b) => {
      const sumA = Object.values(a.reactions).reduce((x, y) => x + (y ?? 0), 0);
      const sumB = Object.values(b.reactions).reduce((x, y) => x + (y ?? 0), 0);
      return sumB - sumA;
    });
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap gap-3 justify-between items-center">
        <div className="flex gap-3 items-center">
          <select value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)}
                  className="border border-[var(--color-border-strong)] rounded-lg px-3 py-2 text-sm font-medium bg-[var(--color-paper)]">
            <option value="">All departments ({grievances.length})</option>
            {sites.map((s) => {
              const n = grievances.filter((g) => g.siteId === s.id).length;
              return <option key={s.id} value={s.id}>{s.name} ({n})</option>;
            })}
          </select>
          <div className="flex gap-1 bg-[var(--color-paper-2)] p-1 rounded-lg">
            <button onClick={() => setSort('recent')}
                    className={`px-3 py-1 rounded text-xs font-semibold transition-all ${sort === 'recent' ? 'bg-[var(--color-paper)] text-[var(--color-blue)] shadow' : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'}`}>
              Recent
            </button>
            <button onClick={() => setSort('top')}
                    className={`px-3 py-1 rounded text-xs font-semibold transition-all ${sort === 'top' ? 'bg-[var(--color-paper)] text-[var(--color-blue)] shadow' : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'}`}>
              Most reactions
            </button>
          </div>
        </div>
        <button onClick={() => setShowForm(true)}
                className="bg-[var(--color-blue)] text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-[var(--color-blue-deep)]">
          + File a grievance
        </button>
      </div>

      <div className="border border-[var(--color-border)] rounded-2xl overflow-hidden bg-[var(--color-paper)]">
        {filtered.length === 0
          ? <div className="px-7 py-16 text-center text-sm text-[var(--color-ink-dim)]">No grievances match.</div>
          : filtered.map((g) => {
              const site = siteMap.get(g.siteId);
              return (
                <GrievancePost key={g.id} grievance={{
                  id: g.id,
                  siteName: site?.name ?? g.siteId,
                  siteState: site?.state,
                  tag: g.tag,
                  body: g.body,
                  createdAt: g.createdAt,
                  reactions: g.reactions,
                }} />
              );
            })
        }
      </div>

      {showForm && (
        <GrievanceForm sites={sites} onClose={() => setShowForm(false)} onSubmitted={() => { /* SSE pushes it */ }} />
      )}
    </>
  );
}
