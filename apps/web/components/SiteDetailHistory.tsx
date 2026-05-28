import { buildLast24h } from '@/lib/status-derive';
import { Sparkline } from './Sparkline.js';

interface Props {
  checks: { checkedAt: number; result: 'up'|'degraded'|'down' }[];
}

/** Render 7 daily rows, each one a 24-bar sparkline. Day 0 = today, day 6 = a week ago. */
export function SiteDetailHistory({ checks }: Props) {
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const rows = [];
  for (let d = 0; d < 7; d++) {
    const dayEnd = now - d * DAY;
    const dayStart = dayEnd - DAY;
    const dayChecks = checks.filter((c) => c.checkedAt >= dayStart && c.checkedAt < dayEnd);
    const buckets = buildLast24h(dayChecks, dayEnd);
    rows.push({
      label: d === 0 ? 'Today' : d === 1 ? 'Yesterday' : new Date(dayEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      buckets,
    });
  }

  return (
    <div className="border border-[var(--color-border)] rounded-2xl p-6 bg-[var(--color-paper)] mb-8">
      <h2 className="text-base font-bold tracking-tight mb-4">Past 7 days</h2>
      <div className="space-y-3">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-5">
            <span className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-[var(--color-ink-faint)] w-20 shrink-0">{r.label}</span>
            <div className="flex-1">
              <Sparkline buckets={r.buckets} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
