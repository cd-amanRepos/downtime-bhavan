import { AshokaMark } from './AshokaMark.js';

export function Header() {
  return (
    <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-6 sticky top-0 z-50 px-7 py-3.5 bg-[var(--color-paper)] border-b border-[var(--color-border)]">
      <div className="flex items-center gap-3">
        <div className="w-[38px] h-[38px] rounded-full bg-[var(--color-blue)] flex items-center justify-center text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1),0_1px_2px_rgba(15,31,95,0.18)]">
          <AshokaMark size={28} />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-[17px] font-bold tracking-tight text-[var(--color-ink)]">
            <span>Downtime</span>{' '}<span className="text-[var(--color-blue)]">Bhavan</span>
          </span>
          <span className="text-xs font-medium text-[var(--color-ink-dim)] mt-0.5" style={{ fontFamily: 'var(--font-hi)' }}>
            डाउनटाइम भवन · An unofficial observatory
          </span>
        </div>
      </div>

      <nav className="flex gap-0.5 bg-[var(--color-paper-2)] p-1 rounded-full">
        {[
          { label: 'Status', active: true },
          { label: 'Janta Darbar' },
          { label: 'Leaderboard' },
          { label: 'Methodology' },
          { label: 'API' },
        ].map((item) => (
          <a key={item.label}
             className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all ${
               item.active
                 ? 'bg-[var(--color-paper)] text-[var(--color-blue)] shadow-[0_1px_2px_rgba(15,31,95,0.06)]'
                 : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
             }`}>
            {item.label}
          </a>
        ))}
      </nav>

      <div className="flex items-center justify-end gap-3.5">
        <span className="inline-flex items-center gap-2 text-xs font-medium text-[var(--color-ink-dim)]">
          <span className="w-[7px] h-[7px] rounded-full bg-[var(--color-green)] animate-pulse" />
          Live · Mumbai · <b className="text-[var(--color-ink)] font-semibold">14:32 IST</b>
        </span>
        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border-strong)] text-[12.5px] font-semibold text-[var(--color-ink-soft)] hover:bg-[var(--color-saffron-soft)] hover:border-[var(--color-saffron)] hover:text-[var(--color-saffron)] transition-all">
          <span>🇮🇳</span> Sarkari Mode
        </button>
      </div>
    </header>
  );
}
