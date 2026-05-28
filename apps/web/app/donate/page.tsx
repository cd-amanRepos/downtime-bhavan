import { PageShell } from '@/components/PageShell';
import { DonateQR } from '@/components/DonateQR';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd } from '@/components/JsonLd';
import {
  buildBreadcrumbSchema,
  buildDonateActionSchema,
} from '@/lib/seo/schema';
import { SITE_URL } from '@/lib/seo/constants';

// Render on every request so DTB_UPI_ID changes via `fly secrets set` take
// effect immediately. Without this, Next.js statically generates the page at
// build time, baking whatever env value was present at build into the HTML.
export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Donate · keep the unofficial observatory free for citizens',
  description: 'Downtime Bhavan runs on donations. UPI for Indian donors. Covers the server, domain, and email sender. No ads, no sponsors.',
  path: '/donate',
});

const jsonLd: object[] = [
  buildBreadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: 'Donate', url: `${SITE_URL}/donate` },
  ]),
  buildDonateActionSchema(),
];

export default function Page() {
  // UPI ID is public info (it's printed on this page), so hardcoding the
  // current handle as the default is fine. Production overrides via the
  // DTB_UPI_ID Fly secret if/when the handle rotates.
  const upiId = process.env.DTB_UPI_ID ?? 'downtimebhavan@axl';
  const ghSponsors = process.env.DTB_GH_SPONSORS;

  return (
    <PageShell active="status" maxWidth={760}>
      <JsonLd data={jsonLd} />
      <div className="text-center mb-10">
        <span className="inline-flex items-center gap-2 text-[10.5px] font-semibold text-[var(--color-saffron)] tracking-[0.18em] uppercase mb-3">
          <span>☕</span>
          <span>Office of the Chai Fund</span>
        </span>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          If you liked the work,<br/>
          <em className="text-[var(--color-blue)] font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>fund the continuation.</em>
        </h1>
        <p className="text-base text-[var(--color-ink-dim)] mt-4 max-w-[520px] mx-auto leading-relaxed">
          This office runs on chai and citizen donations. Every ₹ pays for the
          server, the domain, the email sender, and the time of the citizen
          running it. In return: no ads, no data sold, no sponsor steering the data.
        </p>
      </div>

      <DonateQR upiId={upiId} />

      {ghSponsors && (
        <div className="text-center mt-6">
          <a href={`https://github.com/sponsors/${ghSponsors}`} target="_blank" rel="noopener noreferrer"
             className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-[var(--color-border-strong)] text-sm font-bold text-[var(--color-ink)] hover:bg-[var(--color-paper-2)] transition-all">
            <span>♡</span> GitHub Sponsors (for international donors) →
          </a>
        </div>
      )}

      <hr className="my-10 border-[var(--color-border)]" />

      <div className="bg-[var(--color-amber-soft)]/40 border border-[var(--color-amber-soft)] rounded-2xl p-6">
        <h2 className="text-base font-bold mb-3 text-[var(--color-amber)]">Honest note</h2>
        <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed mb-3">
          <b>This is not a registered non-profit.</b> Donations land in a personal UPI
          operated by the citizen running this site. They pay for the infrastructure
          (Fly.io VM + domain + email API) <em>and</em> compensate that person's time.
        </p>
        <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed mb-3">
          What you get for the chai money:
        </p>
        <ul className="space-y-1 text-sm text-[var(--color-ink-soft)] ml-4">
          <li>● No advertising, ever.</li>
          <li>● No data sold or shared with anyone.</li>
          <li>● No sponsor influence on which sites we track or how we measure.</li>
          <li>● The code stays open source (AGPL-3.0) — audit it any time.</li>
        </ul>
        <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed mt-3">
          If donations grow past the threshold where 80G tax-deduction certification
          starts mattering, we'll register a Section 8 entity and migrate properly.
          Until then: personal UPI, declared income, plain accounting.
        </p>
      </div>

      <div className="bg-[var(--color-paper)] border border-[var(--color-border)] rounded-2xl p-6 mt-6">
        <h2 className="text-base font-bold mb-3 text-[var(--color-blue)]">Transparency</h2>
        <ul className="space-y-2 text-sm text-[var(--color-ink-soft)]">
          <li>• <b>This month:</b> ₹0 raised, ~₹500 spent (server + domain + email)</li>
          <li>• <b>Email sends:</b> covered by Resend's free tier (3,000/month)</li>
          <li>• <b>Monthly recurring cost:</b> ~₹400 (Fly.io VM) + ~₹70 (domain prorated)</li>
          <li>• <b>Donations track:</b> manual ledger at /admin. Public donor wall coming if anyone gives big.</li>
        </ul>
        <p className="mt-4 text-xs text-[var(--color-ink-faint)] italic">
          UPI is direct — no Razorpay, no Patreon, no platform fees. What you send is what arrives.
        </p>
      </div>

      <p className="mt-8 text-center text-xs text-[var(--color-ink-faint)]">
        Citizen-operated · zero ads · AGPL-3.0
      </p>
    </PageShell>
  );
}
