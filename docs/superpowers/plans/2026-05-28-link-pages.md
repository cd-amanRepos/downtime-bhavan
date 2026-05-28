# Plan 4 — Landing-Page Link Routes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every link on the homepage (header nav, footer, "View all" CTAs, donation buttons) must resolve to a real page. After this plan, no link 404s. The product feels complete even though Notify-me (Plan 6) and Admin (Plan 5) are still ahead.

**Architecture:**
- One shared `<PageShell>` component wraps every sub-route with the same header + tricolor + footer as the homepage. Keeps brand consistency without duplicating markup.
- Dynamic pages (`/departments`, `/sites/[id]`, `/janta-darbar`, `/leaderboard`) are Server Components reading directly from SQLite (same `getDb()` singleton as the homepage). No new API endpoints — they query the DB directly for server-rendered initial state.
- Static pages (`/methodology`, `/api`, `/press`, `/contact`, `/privacy`) are pure JSX. Content stays in the components.
- `/donate` reads UPI ID + GitHub Sponsors handle from env vars; renders a QR via a small client-side QR library (`qrcode` npm package, ~25KB).
- `/delete-my-data` is deferred to Plan 6 because it requires the WhatsApp OTP flow to verify ownership of a phone number — without OTP, there's nothing meaningful to delete.

**Tech Stack:** Same as Plans 1-3. One new dep: `qrcode` (for `/donate` QR rendering).

**Builds on:** `v0.2.0-janta-darbar` (commit `fd68146`).

---

## File structure (additions)

```
downtime-bhavan/
├── apps/web/
│   ├── app/
│   │   ├── departments/page.tsx
│   │   ├── sites/[siteId]/page.tsx
│   │   ├── janta-darbar/page.tsx
│   │   ├── leaderboard/page.tsx
│   │   ├── methodology/page.tsx
│   │   ├── api/page.tsx                    (NOTE: same path as /api/...
│   │   │                                    routes but Next disambiguates;
│   │   │                                    this is the public docs page)
│   │   ├── press/page.tsx
│   │   ├── contact/page.tsx
│   │   ├── privacy/page.tsx
│   │   └── donate/page.tsx
│   ├── components/
│   │   ├── PageShell.tsx                   # header + tricolor + footer wrapper
│   │   ├── PageHeader.tsx                  # NEW reusable extracted from Header
│   │   ├── PageFooter.tsx                  # NEW reusable extracted from footer
│   │   ├── SiteTable.tsx                   # /departments table
│   │   ├── SiteDetailHero.tsx              # /sites/[id] top section
│   │   ├── SiteDetailChart.tsx             # /sites/[id] 7-day chart (just bigger sparkline)
│   │   ├── GrievanceListPage.tsx           # /janta-darbar full feed (filters + pagination)
│   │   ├── GrievanceFilters.tsx            # client-side filters
│   │   ├── LeaderboardRow.tsx              # /leaderboard row
│   │   └── DonateQR.tsx                    # client component, qrcode lib
│   └── lib/
│       └── leaderboard.ts                  # ranking logic (pure)
└── .env.example                            # add DTB_UPI_ID + DTB_GH_SPONSORS
```

**Naming collision note:** Next 15 supports both `app/api/.../route.ts` (existing API routes) and `app/api/page.tsx` (a public docs PAGE for the API). They live at the same URL prefix but `route.ts` handles HTTP methods while `page.tsx` renders UI. Next selects `route.ts` when present at that segment; `app/api/page.tsx` doesn't conflict because it's a directory `api/` containing both. Verify during build.

If this causes an issue, fall back to `/developer` or `/api-docs` as the docs URL. Update nav links accordingly.

---

## Task 1 — Extract shared PageShell + Header + Footer

**Files:**
- Create: `apps/web/components/PageHeader.tsx`, `apps/web/components/PageFooter.tsx`, `apps/web/components/PageShell.tsx`
- Modify: `apps/web/app/page.tsx` (use PageShell), `apps/web/components/Header.tsx` (becomes thin wrapper or gets deprecated)

The current homepage embeds the header markup directly in `Header.tsx` and the footer markup directly in `page.tsx`. We need both reusable across 10 new pages.

- [ ] **Step 1: Extract PageHeader**

Create `apps/web/components/PageHeader.tsx` — port the existing markup from `apps/web/components/Header.tsx` essentially verbatim, but make the active nav item configurable:

```typescript
import { AshokaMark } from './AshokaMark.js';

type NavId = 'status' | 'janta-darbar' | 'leaderboard' | 'methodology' | 'api';

const NAV: Array<{ id: NavId; label: string; href: string }> = [
  { id: 'status',        label: 'Status',        href: '/' },
  { id: 'janta-darbar',  label: 'Janta Darbar',  href: '/janta-darbar' },
  { id: 'leaderboard',   label: 'Leaderboard',   href: '/leaderboard' },
  { id: 'methodology',   label: 'Methodology',   href: '/methodology' },
  { id: 'api',           label: 'API',           href: '/api' },
];

interface Props { active?: NavId; }

export function PageHeader({ active = 'status' }: Props) {
  return (
    <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-6 sticky top-0 z-50 px-7 py-3.5 bg-[var(--color-paper)] border-b border-[var(--color-border)]">
      <a href="/" className="flex items-center gap-3 no-underline text-inherit">
        <div className="w-[38px] h-[38px] rounded-full bg-[var(--color-blue)] flex items-center justify-center text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1),0_1px_2px_rgba(15,31,95,0.18)]">
          <AshokaMark size={28} />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-[17px] font-bold tracking-tight text-[var(--color-ink)]">
            Downtime <span className="text-[var(--color-blue)]">Bhavan</span>
          </span>
          <span className="text-xs font-medium text-[var(--color-ink-dim)] mt-0.5" style={{ fontFamily: 'var(--font-hi)' }}>
            डाउनटाइम भवन · An unofficial observatory
          </span>
        </div>
      </a>

      <nav className="flex gap-0.5 bg-[var(--color-paper-2)] p-1 rounded-full">
        {NAV.map((item) => (
          <a key={item.id} href={item.href}
             className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all ${
               item.id === active
                 ? 'bg-[var(--color-paper)] text-[var(--color-blue)] shadow-[0_1px_2px_rgba(15,31,95,0.06)]'
                 : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'
             }`}>
            {item.label}
          </a>
        ))}
      </nav>

      <div className="flex items-center justify-end gap-3.5">
        <span className="inline-flex items-center gap-2 text-xs font-medium text-[var(--color-ink-dim)]">
          <span className="w-[7px] h-[7px] rounded-full bg-[var(--color-green)] animate-pulse" />
          Live · Mumbai
        </span>
        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border-strong)] text-[12.5px] font-semibold text-[var(--color-ink-soft)] hover:bg-[var(--color-saffron-soft)] hover:border-[var(--color-saffron)] hover:text-[var(--color-saffron)] transition-all">
          <span>🇮🇳</span> Sarkari Mode
        </button>
      </div>
    </header>
  );
}
```

NOTE: I removed the `14:32 IST` literal — that was a static demo value. The live-dot is now the only "live" indicator in the header; real time would need a client component which isn't worth it for the chrome.

- [ ] **Step 2: Extract PageFooter**

Create `apps/web/components/PageFooter.tsx`:

```typescript
export function PageFooter() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-paper)] px-7 py-4 flex justify-between items-center text-[11.5px] text-[var(--color-ink-faint)] font-medium">
      <div>
        <span className="text-[var(--color-saffron)] font-bold tracking-[0.08em] uppercase text-[10.5px]">◆ Unofficial Observatory ◆</span>
        &nbsp;&nbsp;
        <b className="text-[var(--color-ink-soft)] font-bold">Downtime Bhavan</b> · Not affiliated with any government body · Data from Mumbai · Refreshed every 2 min
      </div>
      <div className="flex gap-4.5">
        <a href="/methodology" className="hover:text-[var(--color-blue)]">Methodology</a>
        <a href="/api"         className="hover:text-[var(--color-blue)]">API</a>
        <a href="/press"       className="hover:text-[var(--color-blue)]">Press</a>
        <a href="/contact"     className="hover:text-[var(--color-blue)]">Contact</a>
        <a href="/privacy"     className="hover:text-[var(--color-blue)]">Privacy</a>
        <a href="/donate"      className="hover:text-[var(--color-blue)]">Donate</a>
      </div>
    </footer>
  );
}
```

- [ ] **Step 3: PageShell wrapper**

`apps/web/components/PageShell.tsx`:

```typescript
import type { ReactNode } from 'react';
import { PageHeader } from './PageHeader.js';
import { PageFooter } from './PageFooter.js';
import { Tricolor } from './Tricolor.js';

