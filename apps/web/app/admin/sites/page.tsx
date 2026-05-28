import { schema } from '@dtb/db';
import { getDb } from '@/lib/db';
import { AdminNav } from '@/components/AdminNav';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const db = getDb();
  const sites = db.select().from(schema.sites).all();

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      <AdminNav active="/admin/sites" />
      <div className="flex-1 p-8 max-w-[1100px]">
        <h1 className="text-2xl font-bold tracking-tight mb-2">Sites</h1>
        <p className="text-sm text-[var(--color-ink-dim)] mb-6">
          Read-only view. Edit <code className="bg-[var(--color-paper-2)] px-1.5 py-0.5 rounded">config/sites/*.json</code> + run <code className="bg-[var(--color-paper-2)] px-1.5 py-0.5 rounded">npm run db:seed</code> to change.
        </p>

        <div className="space-y-3">
          {sites.map((s) => (
            <details key={s.id} className="border border-[var(--color-border)] rounded-xl bg-[var(--color-paper)] overflow-hidden">
              <summary className="cursor-pointer px-5 py-3.5 flex items-center justify-between hover:bg-[var(--color-paper-2)]">
                <div>
                  <span className="font-bold">{s.name}</span>
                  <span className="text-xs text-[var(--color-ink-faint)] ml-2">{s.id}</span>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded ${
                  s.enabled
                    ? 'bg-[var(--color-green-soft)] text-[var(--color-green)]'
                    : 'bg-[var(--color-paper-2)] text-[var(--color-ink-faint)]'
                }`}>
                  {s.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </summary>
              <pre className="text-[11px] font-mono bg-[var(--color-paper-2)] p-4 overflow-x-auto border-t border-[var(--color-border)]">
                {JSON.stringify(JSON.parse(s.configJson), null, 2)}
              </pre>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
