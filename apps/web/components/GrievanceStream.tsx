'use client';

import { useEffect, useState } from 'react';
import { GrievancePost } from './GrievancePost.js';
import { GrievanceForm } from './GrievanceForm.js';

export interface InitialGrievance {
  id: number;
  siteId: string;
  tag: string;
  body: string;
  createdAt: number;
  reactions: Partial<Record<'angry'|'sad'|'laugh'|'same', number>>;
}

interface SiteLookup { id: string; name: string; state?: 'working'|'degraded'|'down'; }

interface Props {
  initial: InitialGrievance[];
  sites: SiteLookup[];
}

export function GrievanceStream({ initial, sites }: Props) {
  const [grievances, setGrievances] = useState<InitialGrievance[]>(initial);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const es = new EventSource('/api/grievance/stream');
    es.addEventListener('grievance:new', (evt) => {
      const g = JSON.parse((evt as MessageEvent).data) as Omit<InitialGrievance, 'reactions'>;
      setGrievances((prev) => [{ ...g, reactions: {} }, ...prev].slice(0, 60));
    });
    es.addEventListener('grievance:hide', (evt) => {
      const { grievanceId } = JSON.parse((evt as MessageEvent).data) as { grievanceId: number };
      setGrievances((prev) => prev.filter((g) => g.id !== grievanceId));
    });
    es.onerror = () => { /* browser auto-reconnects */ };
    return () => es.close();
  }, []);

  const siteMap = new Map(sites.map((s) => [s.id, s] as const));

  return (
    <>
      <div>
        {grievances.length === 0 ? (
          <div className="px-4 md:px-7 py-10 text-center text-sm text-[var(--color-ink-dim)]">
            <p className="font-medium">No grievances yet.</p>
            <p className="mt-2 text-xs">Be the first citizen to file one.</p>
          </div>
        ) : (
          grievances.map((g) => {
            const s = siteMap.get(g.siteId);
            return (
              <GrievancePost
                key={g.id}
                grievance={{
                  id: g.id,
                  siteName: s?.name ?? g.siteId,
                  siteState: s?.state,
                  tag: g.tag,
                  body: g.body,
                  createdAt: g.createdAt,
                  reactions: g.reactions,
                }}
              />
            );
          })
        )}
      </div>

      <div className="sticky bottom-0 bg-[var(--color-paper)] border-t border-[var(--color-border)] px-4 md:px-7 py-3.5 text-center pb-[max(env(safe-area-inset-bottom),0.875rem)]">
        <button onClick={() => setShowForm(true)}
                className="bg-[var(--color-blue)] text-white border-0 px-4 py-3.5 rounded-[11px] text-[13px] font-bold w-full inline-flex items-center justify-center gap-2.5 shadow-[0_4px_12px_-4px_rgba(30,58,138,0.4),_inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-[var(--color-blue-deep)] transition-all">
          + File a grievance
          <span className="bg-white/20 text-white px-1.5 py-0.5 rounded-full text-[10.5px] font-bold tracking-wide ml-1">live</span>
        </button>
        <div className="mt-2 text-[11px] text-[var(--color-ink-faint)] font-medium">
          <span className="text-[var(--color-ink-soft)] font-semibold" style={{ fontFamily: 'var(--font-hi)' }}>शिकायत दर्ज करें</span> · 140 chars, no signup
        </div>
      </div>

      {showForm && (
        <GrievanceForm
          sites={sites}
          onClose={() => setShowForm(false)}
          onSubmitted={() => { /* SSE will push the new one */ }}
        />
      )}
    </>
  );
}
