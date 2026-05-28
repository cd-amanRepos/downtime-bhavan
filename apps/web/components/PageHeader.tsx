'use client';

import { useEffect, useState } from 'react';
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
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    // body scroll lock while drawer is open
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50 bg-[var(--color-paper)] border-b border-[var(--color-border)]">
      <div className="flex items-center justify-between gap-3 px-4 py-3 md:grid md:grid-cols-[1fr_auto_1fr] md:gap-6 md:px-7 md:py-3.5">
        <a href="/" className="flex items-center gap-2.5 no-underline text-inherit min-w-0" aria-label="Downtime Bhavan home">
          <Image
            src={iconOnly}
            alt=""
            width={56}
            height={56}
            priority
            className="w-11 h-11 md:w-14 md:h-14 shrink-0"
          />
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-[15px] md:text-[17px] font-bold tracking-tight text-[var(--color-ink)] truncate">
              Downtime <span className="text-[var(--color-blue)]">Bhavan</span>
            </span>
            <span
              className="hidden sm:block text-[11px] md:text-xs font-medium text-[var(--color-ink-dim)] mt-0.5 truncate"
              style={{ fontFamily: 'var(--font-hi)' }}
            >
              डाउनटाइम भवन · An unofficial observatory
            </span>
          </div>
        </a>

        {/* Desktop nav pill */}
        <nav className="hidden md:flex gap-0.5 bg-[var(--color-paper-2)] p-1 rounded-full">
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

        {/* Desktop right cluster */}
        <div className="hidden md:flex items-center justify-end gap-3.5">
          <span className="inline-flex items-center gap-2 text-xs font-medium text-[var(--color-ink-dim)]">
            <span className="w-[7px] h-[7px] rounded-full bg-[var(--color-green)] animate-pulse" />
            Live · Mumbai
          </span>
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border-strong)] text-[12.5px] font-semibold text-[var(--color-ink-soft)] hover:bg-[var(--color-saffron-soft)] hover:border-[var(--color-saffron)] hover:text-[var(--color-saffron)] transition-all">
            <span>🇮🇳</span> Sarkari Mode
          </button>
        </div>

        {/* Mobile hamburger — md:hidden */}
        <button
          type="button"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg border border-[var(--color-border-strong)] text-[var(--color-ink-soft)] active:bg-[var(--color-paper-2)]"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            {open ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <line x1="3" y1="7" x2="21" y2="7" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="17" x2="21" y2="17" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <>
          <div
            className="md:hidden fixed inset-0 top-[60px] z-40 bg-black/30 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            className="md:hidden absolute left-0 right-0 top-full z-50 border-b border-[var(--color-border)] bg-[var(--color-paper)] shadow-[0_10px_24px_-12px_rgba(15,31,95,0.18)]"
            role="dialog"
            aria-label="Site navigation"
          >
            <nav className="flex flex-col px-4 py-3">
              {NAV.map((item) => (
                <a
                  key={item.id}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`block px-3 py-3 rounded-lg text-[15px] font-semibold ${
                    item.id === active
                      ? 'bg-[var(--color-blue-soft)] text-[var(--color-blue)]'
                      : 'text-[var(--color-ink-soft)] active:bg-[var(--color-paper-2)]'
                  }`}
                >
                  {item.label}
                </a>
              ))}

              <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-xs font-medium text-[var(--color-ink-dim)]">
                  <span className="w-[7px] h-[7px] rounded-full bg-[var(--color-green)] animate-pulse" />
                  Live · Mumbai
                </span>
                <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--color-border-strong)] text-[12.5px] font-semibold text-[var(--color-ink-soft)]">
                  <span>🇮🇳</span> Sarkari Mode
                </button>
              </div>
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
