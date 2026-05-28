import Image from 'next/image';
import logoHorizontal from '../public/logo-horizontal.png';
import { AshokaMark } from './AshokaMark.js';

type NavId = 'status' | 'janta-darbar' | 'leaderboard' | 'methodology' | 'api';

const NAV: Array<{ id: NavId; label: string; href: string }> = [
  { id: 'status',        label: 'Status',        href: '/' },
  { id: 'janta-darbar',  label: 'Janta Darbar',  href: '/janta-darbar' },
  { id: 'leaderboard',   label: 'Leaderboard',   href: '/leaderboard' },
  { id: 'methodology',   label: 'Methodology',   href: '/methodology' },
  { id: 'api',           label: 'API',           href: '/api' },
];

interface Props { active?: NavId; }

export function PageHeader({ active = 'status' }: Props) {
  return (
    <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-6 sticky top-0 z-50 px-7 py-3.5 bg-[var(--color-paper)] border-b border-[var(--color-border)]">
      <a href="/" className="flex items-center no-underline text-inherit" aria-label="Downtime Bhavan home">
        {/* Full horizontal logo on tablet/desktop — icon + wordmark + Hindi tagline are
            all baked into the artwork. Hidden on small screens; falls back to the
            compact AshokaMark + wordmark stack so the header stays single-line. */}
        <div className="hidden sm:block">
          <Image
            src={logoHorizontal}
            alt="Downtime Bhavan · An unofficial observatory"
            height={40}
            priority
            className="h-10 w-auto"
          />
        </div>
        <div className="flex sm:hidden items-center gap-3">
          <div className="w-[38px] h-[38px] rounded-full bg-[var(--color-blue)] flex items-center justify-center text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1),0_1px_2px_rgba(15,31,95,0.18)]">
            <AshokaMark size={28} />
          </div>
          <span className="text-[17px] font-bold tracking-tight text-[var(--color-ink)]">
            Downtime <span className="text-[var(--color-blue)]">Bhavan</span>
          </span>
        </div>
      </a>

      <nav className="flex gap-0.5 bg-[var(--color-paper-2)] p-1 rounded-full">
        {NAV.map((item) => (
          <a key={item.id} href={item.href}
             className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all ${
               item.id === active
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
          Live · Mumbai
        </span>
        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border-strong)] text-[12.5px] font-semibold text-[var(--color-ink-soft)] hover:bg-[var(--color-saffron-soft)] hover:border-[var(--color-saffron)] hover:text-[var(--color-saffron)] transition-all">
          <span>🇮🇳</span> Sarkari Mode
        </button>
      </div>
    </header>
  );
}
