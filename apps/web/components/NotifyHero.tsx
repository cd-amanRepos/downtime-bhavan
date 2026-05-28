'use client';

import { useEffect, useRef, useState } from 'react';
import { NotifyFlow } from './NotifyFlow';

interface Site { id: string; name: string; }
interface Props { sites: Site[]; }

export function NotifyHero({ sites }: Props) {
  const fieldRef = useRef<HTMLInputElement>(null);
  const [showFlow, setShowFlow] = useState(false);

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
          Get a free <b className="text-[var(--color-ink)] font-semibold">email alert</b> the moment any of India's <b className="text-[var(--color-ink)] font-semibold">12 most-used government websites</b> starts working again. One OTP, max <b className="text-[var(--color-ink)] font-semibold">5 active alerts</b> per email, no spam, no signup.
        </p>

        <form className="notify-form mt-10 bg-[var(--color-paper)] border border-[var(--color-border-strong)] rounded-2xl px-5.5 pl-5 py-2 flex items-center gap-2.5 shadow-[0_8px_24px_-12px_rgba(15,31,95,0.15),_0_2px_6px_-2px_rgba(15,31,95,0.08)]"
              onSubmit={(e) => { e.preventDefault(); setShowFlow(true); }}>
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
          {['Email delivery', 'One-time OTP', 'No signup', 'Free, always'].map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="w-3 h-3 text-[var(--color-green)]"><polyline points="20 6 9 17 4 12" /></svg>
              {t}
            </span>
          ))}
        </div>
        <div className="mt-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-saffron-soft)] text-[var(--color-saffron)] text-[11px] font-semibold">
          <span>📱</span>
          WhatsApp alerts · coming soon
        </div>
      </div>

      <ComingSoonMarquee />
      <DonateNudge />

      {showFlow && <NotifyFlow sites={sites} onClose={() => setShowFlow(false)} />}
    </section>
  );
}

const UPCOMING_SITES = [
  'EPFO Member Portal',
  'GST Portal',
  'Income Tax e-Filing',
  'Passport Seva',
  'DigiLocker',
  'Vahan / Sarathi',
  'MCA Portal',
  'eShram',
  'National Scholarship Portal',
  'PMJAY · Ayushman Bharat',
  'CBSE Results',
] as const;

function ComingSoonMarquee() {
  // duplicate the list so the keyframe animation can loop seamlessly
  const loop = [...UPCOMING_SITES, ...UPCOMING_SITES];
  return (
    <div className="relative z-10 mt-2 border-t border-[var(--color-border)]">
      <div className="max-w-[760px] mx-auto px-14 pt-8 pb-5 text-center">
        <div className="inline-flex items-center gap-2.5 text-[10.5px] font-semibold text-[var(--color-ink-faint)] tracking-[0.18em] uppercase mb-4">
          <span className="w-6 h-px bg-[var(--color-border-strong)]" />
          <span>
            Upcoming Departments
            <span className="text-[var(--color-saffron)] font-bold mx-2">·</span>
            <span className="text-[var(--color-ink-soft)]">11 more arriving</span>
          </span>
          <span className="w-6 h-px bg-[var(--color-border-strong)]" />
        </div>
      </div>

      {/* Marquee — full-bleed for nicer edge fade */}
      <div className="marquee relative overflow-hidden mx-6 pb-6">
        {/* Soft edge fades on left + right */}
        <span aria-hidden className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[var(--color-bg)] to-transparent z-10" />
        <span aria-hidden className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[var(--color-bg)] to-transparent z-10" />

        <div className="marquee-track flex gap-3 w-max">
          {loop.map((name, i) => (
            <span
              key={`${name}-${i}`}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[var(--color-paper)] border border-[var(--color-border)] rounded-full whitespace-nowrap text-[12.5px] font-semibold text-[var(--color-ink-soft)] shadow-[0_1px_2px_rgba(15,31,95,0.04)]"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-saffron)]" />
              {name}
              <span className="text-[10px] font-bold text-[var(--color-saffron)] uppercase tracking-[0.1em]">soon</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function DonateNudge() {
  return (
    <div className="relative z-10 border-t border-[var(--color-border)] bg-gradient-to-b from-transparent to-[var(--color-blue-soft)]/30">
      <div className="max-w-[640px] mx-auto px-14 py-10 text-center">
        <div className="inline-flex items-center gap-2 text-[10.5px] font-semibold text-[var(--color-saffron)] tracking-[0.18em] uppercase mb-3">
          <span>☕</span>
          <span>Office of the Chai Fund</span>
        </div>

        <p className="text-[19px] font-semibold tracking-tight text-[var(--color-ink)] leading-snug">
          If you liked the work and want me to <em className="text-[var(--color-blue)] font-semibold" style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>continue</em>.
        </p>
        <p className="mt-2 text-sm text-[var(--color-ink-dim)] leading-relaxed max-w-[480px] mx-auto">
          This office runs on chai and citizen donations. Every ₹ funds the next 11 departments — and keeps it free, ad-free, open source.
        </p>

        <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
          <a
            href="/donate"
            className="inline-flex items-center gap-2 bg-[var(--color-blue)] text-white px-5 py-3 rounded-[10px] text-[13.5px] font-bold shadow-[0_2px_4px_rgba(15,31,95,0.18),_inset_0_1px_0_rgba(255,255,255,0.18)] hover:bg-[var(--color-blue-deep)] transition-all"
          >
            <span>₹</span>
            Support via UPI
          </a>
          <a
            href="/donate"
            className="inline-flex items-center gap-2 bg-[var(--color-paper)] border border-[var(--color-border-strong)] text-[var(--color-ink-soft)] px-5 py-3 rounded-[10px] text-[13.5px] font-bold hover:border-[var(--color-saffron)] hover:text-[var(--color-saffron)] hover:bg-[var(--color-saffron-soft)] transition-all"
          >
            <span>☕</span>
            Buy me chai
          </a>
        </div>

        <p className="mt-5 text-[11px] text-[var(--color-ink-faint)] font-medium tracking-wide">
          <span className="text-[var(--color-green)] font-semibold">●</span>{' '}
          Free, ad-free, open source · ₹0 raised this month
        </p>
      </div>
    </div>
  );
}
