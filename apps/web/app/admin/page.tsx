import { count, eq, gte } from 'drizzle-orm';
import { schema } from '@dtb/db';
import { getDb } from '@/lib/db';
import { AdminNav } from '@/components/AdminNav';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const db = getDb();
  const sinceDay = Date.now() - 24 * 60 * 60 * 1000;
  const sinceHour = Date.now() - 60 * 60 * 1000;

  const sitesCount = db.select({ n: count() }).from(schema.sites).get()?.n ?? 0;
  const sitesEnabled = db.select({ n: count() }).from(schema.sites).where(eq(schema.sites.enabled, true)).get()?.n ?? 0;
  const grievancesDay = db.select({ n: count() }).from(schema.grievances).where(gte(schema.grievances.createdAt, sinceDay)).get()?.n ?? 0;
  const grievancesHour = db.select({ n: count() }).from(schema.grievances).where(gte(schema.grievances.createdAt, sinceHour)).get()?.n ?? 0;
  const grievancesHidden = db.select({ n: count() }).from(schema.grievances).where(eq(schema.grievances.visible, false)).get()?.n ?? 0;
  const checksDay = db.select({ n: count() }).from(schema.checks).where(gte(schema.checks.checkedAt, sinceDay)).get()?.n ?? 0;

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      <AdminNav active="/admin" />
      <div className="flex-1 p-8">
        <h1 className="text-2xl font-bold tracking-tight mb-6">Overview</h1>
        <div className="grid grid-cols-3 gap-4">
          <Card label="Sites enabled" value={`${sitesEnabled} / ${sitesCount}`} />
          <Card label="Grievances · last hour" value={grievancesHour} />
          <Card label="Grievances · last 24h" value={grievancesDay} />
          <Card label="Hidden grievances (queue)" value={grievancesHidden} warn={grievancesHidden > 0} />
          <Card label="Checks · last 24h" value={checksDay} />
          <Card label="DB file" value="data/dtb.sqlite" mono />
        </div>
      </div>
    </div>
  );
}

function Card({ label, value, mono = false, warn = false }: { label: string; value: string | number; mono?: boolean; warn?: boolean }) {
  return (
    <div className="border border-[var(--color-border)] rounded-2xl bg-[var(--color-paper)] p-5">
      <p className="text-[10.5px] uppercase tracking-[0.15em] font-semibold text-[var(--color-ink-faint)] mb-2">{label}</p>
      <p className={`text-2xl font-bold tracking-tight ${mono ? 'font-mono text-base break-all' : ''} ${warn ? 'text-[var(--color-amber)]' : 'text-[var(--color-ink)]'}`}>{value}</p>
    </div>
  );
}