type NavId = 'status' | 'janta-darbar' | 'leaderboard' | 'methodology' | 'api';

interface Props {
  active?: NavId;
  children: ReactNode;
  /** Max-width container for the content area. Default: 1100px. */
  maxWidth?: number;
}

/** Shared shell for non-homepage routes. Uses the same header + tricolor + footer
 *  as the homepage but with a centered content container. */
export function PageShell({ active, children, maxWidth = 1100 }: Props) {
  return (
    <>
      <PageHeader active={active} />
      <Tricolor />
      <main className="bg-[var(--color-bg)] min-h-[calc(100vh-160px)]">
        <div className="mx-auto px-7 py-12" style={{ maxWidth }}>
          {children}
        </div>
      </main>
      <PageFooter />
    </>
  );
}
```

- [ ] **Step 4: Refactor homepage to use the extracted Header + Footer**

Replace `apps/web/app/page.tsx`:

```typescript
import { PageHeader } from '@/components/PageHeader';
import { PageFooter } from '@/components/PageFooter';
import { Tricolor } from '@/components/Tricolor';
import { DepartmentStatusPanel } from '@/components/DepartmentStatusPanel';
import { NotifyHero } from '@/components/NotifyHero';
import { JantaDarbarPanel } from '@/components/JantaDarbarPanel';

export const dynamic = 'force-dynamic';

export default async function Page() {
  return (
    <>
      <PageHeader active="status" />
      <Tricolor />
      <main className="layout min-h-[calc(100vh-80px)]">
        <DepartmentStatusPanel />
        <NotifyHero />
        <JantaDarbarPanel />
      </main>
      <PageFooter />
    </>
  );
}
```

The legacy `Header.tsx` becomes unused after this — leave it for now (deletion in a later cleanup task). Its test (`Header.test.tsx`) still passes because the component file is intact.

- [ ] **Step 5: Build verify + commit**

```bash
npm run -w @dtb/web build
```

Expected: `Compiled successfully`. Homepage routes table unchanged.

```bash
git add apps/web/components/PageHeader.tsx apps/web/components/PageFooter.tsx apps/web/components/PageShell.tsx apps/web/app/page.tsx
git commit -m "$(cat <<'EOF'
refactor(web): extract PageHeader + PageFooter + PageShell

Homepage chrome was inlined; lifted into reusable components so the 10
new routes in Plan 4 can share the same header + tricolor + footer.
Header nav is now active-aware (highlights the current section).
Legacy Header.tsx stays for now (its test still passes), to be deleted
in a follow-up cleanup task.
EOF
)"
```

---

## Task 2 — Static content pages (5 routes)

**Files:**
- Create: `apps/web/app/methodology/page.tsx`, `apps/web/app/api/page.tsx`, `apps/web/app/press/page.tsx`, `apps/web/app/contact/page.tsx`, `apps/web/app/privacy/page.tsx`

These are pure-JSX content pages. No DB, no client state. One task because they share structure.

- [ ] **Step 1: Methodology**

`apps/web/app/methodology/page.tsx`:

```typescript
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
```

- [ ] **Step 2: API**

`apps/web/app/api/page.tsx`:

```typescript
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
```

- [ ] **Step 3: Press**

`apps/web/app/press/page.tsx`:

```typescript
import { PageShell } from '@/components/PageShell';

export const metadata = { title: 'Press · Downtime Bhavan' };

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
```

- [ ] **Step 4: Contact**

`apps/web/app/contact/page.tsx`:

```typescript
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
```

- [ ] **Step 5: Privacy**

`apps/web/app/privacy/page.tsx`:

```typescript
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
```

- [ ] **Step 6: Build verify**

```bash
npm run -w @dtb/web build
```

Expected: `Compiled successfully`. New static routes appear: `/methodology`, `/api` (the page, separate from the API route), `/press`, `/contact`, `/privacy`.

**Verify the /api page vs the API routes coexist.** The build output should show:
- `○ /api`  — static page
- `ƒ /api/grievance`, `ƒ /api/status`, etc. — dynamic routes

If Next conflicts these (compile error about ambiguous routing), rename the docs page to `/api-docs/page.tsx` and update the `PageHeader` NAV entry to `/api-docs`.

- [ ] **Step 7: Commit**

```bash
git add apps/web/app/methodology apps/web/app/api/page.tsx apps/web/app/press apps/web/app/contact apps/web/app/privacy
git commit -m "$(cat <<'EOF'
feat(web): 5 static content pages

/methodology — how detection works in plain language
/api — current read-only endpoint reference
/press — for journalists; CC-BY data, AGPL code, contact emails
/contact — three role-based email addresses (general, press, security)
/privacy — DPDP-compliant policy in plain language
EOF
)"
```

---

## Task 3 — /donate with UPI QR

**Files:**
- Modify: `apps/web/package.json` (add `qrcode` dep)
- Create: `apps/web/components/DonateQR.tsx`, `apps/web/app/donate/page.tsx`
- Modify: `.env.example` (add DTB_UPI_ID, DTB_GH_SPONSORS)

- [ ] **Step 1: Add qrcode dep**

From repo root:

```bash
npm install -w @dtb/web qrcode @types/qrcode
```

Verify in `apps/web/package.json` dependencies:
- `"qrcode": "^1.5.0"`
- And in devDependencies: `"@types/qrcode": "^1.5.0"`

- [ ] **Step 2: Update .env.example**

Append to the existing `.env.example`:

```bash

# === Donations (Plan 4) ===
# Your UPI ID. Will be shown on /donate as a copy-button + rendered into a QR code.
# Example: downtimebhavan@oksbi
DTB_UPI_ID=downtimebhavan@oksbi

