'use client';

import { useState } from 'react';

interface Props { onClose: () => void; }
type Step = 'email' | 'otp' | 'done';

export function DeleteFlow({ onClose }: Props) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [maskedContact, setMaskedContact] = useState('');
  const [purged, setPurged] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const res = await fetch('/api/notify/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact: email, purpose: 'delete_data', kind: 'email' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error === 'invalid_email' ? 'Invalid email address.'
              : data.error === 'invalid_phone' ? 'Invalid Indian mobile number.'
              : data.error === 'rate_limited' ? 'Too many requests. Wait a minute.'
              : data.error === 'too_many_otps' ? 'Too many OTPs for this address. Wait an hour.'
              : `Failed: ${data.error ?? res.status}`);
      } else {
        setMaskedContact(data.maskedContact);
        setStep('otp');
      }
    } catch { setError('Network error.'); }
    finally { setBusy(false); }
  }

  async function confirmDelete(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const res = await fetch('/api/notify/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact: email, otp, kind: 'email' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error === 'otp_wrong_or_expired' ? 'OTP wrong or expired.' : `Failed: ${data.error ?? res.status}`);
      } else {
        setPurged(data.purged ?? 0);
        setStep('done');
      }
    } catch { setError('Network error.'); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center px-4"
         onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-[var(--color-paper)] rounded-2xl p-7 max-w-[440px] w-full shadow-[0_20px_60px_-12px_rgba(15,31,95,0.5)]">
        <div className="flex justify-between items-baseline mb-1">
          <h2 className="text-xl font-bold tracking-tight">
            {step === 'email' && 'Confirm your email'}
            {step === 'otp' && 'Enter the code'}
            {step === 'done' && 'Data purged ✓'}
          </h2>
          <button type="button" onClick={onClose} className="text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] text-sm" aria-label="Close">✕</button>
        </div>

        {step === 'email' && (
          <form onSubmit={requestOtp}>
            <p className="text-sm text-[var(--color-ink-dim)] mb-5">
              Enter the email address you used. We&apos;ll send you a one-time code to confirm.
            </p>
            <div className="mb-4">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus
                     placeholder="you@example.com"
                     className="w-full border border-[var(--color-border-strong)] rounded-lg px-3 py-2.5 text-sm bg-[var(--color-paper)]" />
            </div>
            {error && <div className="text-xs text-[var(--color-red)] font-semibold mb-3">{error}</div>}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]">Cancel</button>
              <button type="submit" disabled={busy}
                      className="px-5 py-2.5 bg-[var(--color-red)] text-white text-sm font-bold rounded-lg hover:opacity-90 disabled:opacity-50">
                {busy ? 'Sending...' : 'Send code'}
              </button>
            </div>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={confirmDelete}>
            <p className="text-sm text-[var(--color-ink-dim)] mb-5">
              Sent code to <b className="font-mono text-[var(--color-ink)]">{maskedContact}</b>. Once you confirm, your data is purged immediately.
            </p>
            <input type="text" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                   required autoFocus inputMode="numeric"
                   placeholder="123456"
                   className="w-full border border-[var(--color-border-strong)] rounded-lg px-3 py-3 text-base font-mono font-bold tracking-[0.3em] text-center bg-[var(--color-paper)] mb-4" />
            {error && <div className="text-xs text-[var(--color-red)] font-semibold mb-3">{error}</div>}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => { setStep('email'); setOtp(''); }} className="px-4 py-2 text-sm font-semibold text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]">← Back</button>
              <button type="submit" disabled={busy || otp.length !== 6}
                      className="px-5 py-2.5 bg-[var(--color-red)] text-white text-sm font-bold rounded-lg hover:opacity-90 disabled:opacity-50">
                {busy ? 'Purging...' : 'Confirm delete'}
              </button>
            </div>
          </form>
        )}

        {step === 'done' && (
          <div className="text-center">
            <div className="text-5xl mb-4">🗑️</div>
            <p className="text-base font-semibold mb-2">Done.</p>
            <p className="text-sm text-[var(--color-ink-dim)] mb-6">
              Purged <b>{purged}</b> subscription record(s) and all associated OTP attempts.
              Your email address is no longer in our database.
            </p>
            <button onClick={onClose} className="px-5 py-2.5 bg-[var(--color-blue)] text-white text-sm font-bold rounded-lg hover:bg-[var(--color-blue-deep)]">
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
