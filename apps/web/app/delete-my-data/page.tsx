import { PageShell } from '@/components/PageShell';
import { DeleteFlowTrigger } from '@/components/DeleteFlowTrigger';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata = buildMetadata({
  title: 'Delete my data',
  description: 'Remove your phone number and alert preferences from Downtime Bhavan.',
  path: '/delete-my-data',
  noindex: true,
});

export default function Page() {
  return (
    <PageShell active="status" maxWidth={680}>
      <h1 className="text-3xl font-bold tracking-tight mb-3">Delete my data.</h1>
      <p className="text-[var(--color-ink-dim)] mb-8 leading-relaxed">
        Cancel all your active WhatsApp alerts and purge your phone number from our database.
        We&apos;ll send a one-time code to your WhatsApp number to confirm you own it.
      </p>

      <div className="border border-[var(--color-border)] rounded-2xl p-6 bg-[var(--color-paper)] mb-8">
        <h2 className="text-base font-bold mb-2">What gets deleted</h2>
        <ul className="list-disc pl-6 space-y-1.5 text-sm text-[var(--color-ink-soft)]">
          <li>All your active and pending alert subscriptions</li>
          <li>Your phone-number hash (used for de-duplication)</li>
          <li>Your encrypted phone (used for actually sending the WhatsApp alert)</li>
          <li>Any OTP attempts associated with your number</li>
        </ul>
        <h2 className="text-base font-bold mt-5 mb-2">What stays</h2>
        <ul className="list-disc pl-6 space-y-1.5 text-sm text-[var(--color-ink-soft)]">
          <li>Triggered subscriptions&apos; history (status=triggered, phone purged but row remains as anonymized record)</li>
          <li>Public grievances you&apos;ve filed (those are anonymous — never tied to your phone)</li>
        </ul>
      </div>

      <DeleteFlowTrigger />

      <p className="mt-8 text-xs text-[var(--color-ink-faint)] italic">
        See <a href="/privacy" className="underline">privacy policy</a> for full retention details.
      </p>
    </PageShell>
  );
}
