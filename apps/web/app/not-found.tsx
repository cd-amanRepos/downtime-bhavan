import { PageShell } from '@/components/PageShell';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata = buildMetadata({
  title: 'Page not found',
  description: 'This page is not available on Downtime Bhavan.',
  path: '/404',
  noindex: true,
});

export default function NotFound() {
  return (
    <PageShell active="status">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-4">Page not found</h1>
        <p className="text-[var(--color-ink-dim)] mb-2">
          This page is not available — possibly never was. The unofficial observatory does not track this URL.
        </p>
        <p className="text-[var(--color-ink-dim)] mb-8" style={{ fontFamily: 'var(--font-hi)' }}>
          यह पृष्ठ उपलब्ध नहीं है।
        </p>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <a href="/" className="text-[var(--color-blue)] underline-offset-4 hover:underline">Return to status →</a>
          <a href="/sites" className="text-[var(--color-blue)] underline-offset-4 hover:underline">Browse all tracked portals →</a>
        </div>
      </div>
    </PageShell>
  );
}
