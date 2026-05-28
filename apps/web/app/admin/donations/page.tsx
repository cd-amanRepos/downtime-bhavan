import { desc } from 'drizzle-orm';
import { schema } from '@dtb/db';
import { getDb } from '@/lib/db';
import { AdminNav } from '@/components/AdminNav';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const db = getDb();
  const all = db.select().from(schema.donations).orderBy(desc(schema.donations.receivedAt)).all();
  const total = all.reduce((s, d) => s + d.amountInr, 0);
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
  const thisMonth = all.filter((d) => d.receivedAt >= monthStart.getTime()).reduce((s, d) => s + d.amountInr, 0);

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      <AdminNav active="/admin/donations" />
      <div className="flex-1 p-8 max-w-[900px]">
        <h1 className="text-2xl font-bold tracking-tight mb-6">Donations</h1>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="border border-[var(--color-border)] rounded-2xl bg-[var(--color-paper)] p-5">
            <p className="text-[10.5px] uppercase tracking-[0.15em] font-semibold text-[var(--color-ink-faint)] mb-2">This month</p>
            <p className="text-2xl font-bold tabular-nums text-[var(--color-green)]">₹{thisMonth.toLocaleString('en-IN')}</p>
          </div>
          <div className="border border-[var(--color-border)] rounded-2xl bg-[var(--color-paper)] p-5">
            <p className="text-[10.5px] uppercase tracking-[0.15em] font-semibold text-[var(--color-ink-faint)] mb-2">All-time</p>
            <p className="text-2xl font-bold tabular-nums">₹{total.toLocaleString('en-IN')}</p>
          </div>
        </div>

        <h2 className="text-base font-bold mb-3">Log a donation</h2>
        <form method="POST" action="/api/admin/donation/add"
              className="border border-[var(--color-border)] rounded-2xl bg-[var(--color-paper)] p-5 mb-8">
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--color-ink-faint)] mb-1.5">Amount ₹</label>
              <input name="amount" type="number" step="0.01" required
                     className="w-full border border-[var(--color-border-strong)] rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--color-ink-faint)] mb-1.5">Source</label>
              <select name="source" required
                      className="w-full border border-[var(--color-border-strong)] rounded-lg px-3 py-2 text-sm">
                <option value="upi">UPI</option>
                <option value="github_sponsors">GitHub Sponsors</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--color-ink-faint)] mb-1.5">Note</label>
              <input name="note" type="text" placeholder="Optional"
                     className="w-full border border-[var(--color-border-strong)] rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <button type="submit" className="bg-[var(--color-blue)] text-white px-4 py-2 rounded-lg text-sm font-bold">
            Add entry
          </button>
        </form>

        <h2 className="text-base font-bold mb-3">All entries</h2>
        <div className="border border-[var(--color-border)] rounded-2xl overflow-hidden bg-[var(--color-paper)]">
          {all.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-[var(--color-ink-dim)]">— No donations logged —</p>
          ) : all.map((d) => (
            <div key={d.id} className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)] last:border-b-0">
              <div>
                <span className="text-sm font-bold tabular-nums">₹{d.amountInr.toLocaleString('en-IN')}</span>
                <span className="text-xs text-[var(--color-ink-faint)] ml-3">{d.source}</span>
                {d.note && <span className="text-xs text-[var(--color-ink-dim)] ml-3">— {d.note}</span>}
              </div>
              <span className="text-xs text-[var(--color-ink-faint)]">{new Date(d.receivedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
