import { PageShell } from '@/components/PageShell';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata = buildMetadata({
  title: 'Press kit · Downtime Bhavan brand assets and data for journalists',
  description: 'Brand assets, sample data, and contact details for journalists, researchers, and civic-tech reporters covering Indian government website reliability.',
  path: '/press',
});

export default function Page() {
  return (
    <PageShell active="status">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Press.</h1>
      <p className="text-[var(--color-ink-dim)] mb-10">
        For journalists writing about Indian government digital infrastructure.
      </p>

      <h2 className="text-xl font-bold mb-3 text-[var(--color-blue)]">What this is</h2>
      <p className="text-[var(--color-ink-soft)] leading-relaxed mb-6">
        Downtime Bhavan is a citizen-run, open-source observatory of India's most-used government
        websites. We measure uptime from Mumbai every 2 minutes and let citizens file grievances
        against specific portals. We're not affiliated with any government body.
      </p>

      <h2 className="text-xl font-bold mb-3 text-[var(--color-blue)]">Use our data</h2>
      <p className="text-[var(--color-ink-soft)] leading-relaxed mb-3">
        All measurement data is free to cite. Please credit "Downtime Bhavan (downtimebhavan.in)"
        and link to the source page. For longitudinal analysis or CSV exports, email us.
      </p>
      <p className="text-[var(--color-ink-soft)] leading-relaxed mb-6">
        See the live data via the <a href="/api" className="text-[var(--color-blue)] underline">API</a>{' '}
        or read about <a href="/methodology" className="text-[var(--color-blue)] underline">how we measure</a>.
      </p>

      <h2 className="text-xl font-bold mb-3 text-[var(--color-blue)]">Contact</h2>
      <p className="text-[var(--color-ink-soft)] leading-relaxed mb-1">
        Press inquiries: <a href="mailto:press@downtimebhavan.in" className="text-[var(--color-blue)] underline">press@downtimebhavan.in</a>
      </p>
      <p className="text-[var(--color-ink-soft)] leading-relaxed mb-6">
        General contact: <a href="/contact" className="text-[var(--color-blue)] underline">/contact</a>
      </p>

      <h2 className="text-xl font-bold mb-3 text-[var(--color-blue)]">License</h2>
      <p className="text-[var(--color-ink-soft)] leading-relaxed">
        The source code is AGPL-3.0. The data is CC-BY-4.0.
      </p>
    </PageShell>
  );
}
