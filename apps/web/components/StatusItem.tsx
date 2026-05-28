import { Sparkline } from './Sparkline.js';
import type { SiteStatusSnapshot } from '@dtb/shared';

const STAMP_TEXT: Record<SiteStatusSnapshot['currentState'], string> = {
  working: 'Working', degraded: 'Degraded', down: 'Down',
};

const COLOR_BY_STATE: Record<SiteStatusSnapshot['currentState'], string> = {
  working: 'var(--color-green)', degraded: 'var(--color-amber)', down: 'var(--color-red)',
};

const SOFT_BY_STATE: Record<SiteStatusSnapshot['currentState'], string> = {
  working: 'var(--color-green-soft)', degraded: 'var(--color-amber-soft)', down: 'var(--color-red-soft)',
};

interface Props { snapshot: SiteStatusSnapshot; }

export function StatusItem({ snapshot }: Props) {
  const { name, url, currentState, uptime30dPct, last24h } = snapshot;
  const color = COLOR_BY_STATE[currentState];
  const soft = SOFT_BY_STATE[currentState];
  const stamp = STAMP_TEXT[currentState];

  return (
    <article className="grid grid-cols-[14px_1fr_auto] gap-3 items-start px-4 md:px-7 py-3.5 md:py-4 border-b border-[var(--color-border)] cursor-pointer transition-colors hover:bg-[var(--color-paper-2)]">
      <a href={`/sites/${snapshot.siteId}`} className="contents">
        <span
          aria-label={`${stamp} status indicator`}
          className="w-2.5 h-2.5 rounded-full mt-1.5"
          style={{ background: color, boxShadow: `0 0 0 3px ${soft}` }}
        />
        <div className="min-w-0">
          <div className="text-sm font-semibold leading-tight tracking-tight">{name}</div>
          <div className="text-[11.5px] text-[var(--color-ink-faint)] mt-0.5 font-medium truncate">{url.replace(/^https?:\/\//, '')}</div>
          <Sparkline buckets={last24h} />
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-bold tabular-nums leading-none tracking-tight" style={{ color }}>
            {uptime30dPct === null ? '—' : Math.round(uptime30dPct)}
            <sup className="text-[11px] font-semibold text-[var(--color-ink-faint)] align-[6px] ml-px">%</sup>
          </div>
          <div className="text-[9.5px] font-semibold text-[var(--color-ink-faint)] uppercase tracking-[0.12em] mt-1">30d</div>
          <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color }}>
            {stamp}
          </div>
        </div>
      </a>
    </article>
  );
}
