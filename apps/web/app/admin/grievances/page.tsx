import { desc, eq } from 'drizzle-orm';
import { schema } from '@dtb/db';
import { getDb } from '@/lib/db';
import { AdminNav } from '@/components/AdminNav';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const db = getDb();
  const sites = db.select().from(schema.sites).all();
  const siteName = new Map(sites.map((s) => [s.id, s.name] as const));

  const hidden = db.select().from(schema.grievances)
    .where(eq(schema.grievances.visible, false))
    .orderBy(desc(schema.grievances.createdAt))
    .limit(100).all();

  const recent = db.select().from(schema.grievances)
    .where(eq(schema.grievances.visible, true))
    .orderBy(desc(schema.grievances.createdAt))
    .limit(50).all();

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      <AdminNav active="/admin/grievances" />
      <div className="flex-1 p-8 max-w-[1100px]">
        <h1 className="text-2xl font-bold tracking-tight mb-6">Grievances</h1>

        <h2 className="text-base font-bold mb-3 text-[var(--color-amber)]">
          Hidden queue · {hidden.length}
        </h2>
        <Table rows={hidden} siteName={siteName} action="unhide" />

        <h2 className="text-base font-bold mt-10 mb-3">Recently visible</h2>
        <Table rows={recent} siteName={siteName} action="hide" />
      </div>
    </div>
  );
}

function Table({ rows, siteName, action }: { rows: typeof schema.grievances.$inferSelect[]; siteName: Map<string, string>; action: 'hide' | 'unhide' }) {
  if (rows.length === 0) return <p className="text-sm text-[var(--color-ink-dim)]">— None —</p>;
  return (
    <div className="border border-[var(--color-border)] rounded-2xl overflow-hidden bg-[var(--color-paper)]">
      {rows.map((r) => (
        <form key={r.id} method="POST" action={`/api/admin/grievance/${r.id}/${action}`}
              className="flex items-start gap-4 px-5 py-4 border-b border-[var(--color-border)] last:border-b-0">
          <div className="text-[10px] font-mono text-[var(--color-ink-faint)] w-12 shrink-0">#{r.id}</div>
          <div className="flex-1">
            <div className="text-xs font-bold mb-1">
              {siteName.get(r.siteId) ?? r.siteId} <span className="text-[var(--color-ink-faint)] font-medium">· {r.tag}</span>
              <span className="text-[var(--color-ink-faint)] font-medium ml-2">· reports: {r.reportsCount}</span>
            </div>
            <p className="text-sm">{r.body}</p>
          </div>
          <button type="submit"
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg ${
                    action === 'unhide'
                      ? 'bg-[var(--color-green)] text-white hover:bg-[var(--color-green-soft)] hover:text-[var(--color-green)]'
                      : 'bg-[var(--color-red)] text-white hover:opacity-90'
                  }`}>
            {action === 'unhide' ? 'Unhide' : 'Hide'}
          </button>
        </form>
      ))}
    </div>
  );
}
