import { PageShell } from '@/components/PageShell';

export const metadata = { title: 'API · Downtime Bhavan' };

const ENDPOINTS = [
  { method: 'GET',  path: '/api/status',                  desc: 'All tracked sites with current state + 24-hour history' },
  { method: 'GET',  path: '/api/grievance/recent',        desc: 'Last hour of visible citizen grievances' },
  { method: 'GET',  path: '/api/grievance/stream',        desc: 'Server-Sent Events stream of new grievances (live)' },
  { method: 'POST', path: '/api/grievance',               desc: 'Submit a grievance (requires Cloudflare Turnstile token)' },
  { method: 'POST', path: '/api/grievance/[id]/react',    desc: 'Toggle a reaction on a grievance' },
  { method: 'POST', path: '/api/grievance/[id]/report',   desc: 'Report a grievance for moderation' },
];

export default function Page() {
  return (
    <PageShell active="api">
      <h1 className="text-3xl font-bold tracking-tight mb-2">API.</h1>
      <p className="text-[var(--color-ink-dim)] mb-10">
        Read-only endpoints, no auth, no rate limit on reads. Be a good citizen — cache when you can.
      </p>

      <div className="border border-[var(--color-border)] rounded-xl overflow-hidden bg-[var(--color-paper)]">
        {ENDPOINTS.map((e, i) => (
          <div key={i} className={`flex items-center gap-4 px-5 py-3.5 ${i < ENDPOINTS.length - 1 ? 'border-b border-[var(--color-border)]' : ''}`}>
            <span className={`text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded ${
              e.method === 'GET'
                ? 'bg-[var(--color-blue-soft)] text-[var(--color-blue)]'
                : 'bg-[var(--color-saffron-soft)] text-[var(--color-saffron)]'
            }`}>{e.method}</span>
            <code className="font-mono text-sm font-semibold text-[var(--color-ink)]">{e.path}</code>
            <span className="text-sm text-[var(--color-ink-dim)] ml-auto text-right">{e.desc}</span>
          </div>
        ))}
      </div>

      <p className="mt-10 text-sm text-[var(--color-ink-dim)]">
        A versioned JSON API with documented schemas is on the roadmap. For now, treat these as best-effort.
        For automated/heavy use, please email the team via the <a href="/contact" className="text-[var(--color-blue)] underline">contact page</a>.
      </p>
    </PageShell>
  );
}
