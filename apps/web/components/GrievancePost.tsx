import { ReactionPill } from './ReactionPill.js';

const DOT_COLOR_BY_STATE: Record<string, string> = {
  down: 'var(--color-red)',
  degraded: 'var(--color-amber)',
  working: 'var(--color-green)',
  unknown: 'var(--color-ink-faint)',
};

interface Props {
  grievance: {
    id: number;
    siteName: string;            // computed from siteId by caller
    siteState?: 'working' | 'degraded' | 'down';
    tag: string;
    body: string;
    createdAt: number;
    reactions: Partial<Record<'angry' | 'sad' | 'laugh' | 'same', number>>;
  };
}

function timeAgo(then: number): string {
  const ms = Date.now() - then;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

export function GrievancePost({ grievance: g }: Props) {
  const state = g.siteState ?? 'unknown';
  return (
    <article className="px-4 md:px-7 py-4 border-b border-[var(--color-border)] hover:bg-[var(--color-paper-2)] transition-colors">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold min-w-0">
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: DOT_COLOR_BY_STATE[state] }} />
          <span className="truncate">{g.siteName}</span>
          <span className="text-[var(--color-ink-faint)] font-medium text-[11px] ml-1 truncate">· {g.tag}</span>
        </span>
        <span className="text-[11px] text-[var(--color-ink-faint)] font-medium shrink-0">{timeAgo(g.createdAt)}</span>
      </div>
      <div className="text-sm font-medium leading-snug mb-2.5">{g.body}</div>
      <div className="flex gap-1.5 flex-wrap">
        <ReactionPill grievanceId={g.id} kind="same"  initialCount={g.reactions.same  ?? 0} emoji="✓"  label="same" />
        <ReactionPill grievanceId={g.id} kind="angry" initialCount={g.reactions.angry ?? 0} emoji="😡" label="" />
        <ReactionPill grievanceId={g.id} kind="sad"   initialCount={g.reactions.sad   ?? 0} emoji="😭" label="" />
        <ReactionPill grievanceId={g.id} kind="laugh" initialCount={g.reactions.laugh ?? 0} emoji="😂" label="" />
      </div>
    </article>
  );
}