# Optional: GitHub Sponsors handle (for international donors).
DTB_GH_SPONSORS=yourhandle
```

- [ ] **Step 3: DonateQR client component**

`apps/web/components/DonateQR.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface Props {
  upiId: string;
  amountInr?: number;  // optional pre-filled amount (V1 leaves it blank for user choice)
}

/** Renders a UPI deep-link QR code client-side. Reading the QR with any UPI
 *  app (GPay, PhonePe, Paytm, BHIM) opens the payment flow pre-filled with
 *  the recipient UPI ID. */
export function DonateQR({ upiId, amountInr }: Props) {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent('Downtime Bhavan')}&cu=INR${amountInr ? `&am=${amountInr}` : ''}`;

  useEffect(() => {
    QRCode.toDataURL(upiLink, {
      width: 280,
      margin: 1,
      color: { dark: '#0E1B2D', light: '#FFFFFF' },
    }).then(setDataUrl).catch(console.error);
  }, [upiLink]);

  async function copyUpi() {
    try {
      await navigator.clipboard.writeText(upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked */ }
  }

  return (
    <div className="bg-[var(--color-paper)] border border-[var(--color-border)] rounded-2xl p-6 max-w-[420px] mx-auto text-center">
      <div className="flex justify-center mb-4">
        {dataUrl
          ? <img src={dataUrl} alt="UPI QR code" className="rounded-lg" />
          : <div className="w-[280px] h-[280px] bg-[var(--color-paper-2)] rounded-lg" />
        }
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--color-ink-faint)] mb-1">UPI ID</p>
      <p className="text-base font-mono font-semibold text-[var(--color-ink)] mb-3">{upiId}</p>
      <button onClick={copyUpi}
              className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg border border-[var(--color-border-strong)] text-[var(--color-ink-soft)] hover:border-[var(--color-blue)] hover:text-[var(--color-blue)] transition-all">
        {copied ? '✓ Copied' : 'Copy UPI ID'}
      </button>
    </div>
  );
}
```

- [ ] **Step 4: /donate page**

`apps/web/app/donate/page.tsx`:

```typescript
import { PageShell } from '@/components/PageShell';
import { DonateQR } from '@/components/DonateQR';

export const metadata = { title: 'Donate · Downtime Bhavan' };

export default function Page() {
  const upiId = process.env.DTB_UPI_ID ?? 'downtimebhavan@oksbi';
  const ghSponsors = process.env.DTB_GH_SPONSORS;

  return (
    <PageShell active="status" maxWidth={760}>
      <div className="text-center mb-10">
        <span className="inline-flex items-center gap-2 text-[10.5px] font-semibold text-[var(--color-saffron)] tracking-[0.18em] uppercase mb-3">
          <span>☕</span>
          <span>Office of the Chai Fund</span>
        </span>
        <h1 className="text-4xl font-bold tracking-tight">
          If you liked the work,<br/>
          <em className="text-[var(--color-blue)] font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>fund the continuation.</em>
        </h1>
        <p className="text-base text-[var(--color-ink-dim)] mt-4 max-w-[520px] mx-auto leading-relaxed">
          This office runs on chai and citizen donations. Every ₹ pays the WhatsApp send cost
          for the next batch of alerts and keeps the site free, ad-free, and open source.
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

      <div className="bg-[var(--color-paper)] border border-[var(--color-border)] rounded-2xl p-6">
        <h2 className="text-base font-bold mb-3 text-[var(--color-blue)]">Transparency</h2>
        <ul className="space-y-2 text-sm text-[var(--color-ink-soft)]">
          <li>• <b>This month:</b> ₹0 raised, ₹0 spent</li>
          <li>• <b>WhatsApp messages:</b> 0 / 1,000 free (free tier resets monthly)</li>
          <li>• <b>Monthly recurring cost:</b> ~₹400 (Fly.io VM) + ~₹70 (domain prorated)</li>
          <li>• <b>Donations track:</b> manual reconciliation. Public donor wall coming if anyone gives big.</li>
        </ul>
        <p className="mt-4 text-xs text-[var(--color-ink-faint)] italic">
          We don't take donations through any intermediary (no Razorpay, no Patreon).
          Direct UPI = 0% fees. 100% reaches the project.
        </p>
      </div>

      <p className="mt-8 text-center text-xs text-[var(--color-ink-faint)]">
        Citizens-funded · zero ads · AGPL-3.0
      </p>
    </PageShell>
  );
}
```

- [ ] **Step 5: Build + commit**

```bash
npm run -w @dtb/web build
```

Expected: `Compiled successfully`. New route `/donate` appears.

```bash
git add apps/web/components/DonateQR.tsx apps/web/app/donate apps/web/package.json package.json package-lock.json .env.example
git commit -m "$(cat <<'EOF'
feat(web): /donate page with UPI QR + transparency block

UPI ID read from DTB_UPI_ID env. QR rendered client-side via qrcode npm
package (~25KB). UPI deep-link opens any UPI app pre-filled with recipient
and "Downtime Bhavan" payee name. Optional GitHub Sponsors fallback for
international donors via DTB_GH_SPONSORS env. Transparency block lists
monthly cost + WhatsApp message budget.
EOF
)"
```

---

## Task 4 — /departments table view

**Files:**
- Create: `apps/web/components/SiteTable.tsx`, `apps/web/app/departments/page.tsx`

The homepage left panel shows only the top 6 sites. `/departments` is the full table with all 12, plus sort/filter controls.

- [ ] **Step 1: SiteTable component (server-rendered)**

`apps/web/components/SiteTable.tsx`:

