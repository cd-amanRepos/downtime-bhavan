'use client';

import { useEffect, useRef } from 'react';

export function NotifyHero() {
  const fieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape' && document.activeElement === fieldRef.current) {
        fieldRef.current?.blur();
      }
    }
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, []);

  return (
    <section className="col center relative bg-[var(--color-bg)] flex flex-col overflow-hidden">
      <div className="max-w-[760px] mx-auto px-14 pt-20 pb-16 text-center relative z-10">
        <div className="inline-flex items-center gap-2.5 text-xs font-semibold text-[var(--color-ink-dim)] mb-6">
          <span className="w-7 h-px bg-[var(--color-border-strong)]" />
          <span>
            <span className="text-[var(--color-blue)] font-semibold" style={{ fontFamily: 'var(--font-hi)' }}>सूचना सेवा</span>
            {' · Citizen Alert Service'}
          </span>
          <span className="w-7 h-px bg-[var(--color-border-strong)]" />
        </div>

        <h1 className="text-[clamp(38px,4.6vw,60px)] font-bold tracking-tight leading-[1.05] text-[var(--color-ink)]">
          Don't worry.<br />
          We'll <em className="text-[var(--color-blue)] font-semibold" style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>notify you</em> when your<br />
          <span className="italic font-medium text-[var(--color-saffron)] border-b-2 border-[var(--color-saffron-soft)] pb-px" style={{ fontFamily: 'var(--font-serif)' }}>Sarkari site</span>{' '}
          will come up.
        </h1>

        <p className="mt-5 text-base font-medium text-[var(--color-ink-dim)] leading-snug max-w-[540px] mx-auto">
          Get a free WhatsApp alert the moment any of India's <b className="text-[var(--color-ink)] font-semibold">12 most-used government websites</b> starts working again. One OTP, max <b className="text-[var(--color-ink)] font-semibold">5 active alerts</b> per number, no spam, no signup.
        </p>

        <form className="notify-form mt-10 bg-[var(--color-paper)] border border-[var(--color-border-strong)] rounded-2xl px-5.5 pl-5 py-2 flex items-center gap-2.5 shadow-[0_8px_24px_-12px_rgba(15,31,95,0.15),_0_2px_6px_-2px_rgba(15,31,95,0.08)]"
              onSubmit={(e) => { e.preventDefault(); console.log('TODO: notify flow in Plan 3'); }}>
          <span className="text-base text-[var(--color-ink-dim)] font-medium whitespace-nowrap pl-3">Notify me when</span>
          <input
            ref={fieldRef}
            className="flex-1 border-0 outline-0 bg-transparent text-base font-medium py-3.5 min-w-0 text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)]"
            placeholder="the Aadhaar update portal starts working"
          />
          <button className="bg-[var(--color-blue)] text-white border-0 px-5 py-3 rounded-[9px] text-[13.5px] font-bold inline-flex items-center gap-2 transition-all hover:bg-[var(--color-blue-deep)]">
            Set alert
          </button>
        </form>

        <div className="mt-3 text-xs text-[var(--color-ink-faint)] flex items-center justify-center gap-3">
          {['WhatsApp delivery', 'One-time OTP', 'No signup', 'Free, always'].map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="w-3 h-3 text-[var(--color-green)]"><polyline points="20 6 9 17 4 12" /></svg>
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
