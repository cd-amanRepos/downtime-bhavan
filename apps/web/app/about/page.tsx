import { PageShell } from '@/components/PageShell';
import { JsonLd } from '@/components/JsonLd';
import { buildMetadata } from '@/lib/seo/metadata';
import {
  buildAboutPageSchema,
  buildBreadcrumbSchema,
  buildPersonSchema,
} from '@/lib/seo/schema';
import {
  OPERATOR_NAME,
  SITE_URL,
  SOCIAL_GITHUB,
  SOCIAL_X,
} from '@/lib/seo/constants';

export const metadata = buildMetadata({
  title: 'About · the unofficial observatory of Sarkari uptime',
  description:
    'Downtime Bhavan is an independent civic project tracking Indian government website reliability. Not affiliated with any government body.',
  path: '/about',
});

export default function Page() {
  const personSameAs = [SOCIAL_X, SOCIAL_GITHUB].filter((s) => s.length > 0);

  return (
    <PageShell active="status" maxWidth={760}>
      <JsonLd
        data={[
          buildBreadcrumbSchema([
            { name: 'Home', url: SITE_URL },
            { name: 'About', url: `${SITE_URL}/about` },
          ]),
          buildAboutPageSchema({
            url: `${SITE_URL}/about`,
            name: 'About Downtime Bhavan',
            description:
              'Independent civic project tracking the live status and 30-day uptime of Indian government websites.',
          }),
          buildPersonSchema({
            name: OPERATOR_NAME,
            url: `${SITE_URL}/about`,
            sameAs: personSameAs,
          }),
        ]}
      />

      <h1 className="text-3xl font-bold tracking-tight mb-2">About Downtime Bhavan</h1>
      <p
        className="text-[var(--color-ink-dim)] mb-10 text-base"
        style={{ fontFamily: 'var(--font-hi)' }}
      >
        एक अनौपचारिक वेधशाला · An unofficial observatory
      </p>

      <p className="text-[var(--color-ink-soft)] leading-relaxed mb-10">
        Downtime Bhavan is an independent civic project that tracks the live status,
        30-day uptime, and citizen-reported grievances against India's most-used
        government websites. We are not affiliated with the Government of India or
        any government body.
      </p>

      <Section title="What we do">
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Live monitoring from an Indian VPS, every two minutes.</li>
          <li>
            Hybrid HTTP and headless browser checks to detect geofenced and
            functional outages that simple ping checks miss.
          </li>
          <li>Free email alerts when a portal you depend on comes back up. WhatsApp alerts coming soon.</li>
          <li>
            The Janta Darbar — a public, time-stamped stream of citizen reports.
          </li>
        </ul>
      </Section>

      <Section title="Who runs this">
        <p className="mb-3">
          Downtime Bhavan is built and maintained by the{' '}
          <b className="text-[var(--color-ink)]">{OPERATOR_NAME}</b> — a small group
          of civic-minded engineers based in India. We work on this in our spare
          time. If you want to help, see the GitHub repository or get in touch.
        </p>
        <p>
          <a
            href={SOCIAL_GITHUB}
            className="text-[var(--color-blue)] underline"
            rel="noopener noreferrer"
            target="_blank"
          >
            GitHub repository
          </a>
          {' · '}
          <a
            href={SOCIAL_X}
            className="text-[var(--color-blue)] underline"
            rel="noopener noreferrer"
            target="_blank"
          >
            X / Twitter
          </a>
        </p>
      </Section>

      <Section title="Funding">
        <p>
          Downtime Bhavan is donation-funded. Operating cost: ₹0 to citizens. UPI
          accepted. Donations fund the Fly.io VM, domain, and Resend email API —
          and WhatsApp Cloud API messaging once that channel ships.{' '}
          <a href="/donate" className="text-[var(--color-blue)] underline font-semibold">
            Donate →
          </a>
        </p>
      </Section>

      <Section title="Trust and corrections">
        <p>
          If our data is wrong, write to{' '}
          <a
            href="mailto:corrections@downtimebhavan.in"
            className="text-[var(--color-blue)] underline"
          >
            corrections@downtimebhavan.in
          </a>
          . We publish corrections publicly within 48 hours. The detection
          methodology, including what counts as Working, Degraded, and Unreachable,
          is documented on the{' '}
          <a href="/methodology" className="text-[var(--color-blue)] underline">
            Methodology
          </a>{' '}
          page.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          General queries:{' '}
          <a href="/contact" className="text-[var(--color-blue)] underline">
            /contact
          </a>
          .
        </p>
      </Section>
    </PageShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold tracking-tight mb-3 text-[var(--color-blue)]">
        {title}
      </h2>
      <div className="text-[var(--color-ink-soft)] leading-relaxed">{children}</div>
    </section>
  );
}