```typescript
import { eq, desc } from 'drizzle-orm';
import { schema } from '@dtb/db';
import { getDb } from '@/lib/db';
import { buildLast24h } from '@/lib/status-derive';
import { Sparkline } from './Sparkline.js';
import type { SiteStatusSnapshot } from '@dtb/shared';

const STATE_LABEL: Record<SiteStatusSnapshot['currentState'], string> = {
  working: 'Working', degraded: 'Degraded', down: 'Down',
};
const STATE_COLOR: Record<SiteStatusSnapshot['currentState'], string> = {
  working: 'var(--color-green)', degraded: 'var(--color-amber)', down: 'var(--color-red)',
};
const STATE_SOFT: Record<SiteStatusSnapshot['currentState'], string> = {
  working: 'var(--color-green-soft)', degraded: 'var(--color-amber-soft)', down: 'var(--color-red-soft)',
};

const STATE_RANK: Record<SiteStatusSnapshot['currentState'], number> = {
  down: 0, degraded: 1, working: 2,
};

export async function SiteTable() {
  const db = getDb();
  const now = Date.now();
  const sites = db.select().from(schema.sites).where(eq(schema.sites.enabled, true)).all();

  const snapshots: SiteStatusSnapshot[] = sites.map((site) => {
    const status = db.select().from(schema.siteStatus).where(eq(schema.siteStatus.siteId, site.id)).get();
    const checks = db.select().from(schema.checks)
      .where(eq(schema.checks.siteId, site.id))
      .orderBy(desc(schema.checks.checkedAt))
      .all()
      .filter((r) => r.checkedAt >= now - 24 * 60 * 60 * 1000);
    return {
      siteId: site.id,
      name: site.name,
      url: site.url,
      currentState: status?.currentState ?? 'working',
      stateSince: status?.stateSince ?? now,
      uptime30dPct: status?.uptime30dPct ?? null,
      lastCheckAt: status?.lastCheckAt ?? now,
      communityFlag: status?.communityFlag ?? false,
      last24h: buildLast24h(checks.map((r) => ({ checkedAt: r.checkedAt, result: r.result })), now),
    };
  });

  // Worst-first sort (most broken at the top is the most useful default)
  snapshots.sort((a, b) => {
    const r = STATE_RANK[a.currentState] - STATE_RANK[b.currentState];
    if (r !== 0) return r;
    return (a.uptime30dPct ?? 100) - (b.uptime30dPct ?? 100);
  });

  return (
    <div className="border border-[var(--color-border)] rounded-2xl overflow-hidden bg-[var(--color-paper)]">
      <table className="w-full">
        <thead className="bg-[var(--color-paper-2)] border-b border-[var(--color-border)]">
          <tr className="text-left text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-faint)]">
            <th className="px-5 py-3 w-[60px]">#</th>
            <th className="px-3 py-3">Department</th>
            <th className="px-3 py-3 w-[160px]">24-hour history</th>
            <th className="px-3 py-3 w-[100px] text-right">30d uptime</th>
            <th className="px-3 py-3 w-[120px]">Status</th>
          </tr>
        </thead>
        <tbody>
          {snapshots.map((s, i) => (
            <tr key={s.siteId} className="border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-paper-2)]">
              <td className="px-5 py-4 text-[12px] font-mono font-semibold text-[var(--color-ink-faint)]">{String(i+1).padStart(2,'0')}</td>
              <td className="px-3 py-4">
                <a href={`/sites/${s.siteId}`} className="block">
                  <div className="font-semibold text-[var(--color-ink)] tracking-tight">{s.name}</div>
                  <div className="text-[11.5px] text-[var(--color-ink-faint)] mt-0.5 font-medium">{s.url.replace(/^https?:\/\//, '')}</div>
                </a>
              </td>
              <td className="px-3 py-4">
                <Sparkline buckets={s.last24h} />
              </td>
              <td className="px-3 py-4 text-right">
                <span className="text-lg font-bold tabular-nums" style={{ color: STATE_COLOR[s.currentState] }}>
                  {s.uptime30dPct === null ? '—' : Math.round(s.uptime30dPct)}
                  <sup className="text-xs ml-px text-[var(--color-ink-faint)]">%</sup>
                </span>
              </td>
              <td className="px-3 py-4">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.1em]"
                      style={{ color: STATE_COLOR[s.currentState] }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: STATE_COLOR[s.currentState], boxShadow: `0 0 0 3px ${STATE_SOFT[s.currentState]}` }} />
                  {STATE_LABEL[s.currentState]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

NOTE: V1 ships server-rendered sort only (worst-first default). Interactive client-side filters can come in a follow-up — they need a client wrapper around the table.

- [ ] **Step 2: /departments page**

`apps/web/app/departments/page.tsx`:

```typescript
import { PageShell } from '@/components/PageShell';
import { SiteTable } from '@/components/SiteTable';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Departments · Downtime Bhavan' };

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
```

- [ ] **Step 3: Build verify + commit**

```bash
npm run -w @dtb/web build
```

```bash
git add apps/web/components/SiteTable.tsx apps/web/app/departments
git commit -m "$(cat <<'EOF'
feat(web): /departments table view

Server-rendered table of every enabled site with status dot, sparkline,
30d uptime %, and link to per-site detail. Sorted worst-first by default
(state rank then uptime ascending). V1 ships without client-side filter
controls; a worst-first table is the most useful single view.
EOF
)"
```

---

## Task 5 — /sites/[siteId] detail page

**Files:**
- Create: `apps/web/components/SiteDetailHero.tsx`, `apps/web/components/SiteDetailHistory.tsx`, `apps/web/app/sites/[siteId]/page.tsx`

- [ ] **Step 1: SiteDetailHero**

`apps/web/components/SiteDetailHero.tsx`:

```typescript
import type { SiteStatusSnapshot } from '@dtb/shared';

const STATE_COLOR: Record<SiteStatusSnapshot['currentState'], string> = {
  working: 'var(--color-green)', degraded: 'var(--color-amber)', down: 'var(--color-red)',
};
const STATE_LABEL: Record<SiteStatusSnapshot['currentState'], string> = {
  working: 'Working', degraded: 'Degraded', down: 'Down',
};

function duration(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ${m % 60}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

interface Props { snapshot: SiteStatusSnapshot; }

export function SiteDetailHero({ snapshot: s }: Props) {
  const now = Date.now();
  const color = STATE_COLOR[s.currentState];
  return (
    <div className="border border-[var(--color-border)] rounded-2xl p-8 bg-[var(--color-paper)] mb-8">
      <div className="flex items-baseline justify-between gap-6 mb-4">
        <div>
          <span className="block text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-faint)] mb-1">
            <a href="/departments" className="hover:text-[var(--color-blue)]">← All departments</a>
          </span>
          <h1 className="text-3xl font-bold tracking-tight">{s.name}</h1>
          <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-block text-sm text-[var(--color-blue)] underline mt-1.5">
            {s.url} ↗
          </a>
        </div>
        <div className="text-right">
          <span className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.1em]" style={{ color }}>
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: color, boxShadow: `0 0 0 4px ${color}33` }} />
            {STATE_LABEL[s.currentState]}
          </span>
          <p className="text-[11.5px] text-[var(--color-ink-faint)] mt-1 font-medium">for {duration(now - s.stateSince)}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mt-6 pt-6 border-t border-[var(--color-border)]">
        <Stat label="30-day uptime" value={s.uptime30dPct === null ? '—' : `${Math.round(s.uptime30dPct)}%`} color={color} />
        <Stat label="Last check" value={`${duration(now - s.lastCheckAt)} ago`} color="var(--color-ink)" />
        <Stat label="Community flag" value={s.communityFlag ? 'YES (≥20 reports/10m)' : '—'} color={s.communityFlag ? 'var(--color-amber)' : 'var(--color-ink-faint)'} />
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.15em] text-[var(--color-ink-faint)] mb-1">{label}</p>
      <p className="text-2xl font-bold tabular-nums tracking-tight" style={{ color }}>{value}</p>
    </div>
  );
}
```

- [ ] **Step 2: SiteDetailHistory (7-day mini calendar)**

`apps/web/components/SiteDetailHistory.tsx`:

```typescript
import { buildLast24h } from '@/lib/status-derive';
import { Sparkline } from './Sparkline.js';

interface Props {
  checks: { checkedAt: number; result: 'up'|'degraded'|'down' }[];
}

