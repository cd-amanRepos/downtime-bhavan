import { PageShell } from '@/components/PageShell';

export const metadata = { title: 'Methodology · Downtime Bhavan' };

export default function Page() {
  return (
    <PageShell active="methodology">
      <h1 className="text-3xl font-bold tracking-tight mb-2">How we know if a site is down.</h1>
      <p className="text-[var(--color-ink-dim)] mb-10">
        Our methodology, in 4 paragraphs. No black boxes.
      </p>

      <Section title="Where we check from">
        <p>
          All checks run from a single VM in <b>Mumbai</b>. This matters: many Indian government
          websites geofence themselves to Indian IP addresses and silently fail any probe from
          US/EU. Checking from outside India would give us false "down" results for sites that
          actually work fine.
        </p>
      </Section>

      <Section title="Two layers per probe">
        <p>
          Every site goes through two checks:
        </p>
        <ol className="list-decimal pl-6 mt-2 space-y-1.5">
          <li><b>HTTP probe</b> (every 2 minutes): a GET request to the site's root URL with a 10-second timeout. Anything 2xx or 3xx = <em className="text-[var(--color-green)] not-italic font-semibold">up</em>. Anything else = <em className="text-[var(--color-red)] not-italic font-semibold">down</em>.</li>
          <li><b>Headless browser check</b> (coming soon, every 15 min): a real Chromium loads the actual page and asserts that critical elements exist — the login button, the OTP input, etc. If the HTTP probe says up but the headless check finds the page is broken, we mark the site <em className="text-[var(--color-amber)] not-italic font-semibold">degraded</em>.</li>
        </ol>
      </Section>

      <Section title="State transitions, so we don't flap">
        <p>
          A single bad probe doesn't make a site Down. The transitions:
        </p>
        <ul className="list-disc pl-6 mt-2 space-y-1.5">
          <li>Working → Degraded on the first failed check.</li>
          <li>Degraded → <b>Down</b> after 2 consecutive failed checks (~4 minutes of sustained failure).</li>
          <li>Down or Degraded → Working only after 3 consecutive successful checks (~5+ min sustained recovery).</li>
        </ul>
      </Section>

      <Section title="The community vote">
        <p>
          If 20 or more citizens file grievances against the same site within a 10-minute window
          — and our automated checks still say "Working" — we auto-flag the site Degraded
          regardless. The crowd usually knows first.
        </p>
      </Section>

      <Section title="What we don't do">
        <ul className="list-disc pl-6 mt-2 space-y-1.5">
          <li>We don't load-test anyone. One request every 2 minutes per site = ~720 requests/day.</li>
          <li>We don't scrape data. We only measure whether the page loads.</li>
          <li>We don't claim to be official. This is an unofficial observatory built by citizens. Government data publication is the government's job.</li>
        </ul>
      </Section>

      <p className="mt-10 text-sm text-[var(--color-ink-dim)] italic">
        Code is open source under AGPL-3.0. Audit it yourself.
      </p>
    </PageShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold tracking-tight mb-3 text-[var(--color-blue)]">{title}</h2>
      <div className="text-[var(--color-ink-soft)] leading-relaxed">{children}</div>
    </section>
  );
}
