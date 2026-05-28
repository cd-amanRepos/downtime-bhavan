import Image from 'next/image';
import iconOnly from '../public/icon-only.png';

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
      <a href="/" className="flex items-center gap-3 no-underline text-inherit" aria-label="Downtime Bhavan home">
        {/* Icon-only mark (the building + chakra + heartbeat + notification dot) +
            HTML wordmark + tagline. Keeping the tagline as real text means it stays
            sharp + readable at any DPI, scales with browser zoom, and gets picked up
            by accessibility tools and search engines. */}
        <Image
          src={iconOnly}
          alt=""
          width={56}
          height={56}
          priority
          className="w-14 h-14 shrink-0"
        />
        <div className="flex flex-col leading-tight">
          <span className="text-[17px] font-bold tracking-tight text-[var(--color-ink)]">
            Downtime <span className="text-[var(--color-blue)]">Bhavan</span>
          </span>
          <span className="text-xs font-medium text-[var(--color-ink-dim)] mt-0.5" style={{ fontFamily: 'var(--font-hi)' }}>
            डाउनटाइम भवन · An unofficial observatory
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