/** Render 7 daily rows, each one a 24-bar sparkline. Day 0 = today, day 6 = a week ago. */
export function SiteDetailHistory({ checks }: Props) {
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const rows = [];
  for (let d = 0; d < 7; d++) {
    const dayEnd = now - d * DAY;
    const dayStart = dayEnd - DAY;
    const dayChecks = checks.filter((c) => c.checkedAt >= dayStart && c.checkedAt < dayEnd);
    const buckets = buildLast24h(dayChecks, dayEnd);
    rows.push({
      label: d === 0 ? 'Today' : d === 1 ? 'Yesterday' : new Date(dayEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      buckets,
    });
  }

  return (
    <div className="border border-[var(--color-border)] rounded-2xl p-6 bg-[var(--color-paper)] mb-8">
      <h2 className="text-base font-bold tracking-tight mb-4">Past 7 days</h2>
      <div className="space-y-3">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-5">
            <span className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-[var(--color-ink-faint)] w-20 shrink-0">{r.label}</span>
            <div className="flex-1">
              <Sparkline buckets={r.buckets} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Page route**

`apps/web/app/sites/[siteId]/page.tsx`:

```typescript
import { notFound } from 'next/navigation';
import { eq, desc, gte, and } from 'drizzle-orm';
import { PageShell } from '@/components/PageShell';
import { SiteDetailHero } from '@/components/SiteDetailHero';
import { SiteDetailHistory } from '@/components/SiteDetailHistory';
import { schema } from '@dtb/db';
import { getDb } from '@/lib/db';
import { buildLast24h } from '@/lib/status-derive';
import { GrievancePost } from '@/components/GrievancePost';
import type { SiteStatusSnapshot } from '@dtb/shared';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  return { title: `${siteId} · Downtime Bhavan` };
}

export default async function Page({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const db = getDb();
  const site = db.select().from(schema.sites).where(eq(schema.sites.id, siteId)).get();
  if (!site || !site.enabled) notFound();

  const now = Date.now();
  const status = db.select().from(schema.siteStatus).where(eq(schema.siteStatus.siteId, site.id)).get();

  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const checks = db.select().from(schema.checks)
    .where(and(eq(schema.checks.siteId, site.id), gte(schema.checks.checkedAt, sevenDaysAgo)))
    .all()
    .map((r) => ({ checkedAt: r.checkedAt, result: r.result }));

  const last24h = buildLast24h(checks.filter((c) => c.checkedAt >= now - 24 * 60 * 60 * 1000), now);

  const snapshot: SiteStatusSnapshot = {
    siteId: site.id, name: site.name, url: site.url,
    currentState: status?.currentState ?? 'working',
    stateSince: status?.stateSince ?? now,
    uptime30dPct: status?.uptime30dPct ?? null,
    lastCheckAt: status?.lastCheckAt ?? now,
    communityFlag: status?.communityFlag ?? false,
    last24h,
  };

  // recent grievances for this site
  const grievances = db.select().from(schema.grievances)
    .where(and(
      eq(schema.grievances.siteId, site.id),
      eq(schema.grievances.visible, true),
    ))
    .orderBy(desc(schema.grievances.createdAt))
    .limit(8)
    .all();
  const reactionRows = db.select().from(schema.reactions).all();
  const reactionCounts: Record<number, Record<string, number>> = {};
  for (const r of reactionRows) {
    const m = reactionCounts[r.grievanceId] ?? (reactionCounts[r.grievanceId] = {});
    m[r.kind] = (m[r.kind] ?? 0) + 1;
  }

  return (
    <PageShell active="status">
      <SiteDetailHero snapshot={snapshot} />
      <SiteDetailHistory checks={checks} />

      <section className="mb-8">
        <h2 className="text-base font-bold tracking-tight mb-4">
          Recent citizen grievances
          <span className="text-[var(--color-ink-faint)] font-medium ml-2">{grievances.length}</span>
        </h2>
        <div className="border border-[var(--color-border)] rounded-2xl overflow-hidden bg-[var(--color-paper)]">
          {grievances.length === 0
            ? <div className="px-7 py-8 text-center text-sm text-[var(--color-ink-dim)]">No active grievances against {site.name}.</div>
            : grievances.map((g) => (
                <GrievancePost key={g.id} grievance={{
                  id: g.id,
                  siteName: site.name,
                  siteState: snapshot.currentState,
                  tag: g.tag,
                  body: g.body,
                  createdAt: g.createdAt,
                  reactions: reactionCounts[g.id] ?? {},
                }} />
              ))
          }
        </div>
      </section>
    </PageShell>
  );
}
```

- [ ] **Step 4: Build + commit**

```bash
npm run -w @dtb/web build
```

```bash
git add apps/web/components/SiteDetailHero.tsx apps/web/components/SiteDetailHistory.tsx apps/web/app/sites
git commit -m "$(cat <<'EOF'
feat(web): /sites/[siteId] detail page

Hero block with current state + duration in state + 30d uptime + last
check + community flag. 7-day history shown as 7 stacked daily sparklines.
Recent grievances for that site embedded at the bottom. 404 on unknown
siteId or disabled site.
EOF
)"
```

---

## Task 6 — /janta-darbar full feed page

**Files:**
- Create: `apps/web/components/GrievanceListPage.tsx`, `apps/web/app/janta-darbar/page.tsx`

This is the "View all grievances →" destination from the homepage. Same submission form, same SSE updates, but no 3-col layout and bigger feed.

- [ ] **Step 1: GrievanceListPage component**

`apps/web/components/GrievanceListPage.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { GrievancePost } from './GrievancePost.js';
import { GrievanceForm } from './GrievanceForm.js';

interface SiteLookup { id: string; name: string; state?: 'working'|'degraded'|'down'; }
interface Grievance {
  id: number; siteId: string; tag: string; body: string; createdAt: number;
  reactions: Partial<Record<'angry'|'sad'|'laugh'|'same', number>>;
}

interface Props {
  initial: Grievance[];
  sites: SiteLookup[];
}

type SortMode = 'recent' | 'top';

export function GrievanceListPage({ initial, sites }: Props) {
  const [grievances, setGrievances] = useState<Grievance[]>(initial);
  const [siteFilter, setSiteFilter] = useState<string>('');
  const [sort, setSort] = useState<SortMode>('recent');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const es = new EventSource('/api/grievance/stream');
    es.addEventListener('grievance:new', (evt) => {
      const g = JSON.parse((evt as MessageEvent).data) as Omit<Grievance, 'reactions'>;
      setGrievances((prev) => [{ ...g, reactions: {} }, ...prev]);
    });
    es.addEventListener('grievance:hide', (evt) => {
      const { grievanceId } = JSON.parse((evt as MessageEvent).data) as { grievanceId: number };
      setGrievances((prev) => prev.filter((g) => g.id !== grievanceId));
    });
    return () => es.close();
  }, []);

  const siteMap = new Map(sites.map((s) => [s.id, s] as const));

  let filtered = siteFilter ? grievances.filter((g) => g.siteId === siteFilter) : grievances;
  if (sort === 'top') {
    filtered = [...filtered].sort((a, b) => {
      const sumA = Object.values(a.reactions).reduce((x, y) => x + (y ?? 0), 0);
      const sumB = Object.values(b.reactions).reduce((x, y) => x + (y ?? 0), 0);
      return sumB - sumA;
    });
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap gap-3 justify-between items-center">
        <div className="flex gap-3 items-center">
          <select value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)}
                  className="border border-[var(--color-border-strong)] rounded-lg px-3 py-2 text-sm font-medium bg-[var(--color-paper)]">
            <option value="">All departments ({grievances.length})</option>
            {sites.map((s) => {
              const n = grievances.filter((g) => g.siteId === s.id).length;
              return <option key={s.id} value={s.id}>{s.name} ({n})</option>;
            })}
          </select>
          <div className="flex gap-1 bg-[var(--color-paper-2)] p-1 rounded-lg">
            <button onClick={() => setSort('recent')}
                    className={`px-3 py-1 rounded text-xs font-semibold transition-all ${sort === 'recent' ? 'bg-[var(--color-paper)] text-[var(--color-blue)] shadow' : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'}`}>
              Recent
            </button>
            <button onClick={() => setSort('top')}
                    className={`px-3 py-1 rounded text-xs font-semibold transition-all ${sort === 'top' ? 'bg-[var(--color-paper)] text-[var(--color-blue)] shadow' : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'}`}>
              Most reactions
            </button>
          </div>
        </div>
        <button onClick={() => setShowForm(true)}
                className="bg-[var(--color-blue)] text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-[var(--color-blue-deep)]">
          + File a grievance
        </button>
      </div>

      <div className="border border-[var(--color-border)] rounded-2xl overflow-hidden bg-[var(--color-paper)]">
        {filtered.length === 0
          ? <div className="px-7 py-16 text-center text-sm text-[var(--color-ink-dim)]">No grievances match.</div>
          : filtered.map((g) => {
              const site = siteMap.get(g.siteId);
              return (
                <GrievancePost key={g.id} grievance={{
                  id: g.id,
                  siteName: site?.name ?? g.siteId,
                  siteState: site?.state,
                  tag: g.tag,
                  body: g.body,
                  createdAt: g.createdAt,
                  reactions: g.reactions,
                }} />
              );
            })
        }
      </div>

      {showForm && (
        <GrievanceForm sites={sites} onClose={() => setShowForm(false)} onSubmitted={() => { /* SSE pushes it */ }} />
      )}
    </>
  );
}
```

- [ ] **Step 2: Page route**

`apps/web/app/janta-darbar/page.tsx`:

```typescript
import { PageShell } from '@/components/PageShell';
import { GrievanceListPage } from '@/components/GrievanceListPage';
import { eq, desc, and, gte } from 'drizzle-orm';
import { schema } from '@dtb/db';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Janta Darbar · Downtime Bhavan' };

export default async function Page() {
  const db = getDb();
  const sites = db.select().from(schema.sites).where(eq(schema.sites.enabled, true)).all();
  const since = Date.now() - 24 * 60 * 60 * 1000; // last 24h instead of 60min on the homepage

  const recent = db.select().from(schema.grievances)
    .where(and(eq(schema.grievances.visible, true), gte(schema.grievances.createdAt, since)))
    .orderBy(desc(schema.grievances.createdAt))
    .limit(200)
    .all();

  const reactionRows = db.select().from(schema.reactions).all();
  const counts: Record<number, Record<string, number>> = {};
  for (const r of reactionRows) {
    const m = counts[r.grievanceId] ?? (counts[r.grievanceId] = {});
    m[r.kind] = (m[r.kind] ?? 0) + 1;
  }
  const statuses = db.select().from(schema.siteStatus).all();
  const stateById = new Map(statuses.map((s) => [s.siteId, s.currentState] as const));

  const initial = recent.map((g) => ({
    id: g.id, siteId: g.siteId, tag: g.tag, body: g.body, createdAt: g.createdAt,
    reactions: counts[g.id] ?? {},
  }));
  const siteLookup = sites.map((s) => ({ id: s.id, name: s.name, state: stateById.get(s.id) }));

  return (
    <PageShell active="janta-darbar">
      <div className="mb-8">
        <span className="block text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-faint)] mb-1">
          {initial.length} grievances · Last 24 hours
        </span>
        <h1 className="text-3xl font-bold tracking-tight flex items-baseline gap-3">
          Janta Darbar
          <span className="text-xl text-[var(--color-blue)] font-medium" style={{ fontFamily: 'var(--font-hi)' }}>जनता दरबार</span>
        </h1>
        <p className="text-[var(--color-ink-dim)] mt-2 max-w-[640px]">
          The people's court of broken portals. Filter by department, sort by recency or
          most-reacted, file your own.
        </p>
      </div>

      <GrievanceListPage initial={initial} sites={siteLookup} />
    </PageShell>
  );
}
```

- [ ] **Step 3: Build + commit**

```bash
npm run -w @dtb/web build
```

```bash
git add apps/web/components/GrievanceListPage.tsx apps/web/app/janta-darbar
git commit -m "$(cat <<'EOF'
feat(web): /janta-darbar full grievance feed page

Server-rendered with last 24h of grievances (200 cap). Client component
adds site-filter dropdown + sort toggle (recent / most reactions) + SSE
subscription for live updates + submission form modal. Replaces the
homepage right panel's 'View all grievances →' 404 target.
EOF
)"
```

---

## Task 7 — /leaderboard page

**Files:**
- Create: `apps/web/lib/leaderboard.ts`, `apps/web/lib/leaderboard.test.ts`, `apps/web/app/leaderboard/page.tsx`

The peak satirical page. "Worst Performing Sites" with fake award trophies.

- [ ] **Step 1: TDD — failing test for ranking**

`apps/web/lib/leaderboard.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { rankSites, type LeaderboardInput } from './leaderboard.js';

describe('rankSites', () => {
  it('ranks worst uptime first', () => {
    const input: LeaderboardInput[] = [
      { siteId: 'a', name: 'A', uptime30dPct: 92, totalReports: 0, longestOutageMs: 0 },
      { siteId: 'b', name: 'B', uptime30dPct: 31, totalReports: 0, longestOutageMs: 0 },
      { siteId: 'c', name: 'C', uptime30dPct: 67, totalReports: 0, longestOutageMs: 0 },
    ];
    const ranked = rankSites(input);
    expect(ranked.map((r) => r.siteId)).toEqual(['b', 'c', 'a']);
  });

  it('handles null uptime by sorting it last', () => {
    const input: LeaderboardInput[] = [
      { siteId: 'a', name: 'A', uptime30dPct: 31, totalReports: 0, longestOutageMs: 0 },
      { siteId: 'b', name: 'B', uptime30dPct: null, totalReports: 0, longestOutageMs: 0 },
    ];
    const ranked = rankSites(input);
    expect(ranked[0]!.siteId).toBe('a');
    expect(ranked[1]!.siteId).toBe('b');
  });

  it('awards trophies', () => {
    const input: LeaderboardInput[] = [
      { siteId: 'worst', name: 'Worst', uptime30dPct: 12, totalReports: 100, longestOutageMs: 50 * 60 * 60 * 1000 },
      { siteId: 'most-reports', name: 'MR', uptime30dPct: 60, totalReports: 500, longestOutageMs: 1000 },
      { siteId: 'longest-outage', name: 'LO', uptime30dPct: 70, totalReports: 10, longestOutageMs: 100 * 60 * 60 * 1000 },
    ];
    const ranked = rankSites(input);
    expect(ranked.find((r) => r.siteId === 'worst')?.trophy).toMatch(/Worst Overall/i);
    expect(ranked.find((r) => r.siteId === 'most-reports')?.trophy).toMatch(/Most Reports/i);
    expect(ranked.find((r) => r.siteId === 'longest-outage')?.trophy).toMatch(/Longest Outage/i);
  });
});
```

- [ ] **Step 2: Run, watch fail**

```bash
npm -w @dtb/web test
```

Expected: 3 leaderboard tests fail.

- [ ] **Step 3: Implement**

`apps/web/lib/leaderboard.ts`:

```typescript
export interface LeaderboardInput {
  siteId: string;
  name: string;
  uptime30dPct: number | null;
  totalReports: number;
  longestOutageMs: number;
}

export interface RankedSite extends LeaderboardInput {
  rank: number;
  trophy?: string;
}

/** Rank sites worst-uptime first. Award one trophy each for:
 *   - Worst Overall (lowest uptime %)
 *   - Most Reports
 *   - Longest Single Outage
 *  A site can win at most one trophy (priority: Worst > Reports > Outage). */
export function rankSites(input: LeaderboardInput[]): RankedSite[] {
  const sorted = [...input].sort((a, b) => {
    if (a.uptime30dPct === null && b.uptime30dPct === null) return 0;
    if (a.uptime30dPct === null) return 1;
    if (b.uptime30dPct === null) return -1;
    return a.uptime30dPct - b.uptime30dPct;
  });

  const ranked: RankedSite[] = sorted.map((s, i) => ({ ...s, rank: i + 1 }));

  if (ranked.length === 0) return ranked;

  // Worst overall: index 0 of the sorted (lowest uptime)
  ranked[0]!.trophy = '🥇 Worst Overall';

  // Most reports: among the rest
  const mostReports = ranked.slice(1).reduce<RankedSite | null>(
    (best, r) => (best === null || r.totalReports > best.totalReports) ? r : best, null);
  if (mostReports && mostReports.totalReports > 0 && !mostReports.trophy) {
    mostReports.trophy = '🥈 Most Reports';
  }

  // Longest outage: among the rest with no trophy yet
  const longestOutage = ranked.reduce<RankedSite | null>(
    (best, r) => {
      if (r.trophy) return best;
      return (best === null || r.longestOutageMs > best.longestOutageMs) ? r : best;
    }, null);
  if (longestOutage && longestOutage.longestOutageMs > 0) {
    longestOutage.trophy = '🥉 Longest Outage';
  }

  return ranked;
}
```

- [ ] **Step 4: Tests pass**

```bash
npm -w @dtb/web test
```

Expected: 3 leaderboard tests pass.

- [ ] **Step 5: Page route**

`apps/web/app/leaderboard/page.tsx`:

```typescript
import { PageShell } from '@/components/PageShell';
import { eq, count } from 'drizzle-orm';
import { schema } from '@dtb/db';
import { getDb } from '@/lib/db';
import { rankSites, type LeaderboardInput } from '@/lib/leaderboard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Leaderboard · Downtime Bhavan' };

