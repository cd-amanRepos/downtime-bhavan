import { PageShell } from '@/components/PageShell';

export const metadata = { title: 'Contact · Downtime Bhavan' };

export default function Page() {
  return (
    <PageShell active="status" maxWidth={720}>
      <h1 className="text-3xl font-bold tracking-tight mb-8">Contact.</h1>

      <div className="space-y-6 text-[var(--color-ink-soft)] leading-relaxed">
        <p>
          The fastest way to tell us about a broken government website is the{' '}
          <a href="/" className="text-[var(--color-blue)] underline font-semibold">Janta Darbar</a> on the homepage —
          file a grievance and other citizens see it instantly.
        </p>

        <div className="border border-[var(--color-border)] rounded-xl p-5 bg-[var(--color-paper)]">
          <h2 className="text-base font-bold mb-1">General</h2>
          <p><a href="mailto:hi@downtimebhavan.in" className="text-[var(--color-blue)] underline">hi@downtimebhavan.in</a></p>
        </div>

        <div className="border border-[var(--color-border)] rounded-xl p-5 bg-[var(--color-paper)]">
          <h2 className="text-base font-bold mb-1">Press</h2>
          <p><a href="mailto:press@downtimebhavan.in" className="text-[var(--color-blue)] underline">press@downtimebhavan.in</a></p>
        </div>

        <div className="border border-[var(--color-border)] rounded-xl p-5 bg-[var(--color-paper)]">
          <h2 className="text-base font-bold mb-1">Security disclosures</h2>
          <p>Please email <a href="mailto:security@downtimebhavan.in" className="text-[var(--color-blue)] underline">security@downtimebhavan.in</a> with details. We acknowledge within 72 hours.</p>
        </div>

        <p className="text-sm text-[var(--color-ink-faint)] italic">
          These addresses route to the same inbox for V1. We'll separate them when volume warrants.
        </p>
      </div>
    </PageShell>
  );
}
