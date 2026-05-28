import { PageHeader } from '@/components/PageHeader';
import { PageFooter } from '@/components/PageFooter';
import { Tricolor } from '@/components/Tricolor';
import { DepartmentStatusPanel } from '@/components/DepartmentStatusPanel';
import { NotifyHero } from '@/components/NotifyHero';
import { JantaDarbarPanel } from '@/components/JantaDarbarPanel';

export const dynamic = 'force-dynamic';

export default async function Page() {
  return (
    <>
      <PageHeader active="status" />
      <Tricolor />
      <main className="layout min-h-[calc(100vh-80px)]">
        <DepartmentStatusPanel />
        <NotifyHero />
        <JantaDarbarPanel />
      </main>
      <PageFooter />
    </>
  );
}