function fmtHours(ms: number): string {
  const h = Math.floor(ms / (60 * 60 * 1000));
  const m = Math.floor((ms / 60_000)) % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export default async function Page() {
  const db = getDb();
  const sites = db.select().from(schema.sites).where(eq(schema.sites.enabled, true)).all();
  const statuses = db.select().from(schema.siteStatus).all();
  const statusBySite = new Map(statuses.map((s) => [s.siteId, s] as const));

  const inputs: LeaderboardInput[] = sites.map((site) => {
    const status = statusBySite.get(site.id);
    const reports = db.select({ n: count() }).from(schema.grievances)
      .where(eq(schema.grievances.siteId, site.id)).get()?.n ?? 0;
    // V1: longestOutageMs computed as (now - state_since) if currently Down, else 0.
    // A proper history-scan version comes in a future plan.
    const longestOutageMs = status?.currentState === 'down'
      ? Date.now() - (status.stateSince ?? Date.now())
      : 0;
    return {
      siteId: site.id, name: site.name,
      uptime30dPct: status?.uptime30dPct ?? null,
      totalReports: reports, longestOutageMs,
    };
  });

  const ranked = rankSites(inputs);

  return (
    <PageShell active="leaderboard">
      <div className="text-center mb-10">
        <span className="block text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[var(--color-saffron)] mb-2">
          Awards Ceremony · {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
        </span>
        <h1 className="text-4xl font-bold tracking-tight">
          Worst Performing<br/>
          <em className="text-[var(--color-red)] font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>Government Websites.</em>
        </h1>
        <p className="text-[var(--color-ink-dim)] mt-3 max-w-[540px] mx-auto">
          Ranked by 30-day uptime, ascending. Three special trophies for the most spectacular failures.
        </p>
      </div>

      <div className="border border-[var(--color-border)] rounded-2xl overflow-hidden bg-[var(--color-paper)]">
        {ranked.map((r) => (
          <div key={r.siteId} className={`flex items-center gap-6 px-6 py-5 border-b border-[var(--color-border)] last:border-b-0 ${r.trophy ? 'bg-[var(--color-saffron-soft)]/30' : ''} hover:bg-[var(--color-paper-2)]`}>
            <span className="text-3xl font-bold tabular-nums text-[var(--color-ink-faint)] w-12 text-right">
              {r.rank}
            </span>
            <a href={`/sites/${r.siteId}`} className="flex-1">
              <div className="flex items-center gap-3">
                <span className="text-base font-bold tracking-tight text-[var(--color-ink)]">{r.name}</span>
                {r.trophy && <span className="text-xs font-bold px-2 py-0.5 rounded bg-[var(--color-saffron)] text-white tracking-wide">{r.trophy}</span>}
              </div>
              <div className="text-[12px] text-[var(--color-ink-faint)] mt-0.5 font-medium">
                {r.totalReports} citizen grievances · {r.longestOutageMs > 0 ? `currently down for ${fmtHours(r.longestOutageMs)}` : 'no current outage'}
              </div>
            </a>
            <div className="text-right">
              <span className="text-2xl font-bold tabular-nums" style={{ color: r.uptime30dPct !== null && r.uptime30dPct < 50 ? 'var(--color-red)' : r.uptime30dPct !== null && r.uptime30dPct < 80 ? 'var(--color-amber)' : 'var(--color-green)' }}>
                {r.uptime30dPct === null ? '—' : Math.round(r.uptime30dPct)}
                <sup className="text-sm text-[var(--color-ink-faint)] ml-px">%</sup>
              </span>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-faint)] mt-0.5">30d uptime</p>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-[var(--color-ink-faint)] italic">
        All awards self-issued by Downtime Bhavan. Not affiliated with any government body.
      </p>
    </PageShell>
  );
}
```

- [ ] **Step 6: Build + commit**

```bash
npm run -w @dtb/web build
```

```bash
git add apps/web/lib/leaderboard.ts apps/web/lib/leaderboard.test.ts apps/web/app/leaderboard
git commit -m "$(cat <<'EOF'
feat(web): /leaderboard worst-performers page

Ranks all enabled sites by 30-day uptime ascending. Awards three trophies
(Worst Overall, Most Reports, Longest Outage). Color-coded uptime numbers,
satirical "Awards Ceremony" header. Pure ranking logic tested with 3 cases.
EOF
)"
```

---

## Task 8 — Wire homepage CTAs to the new pages

**Files:**
- Modify: `apps/web/components/DepartmentStatusPanel.tsx` (link "View all 12 departments →" to /departments)
- Modify: `apps/web/components/NotifyHero.tsx` (donation buttons already point to /donate)
- Verify the JantaDarbarPanel "View all grievances →" already links to /janta-darbar

- [ ] **Step 1: DepartmentStatusPanel — link the "View all" CTA**

Find the existing markup in `DepartmentStatusPanel.tsx`:

```tsx
<div className="px-7 py-3.5 text-center text-[11.5px] text-[var(--color-blue)] font-semibold cursor-pointer bg-[var(--color-paper)] border-t border-[var(--color-border)] hover:bg-[var(--color-blue-soft)]">
  View all {snapshots.length} departments →
</div>
```

Replace with an anchor:

```tsx
<a href="/departments" className="block px-7 py-3.5 text-center text-[11.5px] text-[var(--color-blue)] font-semibold bg-[var(--color-paper)] border-t border-[var(--color-border)] hover:bg-[var(--color-blue-soft)]">
  View all {snapshots.length} departments →
</a>
```

- [ ] **Step 2: Verify JantaDarbarPanel link**

Open `apps/web/components/JantaDarbarPanel.tsx`. Confirm there's already an `<a href="/janta-darbar">` wrapping the "View all grievances →" text (it was added in Plan 3 Task 12). If not, add it.

- [ ] **Step 3: Make StatusItem clickable to /sites/[id]**

Open `apps/web/components/StatusItem.tsx`. Wrap the entire `<article>` content in a link to `/sites/${snapshot.siteId}`:

Find the `<article>` opening tag. Wrap the inner content so the row is clickable. Simplest: wrap the contents in `<a href={`/sites/${snapshot.siteId}`} className="contents">...</a>`. This makes the row a link without changing the grid layout.

Apply this carefully — the `<article>` already has classes. The cleanest path:

```tsx
<article className="...existing classes...">
  <a href={`/sites/${snapshot.siteId}`} className="contents">
    ...the three grid children...
  </a>
</article>
```

`className="contents"` makes the anchor not affect layout — the children become direct grid items as before.

- [ ] **Step 4: Build + smoke**

```bash
npm run -w @dtb/web build
```

Expected: `Compiled successfully`. All 11 new routes (/methodology, /api, /press, /contact, /privacy, /donate, /departments, /sites/[id], /janta-darbar, /leaderboard) appear in the routes table.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/DepartmentStatusPanel.tsx apps/web/components/StatusItem.tsx apps/web/components/JantaDarbarPanel.tsx
git commit -m "$(cat <<'EOF'
feat(web): wire homepage CTAs to new sub-routes

"View all departments →" footer of left panel now links to /departments.
StatusItem rows link to /sites/[siteId] (using className='contents' to
preserve grid layout). JantaDarbarPanel's "View all grievances →" already
linked correctly from Plan 3 Task 12.
EOF
)"
```

---

## Task 9 — E2E + tag v0.3.0-link-pages

**Files:**
- Modify: `apps/web/e2e/homepage.spec.ts` (add nav-link tests)

- [ ] **Step 1: Add nav coverage**

Append to the end of `apps/web/e2e/homepage.spec.ts`:

```typescript
test('nav: all header links resolve to real pages', async ({ page }) => {
  const targets: Array<[string, RegExp]> = [
    ['Status',        /Department Status|Department Register/],
    ['Janta Darbar',  /Janta Darbar/],
    ['Leaderboard',   /Worst Performing/],
    ['Methodology',   /How we know|Where we check/],
    ['API',           /Read-only endpoints/],
  ];
  for (const [link, expected] of targets) {
    await page.goto('/');
    await page.getByRole('navigation').getByText(link, { exact: true }).first().click();
    await expect(page.locator('body')).toContainText(expected);
  }
});

test('footer: donate page loads with UPI ID', async ({ page }) => {
  await page.goto('/donate');
  await expect(page.getByText(/Office of the Chai Fund/)).toBeVisible();
  await expect(page.getByText(/UPI ID/i)).toBeVisible();
  // The default UPI fallback is shown when env is unset:
  await expect(page.getByText(/downtimebhavan@oksbi|@/)).toBeVisible();
});

test('departments: list shows all enabled sites + links to detail', async ({ page }) => {
  await page.goto('/departments');
  await expect(page.getByRole('heading', { name: /Department Register/ })).toBeVisible();
  await expect(page.getByText(/Aadhaar/)).toBeVisible();
  // Click into the first site row
  const aadhaarLink = page.getByRole('link', { name: /Aadhaar/ }).first();
  await aadhaarLink.click();
  await expect(page.getByText(/All departments|Past 7 days/)).toBeVisible({ timeout: 5000 });
});
```

- [ ] **Step 2: Run e2e**

```bash
# make sure DB has data
npm run db:migrate
npm run db:seed
npm run test:e2e
```

Expected: 7 tests pass (4 existing + 3 new).

- [ ] **Step 3: Commit e2e + version bump + tag**

```bash
git add apps/web/e2e/homepage.spec.ts
git commit -m "test(web): e2e for header nav links, /donate, /departments → /sites"

# Update root package.json version manually to 0.3.0-link-pages
npm version 0.3.0-link-pages --no-git-tag-version

git add package.json package-lock.json
git commit -m "$(cat <<'EOF'
release: v0.3.0-link-pages

Plan 4 complete. Every link on the homepage now lands on a real page:

- /departments — full sortable table of all sites + click-through
- /sites/[siteId] — per-site detail with 7-day history + recent grievances
- /janta-darbar — full grievance feed with filter + sort + live updates
- /leaderboard — worst performers with satirical award trophies
- /methodology — plain-language detection explanation
- /api — read-only endpoint reference
- /press — for journalists; CC-BY data, AGPL code
- /contact — three role-based emails
- /privacy — DPDP-compliant policy
- /donate — UPI QR + GitHub Sponsors + transparency block

Next: Plan 5 — admin dashboard. Then Plan 6 — WhatsApp notify-me.
Then Plan 7 — Fly.io Mumbai deploy.
EOF
)"
git tag v0.3.0-link-pages
git log --oneline | head -20
git tag --list
```

---

## Self-Review

**Spec coverage:**

| User request from this chat | Covered in |
|---|---|
| `/janta-darbar` full feed with filters + sort + live | Task 6 |
| `/departments` full table | Task 4 |
| `/sites/[siteId]` detail | Task 5 |
| `/leaderboard` | Task 7 |
| `/methodology`, `/api`, `/press`, `/contact`, `/privacy` | Task 2 |
| `/donate` with UPI | Task 3 |
| Homepage "View all" links wired | Task 8 |

`/delete-my-data` deferred to Plan 6 (where it lives naturally with the WhatsApp + OTP flow).

**Placeholder scan:** none.

**Type consistency:**
- `SiteStatusSnapshot` used in /departments and /sites/[id]
- `LeaderboardInput` and `RankedSite` are new types in `apps/web/lib/leaderboard.ts`
- The existing `GrievancePost` props match what the new pages provide

---

## Execution Handoff

**Plan saved.** Same execution flow as Plans 1 + 3: subagent-driven, one task at a time, build verify between tasks, e2e + tag at the end.

Ready to execute. Say "go" and I start dispatching.
