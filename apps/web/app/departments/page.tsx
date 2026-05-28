import { PageShell } from '@/components/PageShell';
import { SiteTable } from '@/components/SiteTable';
import { buildMetadata } from '@/lib/seo/metadata';

export const dynamic = 'force-dynamic';
export const metadata = buildMetadata({
  title: 'Departments · Indian government websites grouped by ministry',
  description: 'Browse tracked Indian government websites grouped by department. Live status and 30-day uptime per portal.',
  path: '/departments',
});

export default async function Page() {
  return (
    <PageShell active="status">
      <div className="mb-8">
        <span className="block text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-faint)] mb-1">
          12 Departments · Mumbai checkpoint · Refreshed every 2 minutes
        </span>
        <h1 className="text-3xl font-bold tracking-tight">Department Register.</h1>
        <p className="text-[var(--color-ink-dim)] mt-2 max-w-[640px]">
          Every Indian government website we track, sorted worst-first.
          Click any row for the full incident history.
        </p>
      </div>

      <SiteTable />
    </PageShell>
  );
}
