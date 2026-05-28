import { PageShell } from '@/components/PageShell';

export const metadata = { title: 'Privacy · Downtime Bhavan' };

export default function Page() {
  return (
    <PageShell active="status">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Privacy policy.</h1>
      <p className="text-[var(--color-ink-dim)] mb-10">
        Compliant with India's Digital Personal Data Protection Act, 2023 (DPDP). Plain language.
      </p>

      <h2 className="text-xl font-bold mb-3 text-[var(--color-blue)]">What we collect</h2>
      <ul className="list-disc pl-6 mb-6 space-y-2 text-[var(--color-ink-soft)] leading-relaxed">
        <li>
          <b>Your IP address</b> — hashed with a server-side pepper (SHA-256, truncated to 32 chars).
          The original IP is never stored. We use the hash to rate-limit submissions and to count
          unique reactions on grievances.
        </li>
        <li>
          <b>Your WhatsApp number</b> — only if you opt into the Notify-me feature (Plan 6, coming soon).
          Stored as a SHA-256 hash for de-duplication + encrypted (AES-GCM) for actually sending the
          alert. Purged 30 days after your subscription resolves.
        </li>
        <li>
          <b>Grievance text</b> — what you publicly post in the Janta Darbar. This is intentionally public.
        </li>
        <li>
          <b>Anonymous usage data</b> — via Umami (self-hosted, no cookies, no cross-site tracking). Aggregate page-view counts only.
        </li>
      </ul>

      <h2 className="text-xl font-bold mb-3 text-[var(--color-blue)]">What we don't collect</h2>
      <ul className="list-disc pl-6 mb-6 space-y-2 text-[var(--color-ink-soft)] leading-relaxed">
        <li>Names, emails, addresses — none of it is asked for.</li>
        <li>Cookies for tracking — we use no advertising or analytics cookies. Cloudflare Turnstile sets one functional cookie to prevent bot abuse; it does not track you across sites.</li>
        <li>Browser fingerprints, GPS, anything beyond what's listed above.</li>
      </ul>

      <h2 className="text-xl font-bold mb-3 text-[var(--color-blue)]">Your rights</h2>
      <ul className="list-disc pl-6 mb-6 space-y-2 text-[var(--color-ink-soft)] leading-relaxed">
        <li>Delete your alerts: a /delete-my-data page is on the way (Plan 6) — you'll enter your WhatsApp number, verify via OTP, and we purge.</li>
        <li>Request your data: email <a href="mailto:hi@downtimebhavan.in" className="text-[var(--color-blue)] underline">hi@downtimebhavan.in</a>. Since we don't store identifying info beyond the hashes, there's not much to send.</li>
        <li>File a complaint with the Data Protection Board of India if you believe we've violated DPDP.</li>
      </ul>

      <h2 className="text-xl font-bold mb-3 text-[var(--color-blue)]">Retention</h2>
      <ul className="list-disc pl-6 mb-6 space-y-2 text-[var(--color-ink-soft)] leading-relaxed">
        <li>IP hashes: 30 days, then purged.</li>
        <li>Phone numbers: 30 days after subscription resolves (alert fires, you cancel, or you delete).</li>
        <li>Grievance text: retained indefinitely as public content.</li>
        <li>Uptime measurements: retained indefinitely as the public record.</li>
      </ul>

      <p className="mt-10 text-sm text-[var(--color-ink-faint)]">
        Last updated: 28 May 2026. Material changes will be announced via the homepage banner with at least 7 days' notice.
      </p>
    </PageShell>
  );
}
