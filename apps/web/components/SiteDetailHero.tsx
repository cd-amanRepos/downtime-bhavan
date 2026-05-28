import type { SiteStatusSnapshot } from '@dtb/shared';

const STATE_COLOR: Record<SiteStatusSnapshot['currentState'], string> = {
  working: 'var(--color-green)', degraded: 'var(--color-amber)', down: 'var(--color-red)',
};
const STATE_LABEL: Record<SiteStatusSnapshot['currentState'], string> = {
  working: 'Working', degraded: 'Degraded', down: 'Down',
};

function duration(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ${m % 60}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

interface Props { snapshot: SiteStatusSnapshot; }

export function SiteDetailHero({ snapshot: s }: Props) {
  const now = Date.now();
  const color = STATE_COLOR[s.currentState];
  return (
    <div className="border border-[var(--color-border)] rounded-2xl p-8 bg-[var(--color-paper)] mb-8">
      <div className="flex items-baseline justify-between gap-6 mb-4">
        <div>
          <span className="block text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-faint)] mb-1">
            <a href="/departments" className="hover:text-[var(--color-blue)]">← All departments</a>
          </span>
          <h1 className="text-3xl font-bold tracking-tight">{s.name}</h1>
          <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-block text-sm text-[var(--color-blue)] underline mt-1.5">
            {s.url} ↗
          </a>
        </div>
        <div className="text-right">
          <span className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.1em]" style={{ color }}>
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: color, boxShadow: `0 0 0 4px ${color}33` }} />
            {STATE_LABEL[s.currentState]}
          </span>
          <p className="text-[11.5px] text-[var(--color-ink-faint)] mt-1 font-medium">for {duration(now - s.stateSince)}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mt-6 pt-6 border-t border-[var(--color-border)]">
        <Stat label="30-day uptime" value={s.uptime30dPct === null ? '—' : `${Math.round(s.uptime30dPct)}%`} color={color} />
        <Stat label="Last check" value={`${duration(now - s.lastCheckAt)} ago`} color="var(--color-ink)" />
        <Stat label="Community flag" value={s.communityFlag ? 'YES (≥20 reports/10m)' : '—'} color={s.communityFlag ? 'var(--color-amber)' : 'var(--color-ink-faint)'} />
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.15em] text-[var(--color-ink-faint)] mb-1">{label}</p>
      <p className="text-2xl font-bold tabular-nums tracking-tight" style={{ color }}>{value}</p>
    </div>
  );
}
