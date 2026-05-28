'use client';

import { useState } from 'react';

interface Site { id: string; name: string; }
interface Props {
  sites: Site[];
  initialSiteId?: string;
  onClose: () => void;
}

type Step = 'email' | 'otp' | 'done';

export function NotifyFlow({ sites, initialSiteId, onClose }: Props) {
  const [step, setStep] = useState<Step>('email');
  const [siteId, setSiteId] = useState(initialSiteId ?? sites[0]?.id ?? '');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [maskedContact, setMaskedContact] = useState('');
  const [siteName, setSiteName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/notify/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact: email, siteId, kind: 'email' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.error === 'invalid_email' ? 'Please enter a valid email address.'
          : data.error === 'invalid_phone' ? 'Please enter a valid Indian mobile number.'
          : data.error === 'rate_limited' ? 'You are sending too many requests. Wait a minute.'
          : data.error === 'too_many_otps' ? 'Too many OTP requests for this number. Try again in an hour.'
          : data.error === 'max_alerts_reached' ? `You already have ${data.max} active alerts. Cancel one first.`
          : data.error === 'site_not_tracked' ? 'That site is not tracked yet.'
          : `Failed: ${data.error ?? res.status}`
        );
      } else {
        setMaskedContact(data.maskedContact);
        setSiteName(sites.find(s => s.id === siteId)?.name ?? '');
        setStep('otp');
      }
    } catch {
      setError('Network error. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/notify/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact: email, otp, kind: 'email' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.error === 'otp_wrong_or_expired' ? 'OTP is wrong or expired. Try again or request a new one.'
          : data.error === 'no_pending' ? 'No pending alert for this number. Request again.'
          : `Failed: ${data.error ?? res.status}`
        );
      } else {
        setStep('done');
      }
    } catch {
      setError('Network error. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center px-4"
         onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-[var(--color-paper)] rounded-2xl p-7 max-w-[440px] w-full shadow-[0_20px_60px_-12px_rgba(15,31,95,0.5)]">
        <div className="flex justify-between items-baseline mb-1">
          <h2 className="text-xl font-bold tracking-tight">
            {step === 'email' && 'Set an email alert'}
            {step === 'otp' && 'Enter the code'}
            {step === 'done' && 'Alert is live ✓'}
          </h2>
          <button type="button" onClick={onClose} className="text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] text-sm" aria-label="Close">✕</button>
        </div>

        {step === 'email' && (
          <form onSubmit={requestOtp}>
            <p className="text-sm text-[var(--color-ink-dim)] mb-5">
              We'll email you a one-time code. Any working email address works.
            </p>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--color-ink-faint)] mb-1.5">Department</label>
            <select value={siteId} onChange={(e) => setSiteId(e.target.value)} required
                    className="w-full border border-[var(--color-border-strong)] rounded-lg px-3 py-2.5 text-sm font-medium bg-[var(--color-paper)] mb-4">
              {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>

            <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--color-ink-faint)] mb-1.5">Email address</label>
            <div className="flex gap-2 mb-4">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus
                     placeholder="you@example.com"
                     className="flex-1 border border-[var(--color-border-strong)] rounded-lg px-3 py-2.5 text-sm bg-[var(--color-paper)]" />
            </div>

            {error && <div className="text-xs text-[var(--color-red)] font-semibold mb-3">{error}</div>}

            <div className="flex gap-2 justify-end">
              <button type="button" onClick={onClose}
                      className="px-4 py-2 text-sm font-semibold text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]">
                Cancel
              </button>
              <button type="submit" disabled={busy}
                      className="px-5 py-2.5 bg-[var(--color-blue)] text-white text-sm font-bold rounded-lg hover:bg-[var(--color-blue-deep)] disabled:opacity-50">
                {busy ? 'Sending...' : 'Send code'}
              </button>
            </div>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={verifyOtp}>
            <p className="text-sm text-[var(--color-ink-dim)] mb-1">
              Sent a 6-digit code to <b className="text-[var(--color-ink)] font-mono">{maskedContact}</b>.
            </p>
            <p className="text-xs text-[var(--color-ink-faint)] mb-5">For <b className="text-[var(--color-ink-soft)]">{siteName}</b>. Code expires in 10 minutes.</p>

            <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--color-ink-faint)] mb-1.5">One-time code</label>
            <input type="text" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                   required autoFocus inputMode="numeric" pattern="[0-9]{6}"
                   placeholder="123456"
                   className="w-full border border-[var(--color-border-strong)] rounded-lg px-3 py-3 text-base font-mono font-bold tracking-[0.3em] text-center bg-[var(--color-paper)] mb-4" />

            {error && <div className="text-xs text-[var(--color-red)] font-semibold mb-3">{error}</div>}

            <div className="flex gap-2 justify-between items-center">
              <button type="button" onClick={() => { setStep('email'); setOtp(''); }}
                      className="text-xs text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] font-semibold">
                ← Change email
              </button>
              <button type="submit" disabled={busy || otp.length !== 6}
                      className="px-5 py-2.5 bg-[var(--color-blue)] text-white text-sm font-bold rounded-lg hover:bg-[var(--color-blue-deep)] disabled:opacity-50">
                {busy ? 'Verifying...' : 'Confirm'}
              </button>
            </div>
          </form>
        )}

        {step === 'done' && (
          <div className="text-center">
            <div className="text-5xl mb-4">🔔</div>
            <p className="text-base font-semibold mb-2">You're on the list.</p>
            <p className="text-sm text-[var(--color-ink-dim)] mb-6">
              We'll <b>email</b> <b className="font-mono">{maskedContact}</b> the moment <b>{siteName}</b> starts working again. To stop alerts, visit /delete-my-data.
            </p>
            <button onClick={onClose}
                    className="px-5 py-2.5 bg-[var(--color-blue)] text-white text-sm font-bold rounded-lg hover:bg-[var(--color-blue-deep)]">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
