import { Header } from '@/components/Header';
import { Tricolor } from '@/components/Tricolor';
import { DepartmentStatusPanel } from '@/components/DepartmentStatusPanel';
import { NotifyHero } from '@/components/NotifyHero';
import { JantaDarbarPanel } from '@/components/JantaDarbarPanel';

export const dynamic = 'force-dynamic';

export default async function Page() {
  return (
    <>
      <Header />
      <Tricolor />
      <main className="layout min-h-[calc(100vh-80px)]">
        <DepartmentStatusPanel />
        <NotifyHero />
        <JantaDarbarPanel />
      </main>
      <footer className="border-t border-[var(--color-border)] bg-[var(--color-paper)] px-7 py-4 flex justify-between items-center text-[11.5px] text-[var(--color-ink-faint)] font-medium">
        <div>
          <span className="text-[var(--color-saffron)] font-bold tracking-[0.08em] uppercase text-[10.5px]">◆ Unofficial Observatory ◆</span>
          &nbsp;&nbsp;
          <b className="text-[var(--color-ink-soft)] font-bold">Downtime Bhavan</b> · Not affiliated with any government body · Data from Mumbai · Refreshed every 2 min
        </div>
        <div className="flex gap-4.5">
          <a className="hover:text-[var(--color-blue)] cursor-pointer">Methodology</a>
          <a className="hover:text-[var(--color-blue)] cursor-pointer">API</a>
          <a className="hover:text-[var(--color-blue)] cursor-pointer">Press</a>
          <a className="hover:text-[var(--color-blue)] cursor-pointer">Contact</a>
        </div>
      </footer>
    </>
  );
}
