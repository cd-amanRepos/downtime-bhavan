'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';

interface Site { id: string; name: string; }
interface Props {
  sites: Site[];
  onClose: () => void;
  onSubmitted: () => void;
}

const TAGS = [
  { value: 'otp-not-coming', label: 'OTP not coming' },
  { value: 'error-5xx',      label: 'Error 5xx' },
  { value: 'blank-page',     label: 'Blank page' },
  { value: 'slow',           label: 'Too slow' },
  { value: 'login-failed',   label: 'Login failed' },
  { value: 'payment-failed', label: 'Payment failed' },
  { value: 'other',          label: 'Other' },
] as const;

// Cloudflare Turnstile sitekey. The default below is Cloudflare's invisible
// always-pass test key — no visible widget, no "for testing only" banner.
// Swap to a real sitekey via env when ready: dash.cloudflare.com → Turnstile.
const SITEKEY = process.env.NEXT_PUBLIC_TURNSTILE_SITEKEY ?? '3x00000000000000000000FF';

declare global {
  interface Window {
    turnstile?: {
      render: (sel: string | HTMLElement, opts: { sitekey: string; callback: (token: string) => void }) => string;
      remove: (id: string) => void;
    };
  }
}

export function GrievanceForm({ sites, onClose, onSubmitted }: Props) {
  const [siteId, setSiteId] = useState(sites[0]?.id ?? '');
  const [tag, setTag] = useState<typeof TAGS[number]['value']>('otp-not-coming');
  const [body, setBody] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const tsContainerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  // Render Turnstile widget once the script has loaded
  useEffect(() => {
    function tryRender() {
      if (window.turnstile && tsContainerRef.current && !widgetIdRef.current) {
        widgetIdRef.current = window.turnstile.render(tsContainerRef.current, {
          sitekey: SITEKEY,
          callback: (t: string) => setToken(t),
        });
      }
    }
    tryRender();
    const interval = setInterval(tryRender, 250);
    return () => {
      clearInterval(interval);
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token) { setError('Please complete the captcha'); return; }
    if (body.trim().length === 0) { setError('Write your grievance'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/grievance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, tag, body, turnstileToken: token }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          data.error === 'moderation_failed' ? `Rejected: ${data.reason}`
          : data.error === 'rate_limited' ? 'You are filing too quickly. Wait a moment.'
          : data.error === 'captcha_failed' ? 'Captcha failed — refresh and try again.'
          : `Failed: ${data.error ?? res.status}`
        );
        setSubmitting(false);
        return;
      }
      onSubmitted();
      onClose();
    } catch {
      setError('Network error. Try again.');
      setSubmitting(false);
    }
  }

  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />

      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center sm:px-4 overflow-y-auto"
           onClick={(e) => e.target === e.currentTarget && onClose()}>
        <form onSubmit={submit}
              className="bg-[var(--color-paper)] rounded-t-2xl sm:rounded-2xl p-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] sm:p-7 w-full sm:max-w-[480px] shadow-[0_20px_60px_-12px_rgba(15,31,95,0.5)] max-h-[100dvh] overflow-y-auto">
          <div className="flex justify-between items-baseline mb-1">
            <h2 className="text-xl font-bold tracking-tight">File a grievance</h2>
            <button type="button" onClick={onClose} className="text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] text-sm" aria-label="Close">✕</button>
          </div>
          <p className="text-sm text-[var(--color-ink-dim)] mb-6">
            <span style={{ fontFamily: 'var(--font-hi)' }} className="text-[var(--color-blue)] font-semibold">शिकायत दर्ज करें</span> — anonymous, 140 characters max.
          </p>

          <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--color-ink-faint)] mb-1.5">Department</label>
          <select value={siteId} onChange={(e) => setSiteId(e.target.value)}
                  className="w-full border border-[var(--color-border-strong)] rounded-lg px-3 py-2.5 text-sm font-medium bg-[var(--color-paper)] mb-4">
            {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--color-ink-faint)] mb-1.5">What broke</label>
          <select value={tag} onChange={(e) => setTag(e.target.value as typeof TAGS[number]['value'])}
                  className="w-full border border-[var(--color-border-strong)] rounded-lg px-3 py-2.5 text-sm font-medium bg-[var(--color-paper)] mb-4">
            {TAGS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>

          <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--color-ink-faint)] mb-1.5">
            Your grievance <span className="text-[var(--color-ink-faint)] font-normal normal-case">— {140 - body.length} left</span>
          </label>
          <textarea value={body} onChange={(e) => setBody(e.target.value.slice(0, 140))}
                    rows={3} placeholder="What happened?"
                    className="w-full border border-[var(--color-border-strong)] rounded-lg px-3 py-2.5 text-sm font-medium bg-[var(--color-paper)] resize-none mb-4" />

          <div ref={tsContainerRef} className="mb-4 min-h-[65px]" />

          {error && <div className="text-xs text-[var(--color-red)] font-semibold mb-3">{error}</div>}

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose}
                    className="px-4 py-2 text-sm font-semibold text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
                    className="px-5 py-2.5 bg-[var(--color-blue)] text-white text-sm font-bold rounded-lg hover:bg-[var(--color-blue-deep)] disabled:opacity-50">
              {submitting ? 'Filing...' : 'File grievance'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
