const POSTS = [
  { site: 'Aadhaar', state: 'degraded', tag: 'otp-not-coming', body: 'tried 6 times. office wala bola "kal aana"', time: '12s ago', reactions: { angry: 24, same: 89 } },
  { site: 'GST',     state: 'down',     tag: 'error-5xx',      body: 'my CA is crying. filing deadline Friday.',  time: '34s ago', reactions: { sad: 156, same: 412 } },
  { site: 'EPFO',    state: 'down',     tag: 'blank-page',     body: '23 hours of darkness. epfo we miss you.',    time: '1m ago',  reactions: { laugh: 87, same: 203 } },
] as const;

const DOT_COLOR: Record<string, string> = { down: 'var(--color-red)', degraded: 'var(--color-amber)', working: 'var(--color-green)' };

export function JantaDarbarPanel() {
  return (
    <section className="col col-side bg-[var(--color-paper)] border-r-0">
      <div className="px-7 pt-6 pb-4 border-b border-[var(--color-border)]">
        <span className="block text-[10.5px] font-semibold text-[var(--color-ink-faint)] tracking-[0.18em] uppercase">
          Coming in Plan 4 · Live grievances
        </span>
        <h2 className="mt-1 text-lg font-bold tracking-tight flex items-baseline gap-2.5">
          Janta Darbar
          <span className="text-sm text-[var(--color-blue)] font-medium" style={{ fontFamily: 'var(--font-hi)' }}>जनता दरबार</span>
        </h2>
        <span className="text-xs text-[var(--color-ink-dim)] mt-0.5">The people's court of broken portals</span>
      </div>

      <div>
        {POSTS.map((p, i) => (
          <article key={i} className="px-7 py-4 border-b border-[var(--color-border)] cursor-pointer hover:bg-[var(--color-paper-2)] transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: DOT_COLOR[p.state] }} />
                {p.site}
                <span className="text-[var(--color-ink-faint)] font-medium text-[11px] ml-1">· {p.tag}</span>
              </span>
              <span className="text-[11px] text-[var(--color-ink-faint)] font-medium">{p.time}</span>
            </div>
            <div className="text-sm font-medium leading-snug">{p.body}</div>
          </article>
        ))}
      </div>

      <div className="sticky bottom-0 bg-[var(--color-paper)] border-t border-[var(--color-border)] px-7 py-3.5 text-center">
        <button className="bg-[var(--color-blue)] text-white border-0 px-4.5 py-3.5 rounded-[11px] text-[13px] font-bold w-full inline-flex items-center justify-center gap-2.5 shadow-[0_4px_12px_-4px_rgba(30,58,138,0.4),_inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-[var(--color-blue-deep)] transition-all" disabled>
          + File a grievance
          <span className="bg-white/20 text-white px-1.5 py-0.5 rounded-full text-[10.5px] font-bold tracking-wide ml-1">coming soon</span>
        </button>
        <div className="mt-2 text-[11px] text-[var(--color-ink-faint)] font-medium">
          <span className="text-[var(--color-ink-soft)] font-semibold" style={{ fontFamily: 'var(--font-hi)' }}>शिकायत दर्ज करें</span> · live in Plan 4
        </div>
      </div>
    </section>
  );
}
