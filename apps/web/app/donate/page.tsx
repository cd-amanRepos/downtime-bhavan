import { PageShell } from '@/components/PageShell';
import { DonateQR } from '@/components/DonateQR';

export const metadata = { title: 'Donate · Downtime Bhavan' };

export default function Page() {
  const upiId = process.env.DTB_UPI_ID ?? 'downtimebhavan@oksbi';
  const ghSponsors = process.env.DTB_GH_SPONSORS;

  return (
    <PageShell active="status" maxWidth={760}>
      <div className="text-center mb-10">
        <span className="inline-flex items-center gap-2 text-[10.5px] font-semibold text-[var(--color-saffron)] tracking-[0.18em] uppercase mb-3">
          <span>☕</span>
          <span>Office of the Chai Fund</span>
        </span>
        <h1 className="text-4xl font-bold tracking-tight">
          If you liked the work,<br/>
          <em className="text-[var(--color-blue)] font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>fund the continuation.</em>
        </h1>
        <p className="text-base text-[var(--color-ink-dim)] mt-4 max-w-[520px] mx-auto leading-relaxed">
          This office runs on chai and citizen donations. Every ₹ pays the WhatsApp send cost
          for the next batch of alerts and keeps the site free, ad-free, and open source.
        </p>
      </div>

      <DonateQR upiId={upiId} />

      {ghSponsors && (
        <div className="text-center mt-6">
          <a href={`https://github.com/sponsors/${ghSponsors}`} target="_blank" rel="noopener noreferrer"
             className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-[var(--color-border-strong)] text-sm font-bold text-[var(--color-ink)] hover:bg-[var(--color-paper-2)] transition-all">
            <span>♡</span> GitHub Sponsors (for international donors) →
          </a>
        </div>
      )}

      <hr className="my-10 border-[var(--color-border)]" />

      <div className="bg-[var(--color-paper)] border border-[var(--color-border)] rounded-2xl p-6">
        <h2 className="text-base font-bold mb-3 text-[var(--color-blue)]">Transparency</h2>
        <ul className="space-y-2 text-sm text-[var(--color-ink-soft)]">
          <li>• <b>This month:</b> ₹0 raised, ₹0 spent</li>
          <li>• <b>WhatsApp messages:</b> 0 / 1,000 free (free tier resets monthly)</li>
          <li>• <b>Monthly recurring cost:</b> ~₹400 (Fly.io VM) + ~₹70 (domain prorated)</li>
          <li>• <b>Donations track:</b> manual reconciliation. Public donor wall coming if anyone gives big.</li>
        </ul>
        <p className="mt-4 text-xs text-[var(--color-ink-faint)] italic">
          We don't take donations through any intermediary (no Razorpay, no Patreon).
          Direct UPI = 0% fees. 100% reaches the project.
        </p>
      </div>

      <p className="mt-8 text-center text-xs text-[var(--color-ink-faint)]">
        Citizens-funded · zero ads · AGPL-3.0
      </p>
    </PageShell>
  );
}
