import { eq } from 'drizzle-orm';
import { schema } from '@dtb/db';
import { getDb } from '@/lib/db';
import { PageHeader } from '@/components/PageHeader';
import { PageFooter } from '@/components/PageFooter';
import { Tricolor } from '@/components/Tricolor';
import { DepartmentStatusPanel } from '@/components/DepartmentStatusPanel';
import { NotifyHero } from '@/components/NotifyHero';
import { JantaDarbarPanel } from '@/components/JantaDarbarPanel';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const db = getDb();
  const sites = db
    .select({ id: schema.sites.id, name: schema.sites.name })
    .from(schema.sites)
    .where(eq(schema.sites.enabled, true))
    .all();

  return (
    <>
      <PageHeader active="status" />
      <Tricolor />
      <main className="layout min-h-[calc(100vh-80px)]">
        <DepartmentStatusPanel />
        <NotifyHero sites={sites} />
        <JantaDarbarPanel />
      </main>
      <PageFooter />
    </>
  );
}
