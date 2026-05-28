'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AshokaMark } from '@/components/AshokaMark';

function LoginForm() {
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get('from') ?? '/admin';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (res.ok) router.push(from as any);
    else { setError('Wrong token.'); setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="bg-[var(--color-paper)] border border-[var(--color-border)] rounded-2xl p-8 w-full max-w-[400px] shadow-[0_20px_60px_-12px_rgba(15,31,95,0.18)]">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-[var(--color-blue)] flex items-center justify-center text-white">
          <AshokaMark size={28} />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-[var(--color-ink-faint)]">Restricted</p>
          <h1 className="text-lg font-bold tracking-tight">Admin · Downtime Bhavan</h1>
        </div>
      </div>
      <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--color-ink-faint)] mb-1.5">Admin token</label>
      <input type="password" value={token} onChange={(e) => setToken(e.target.value)}
             autoFocus required
             className="w-full border border-[var(--color-border-strong)] rounded-lg px-3 py-2.5 text-sm font-mono mb-3 bg-[var(--color-paper)]" />
      {error && <p className="text-xs text-[var(--color-red)] font-semibold mb-3">{error}</p>}
      <button type="submit" disabled={busy}
              className="w-full bg-[var(--color-blue)] text-white px-5 py-3 rounded-lg text-sm font-bold hover:bg-[var(--color-blue-deep)] disabled:opacity-50">
        {busy ? 'Verifying...' : 'Enter'}
      </button>
    </form>
  );
}

export default function Page() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-[var(--color-bg)]">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
