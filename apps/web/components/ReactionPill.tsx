'use client';

import { useState } from 'react';

interface Props {
  grievanceId: number;
  kind: 'angry' | 'sad' | 'laugh' | 'same';
  initialCount: number;
  emoji: string;
  label: string;
}

export function ReactionPill({ grievanceId, kind, initialCount, emoji, label }: Props) {
  const [count, setCount] = useState(initialCount);
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    const optimisticDelta = active ? -1 : 1;
    setCount((c) => c + optimisticDelta);
    setActive((a) => !a);
    try {
      const res = await fetch(`/api/grievance/${grievanceId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind }),
      });
      if (!res.ok) {
        // rollback
        setCount((c) => c - optimisticDelta);
        setActive((a) => !a);
      } else {
        const data = await res.json() as { count: number };
        setCount(data.count); // server is the truth
      }
    } catch {
      setCount((c) => c - optimisticDelta);
      setActive((a) => !a);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button onClick={toggle} disabled={busy}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-semibold border transition-all
              ${active
                ? 'bg-[var(--color-blue-soft)] border-[var(--color-blue)] text-[var(--color-blue)]'
                : 'bg-[var(--color-paper-2)] border-[var(--color-border)] text-[var(--color-ink-soft)] hover:border-[var(--color-blue)] hover:text-[var(--color-blue)]'}
              disabled:opacity-50`}>
      <span>{emoji}</span>
      {label && <span className="text-[11px]">{label}</span>}
      <b className="font-bold tabular-nums">{count}</b>
    </button>
  );
}
