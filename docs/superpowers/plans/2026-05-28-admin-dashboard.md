# Plan 5 — Admin Dashboard

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A single-admin operator console at `/admin/*`, password-gated via an env-var token. Lets you moderate hidden/reported grievances, view subscription/donation stats, and inspect site configs without touching the DB directly.

**Architecture:**
- Auth is a single shared secret — `DTB_ADMIN_TOKEN` in env. The first request to any `/admin/*` page redirects to `/admin/login`; on successful login we set an HttpOnly cookie (`dtb_admin`) signed with the same token. Subsequent requests verify the cookie via Next middleware. Single-admin V1; multi-admin auth lives in V2.
- All admin pages render server-side. No client-side admin state.
- Mutations (unhide grievance, ban IP) go through dedicated `POST /api/admin/*` routes that also verify the cookie.
- No `/admin` link in the public header or footer — admins know the URL.

**Tech Stack:** Same as Plans 1-4. No new deps (uses Node's `crypto` for HMAC cookie signing).

**Builds on:** `v0.3.0-link-pages` (commit `eb3dd0d`).

---

## File structure (additions)

```
apps/web/
├── middleware.ts                         # admin cookie check, /admin/* gate
├── app/
│   ├── admin/
│   │   ├── layout.tsx                    # admin shell with internal nav
│   │   ├── page.tsx                      # dashboard home: counts + recent activity
│   │   ├── login/page.tsx                # password form
│   │   ├── grievances/page.tsx           # moderation queue
│   │   ├── sites/page.tsx                # site config viewer
│   │   ├── donations/page.tsx            # manual donation ledger
│   │   └── stats/page.tsx                # subscription + activity counts
│   └── api/
│       └── admin/
│           ├── login/route.ts            # POST password → set cookie
│           ├── logout/route.ts           # POST → clear cookie
│           ├── grievance/[id]/unhide/route.ts     # restore a hidden grievance
│           ├── grievance/[id]/hide/route.ts       # admin-hide
│           └── donation/add/route.ts     # log a manual donation entry
├── components/
│   ├── AdminNav.tsx                      # left-rail nav for /admin/*
│   └── AdminTable.tsx                    # reusable striped table
└── lib/
    ├── admin-auth.ts                     # cookie signing + verification
    └── admin-auth.test.ts
```

Also adds two DB tables:
- `donations` (already in spec §8; not created yet — added as 0002 migration here)
- (Note: `subscriptions` and `otp_attempts` are NOT added in this plan; they belong to Plan 6.)

---

## Task 1 — Admin auth (cookie signing + middleware)

**Files:**
- Create: `apps/web/lib/admin-auth.ts`, `apps/web/lib/admin-auth.test.ts`
- Create: `apps/web/middleware.ts`
- Modify: `.env.example` (add DTB_ADMIN_TOKEN)

- [ ] **Step 1: Append to .env.example**

```bash
# === Admin (Plan 5) ===
# Shared secret for /admin/* access. Generate with: openssl rand -hex 32
# When unset, /admin/login still works with the literal string "dev-admin" — DO NOT ship that to prod.
DTB_ADMIN_TOKEN=dev-admin
```

- [ ] **Step 2: TDD test for HMAC cookie functions**

`apps/web/lib/admin-auth.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { signAdminCookie, verifyAdminCookie } from './admin-auth.js';

const SECRET = 'test-secret-32-chars-xxxxxxxxxxxx';

describe('admin-auth', () => {
  it('signs and verifies a fresh cookie', () => {
    const cookie = signAdminCookie(SECRET);
    expect(verifyAdminCookie(cookie, SECRET)).toBe(true);
  });

  it('rejects a tampered cookie', () => {
    const cookie = signAdminCookie(SECRET);
    const tampered = cookie.slice(0, -3) + 'aaa';
    expect(verifyAdminCookie(tampered, SECRET)).toBe(false);
  });

  it('rejects cookies signed with a different secret', () => {
    const cookie = signAdminCookie(SECRET);
    expect(verifyAdminCookie(cookie, 'other-secret')).toBe(false);
  });

  it('rejects an empty/malformed cookie', () => {
    expect(verifyAdminCookie('', SECRET)).toBe(false);
    expect(verifyAdminCookie('abc', SECRET)).toBe(false);
    expect(verifyAdminCookie('a.b', SECRET)).toBe(false);
  });

  it('rejects a cookie older than 7 days', () => {
    // Manually craft an old cookie
    const tenDaysAgo = Date.now() - 10 * 24 * 60 * 60 * 1000;
    const oldCookie = signAdminCookie(SECRET, tenDaysAgo);
    expect(verifyAdminCookie(oldCookie, SECRET)).toBe(false);
  });
});
```

- [ ] **Step 3: Implement**

`apps/web/lib/admin-auth.ts`:

```typescript
import { createHmac, timingSafeEqual } from 'node:crypto';

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Returns a cookie value: `<issuedAtMs>.<hmac>` */
export function signAdminCookie(secret: string, issuedAt: number = Date.now()): string {
  const payload = String(issuedAt);
  const hmac = createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${hmac}`;
}

/** Returns true iff cookie was signed with this secret and is within MAX_AGE. */
export function verifyAdminCookie(cookie: string, secret: string): boolean {
  if (!cookie || !cookie.includes('.')) return false;
  const [payload, sig] = cookie.split('.');
  if (!payload || !sig) return false;
  const issuedAt = Number(payload);
  if (Number.isNaN(issuedAt)) return false;
  if (Date.now() - issuedAt > MAX_AGE_MS) return false;
  const expected = createHmac('sha256', secret).update(payload).digest('hex');
  const a = Buffer.from(sig, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export const ADMIN_TOKEN = () => process.env.DTB_ADMIN_TOKEN ?? 'dev-admin';
export const COOKIE_NAME = 'dtb_admin';
```

- [ ] **Step 4: Run tests**

```bash
npm -w @dtb/web test
```

Expected: 5 admin-auth tests pass.

- [ ] **Step 5: Middleware**

`apps/web/middleware.ts`:

```typescript
import { NextResponse, type NextRequest } from 'next/server';
import { verifyAdminCookie, ADMIN_TOKEN, COOKIE_NAME } from '@/lib/admin-auth';

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};

export function middleware(req: NextRequest) {
  // /admin/login + /api/admin/login are public
  if (req.nextUrl.pathname === '/admin/login' || req.nextUrl.pathname === '/api/admin/login') {
    return NextResponse.next();
  }
  const cookie = req.cookies.get(COOKIE_NAME)?.value ?? '';
  if (verifyAdminCookie(cookie, ADMIN_TOKEN())) return NextResponse.next();

  // Redirect unauthenticated admin page requests to login
  if (req.nextUrl.pathname.startsWith('/admin/')) {
    const url = req.nextUrl.clone();
    url.pathname = '/admin/login';
    url.searchParams.set('from', req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  // Block unauthenticated /api/admin/* with 401
  return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
}
```

- [ ] **Step 6: Build + commit**

```bash
npm run -w @dtb/web build
```

Expected: `Compiled successfully` — middleware listed at the bottom of the build output.

```bash
git add apps/web/lib/admin-auth.ts apps/web/lib/admin-auth.test.ts apps/web/middleware.ts .env.example
git commit -m "feat(admin): HMAC-signed cookie auth + middleware gate

Single-admin V1: DTB_ADMIN_TOKEN env var. Login sets HttpOnly cookie
signed with HMAC-SHA256; verified on every /admin/* and /api/admin/*
request. 7-day expiry. Constant-time comparison."
```

---

## Task 2 — Login / logout API + page

**Files:**
- Create: `apps/web/app/admin/login/page.tsx`
- Create: `apps/web/app/api/admin/login/route.ts`
- Create: `apps/web/app/api/admin/logout/route.ts`

- [ ] **Step 1: Login page (client component)**

`apps/web/app/admin/login/page.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AshokaMark } from '@/components/AshokaMark';

export default function Page() {
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get('from') ?? '/admin';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (res.ok) router.push(from);
    else { setError('Wrong token.'); setBusy(false); }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-[var(--color-bg)]">
      <form onSubmit={submit} className="bg-[var(--color-paper)] border border-[var(--color-border)] rounded-2xl p-8 w-full max-w-[400px] shadow-[0_20px_60px_-12px_rgba(15,31,95,0.18)]">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-[var(--color-blue)] flex items-center justify-center text-white">
            <AshokaMark size={28} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-[var(--color-ink-faint)]">Restricted</p>
            <h1 className="text-lg font-bold tracking-tight">Admin · Downtime Bhavan</h1>
          </div>
        </div>
        <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--color-ink-faint)] mb-1.5">Admin token</label>
        <input type="password" value={token} onChange={(e) => setToken(e.target.value)}
               autoFocus required
               className="w-full border border-[var(--color-border-strong)] rounded-lg px-3 py-2.5 text-sm font-mono mb-3 bg-[var(--color-paper)]" />
        {error && <p className="text-xs text-[var(--color-red)] font-semibold mb-3">{error}</p>}
        <button type="submit" disabled={busy}
                className="w-full bg-[var(--color-blue)] text-white px-5 py-3 rounded-lg text-sm font-bold hover:bg-[var(--color-blue-deep)] disabled:opacity-50">
          {busy ? 'Verifying...' : 'Enter'}
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 2: Login API**

`apps/web/app/api/admin/login/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { signAdminCookie, ADMIN_TOKEN, COOKIE_NAME } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let token: string;
  try { ({ token } = await req.json() as { token: string }); }
  catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  if (token !== ADMIN_TOKEN()) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const cookie = signAdminCookie(ADMIN_TOKEN());
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, cookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });
  return res;
}
```

- [ ] **Step 3: Logout API**

`apps/web/app/api/admin/logout/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { COOKIE_NAME } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE_NAME);
  return res;
}
```

- [ ] **Step 4: Build + smoke + commit**

```bash
npm run -w @dtb/web build
```

Smoke (optional, requires port 3210 free):

```bash
DTB_ADMIN_TOKEN=test123 npm run dev:web &
DEV_PID=$!
sleep 12
# /admin redirects to /admin/login
curl -s -I http://localhost:3210/admin/grievances | grep -i location
# wrong token
curl -s -X POST http://localhost:3210/api/admin/login -H 'Content-Type: application/json' -d '{"token":"wrong"}'
# right token sets cookie
curl -s -X POST -c cookies.txt http://localhost:3210/api/admin/login -H 'Content-Type: application/json' -d '{"token":"test123"}'
cat cookies.txt
kill $DEV_PID 2>/dev/null || true
rm -f cookies.txt
```

```bash
git add apps/web/app/admin/login apps/web/app/api/admin/login apps/web/app/api/admin/logout
git commit -m "feat(admin): login + logout endpoints + login page"
```

---

## Task 3 — Admin shell layout + dashboard home

**Files:**
- Create: `apps/web/components/AdminNav.tsx`, `apps/web/app/admin/layout.tsx`, `apps/web/app/admin/page.tsx`

- [ ] **Step 1: AdminNav**

`apps/web/components/AdminNav.tsx`:

```typescript
const ITEMS = [
  { href: '/admin',            label: 'Overview' },
  { href: '/admin/grievances', label: 'Grievances' },
  { href: '/admin/sites',      label: 'Sites' },
  { href: '/admin/stats',      label: 'Stats' },
  { href: '/admin/donations',  label: 'Donations' },
];

interface Props { active?: string; }

export function AdminNav({ active = '/admin' }: Props) {
  return (
    <nav className="w-[200px] shrink-0 border-r border-[var(--color-border)] bg-[var(--color-paper)] p-4">
      <p className="text-[10px] uppercase tracking-[0.18em] font-semibold text-[var(--color-ink-faint)] mb-3 px-2">Admin</p>
      <ul className="space-y-0.5">
        {ITEMS.map((item) => (
          <li key={item.href}>
            <a href={item.href}
               className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                 active === item.href
                   ? 'bg-[var(--color-blue-soft)] text-[var(--color-blue)] font-bold'
                   : 'text-[var(--color-ink-soft)] hover:bg-[var(--color-paper-2)]'
               }`}>
              {item.label}
            </a>
          </li>
        ))}
      </ul>
      <form action="/api/admin/logout" method="POST" className="mt-4 px-2">
        <button type="submit" className="text-[11px] text-[var(--color-ink-faint)] hover:text-[var(--color-red)] font-semibold">
          Logout →
        </button>
      </form>
    </nav>
  );
}
```

- [ ] **Step 2: Admin layout**

`apps/web/app/admin/layout.tsx`:

```typescript
import type { ReactNode } from 'react';

export const metadata = { title: 'Admin · Downtime Bhavan', robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
```

(Login page bypasses the inner shell; per-page layout adds the nav.)

- [ ] **Step 3: Overview page**

`apps/web/app/admin/page.tsx`:

```typescript
import { count, eq, and, gte } from 'drizzle-orm';
import { schema } from '@dtb/db';
import { getDb } from '@/lib/db';
import { AdminNav } from '@/components/AdminNav';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const db = getDb();
  const sinceDay = Date.now() - 24 * 60 * 60 * 1000;
  const sinceHour = Date.now() - 60 * 60 * 1000;

  const sitesCount = db.select({ n: count() }).from(schema.sites).get()?.n ?? 0;
  const sitesEnabled = db.select({ n: count() }).from(schema.sites).where(eq(schema.sites.enabled, true)).get()?.n ?? 0;
  const grievancesDay = db.select({ n: count() }).from(schema.grievances).where(gte(schema.grievances.createdAt, sinceDay)).get()?.n ?? 0;
  const grievancesHour = db.select({ n: count() }).from(schema.grievances).where(gte(schema.grievances.createdAt, sinceHour)).get()?.n ?? 0;
  const grievancesHidden = db.select({ n: count() }).from(schema.grievances).where(eq(schema.grievances.visible, false)).get()?.n ?? 0;
  const checksDay = db.select({ n: count() }).from(schema.checks).where(gte(schema.checks.checkedAt, sinceDay)).get()?.n ?? 0;

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      <AdminNav active="/admin" />
      <div className="flex-1 p-8">
        <h1 className="text-2xl font-bold tracking-tight mb-6">Overview</h1>
        <div className="grid grid-cols-3 gap-4">
          <Card label="Sites enabled" value={`${sitesEnabled} / ${sitesCount}`} />
          <Card label="Grievances · last hour" value={grievancesHour} />
          <Card label="Grievances · last 24h" value={grievancesDay} />
          <Card label="Hidden grievances (queue)" value={grievancesHidden} warn={grievancesHidden > 0} />
          <Card label="Checks · last 24h" value={checksDay} />
          <Card label="DB file" value="data/dtb.sqlite" mono />
        </div>
      </div>
    </div>
  );
}

function Card({ label, value, mono = false, warn = false }: { label: string; value: string | number; mono?: boolean; warn?: boolean }) {
  return (
    <div className="border border-[var(--color-border)] rounded-2xl bg-[var(--color-paper)] p-5">
      <p className="text-[10.5px] uppercase tracking-[0.15em] font-semibold text-[var(--color-ink-faint)] mb-2">{label}</p>
      <p className={`text-2xl font-bold tracking-tight ${mono ? 'font-mono text-base break-all' : ''} ${warn ? 'text-[var(--color-amber)]' : 'text-[var(--color-ink)]'}`}>{value}</p>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/AdminNav.tsx apps/web/app/admin/layout.tsx apps/web/app/admin/page.tsx
git commit -m "feat(admin): shell layout + overview dashboard"
```

---

## Task 4 — /admin/grievances moderation queue + unhide/hide APIs

**Files:**
- Create: `apps/web/app/admin/grievances/page.tsx`
- Create: `apps/web/app/api/admin/grievance/[id]/unhide/route.ts`
- Create: `apps/web/app/api/admin/grievance/[id]/hide/route.ts`

- [ ] **Step 1: Moderation queue page**

`apps/web/app/admin/grievances/page.tsx`:

```typescript
import { desc, eq } from 'drizzle-orm';
import { schema } from '@dtb/db';
import { getDb } from '@/lib/db';
import { AdminNav } from '@/components/AdminNav';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const db = getDb();
  const sites = db.select().from(schema.sites).all();
  const siteName = new Map(sites.map((s) => [s.id, s.name] as const));

  const hidden = db.select().from(schema.grievances)
    .where(eq(schema.grievances.visible, false))
    .orderBy(desc(schema.grievances.createdAt))
    .limit(100).all();

  const recent = db.select().from(schema.grievances)
    .where(eq(schema.grievances.visible, true))
    .orderBy(desc(schema.grievances.createdAt))
    .limit(50).all();

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      <AdminNav active="/admin/grievances" />
      <div className="flex-1 p-8 max-w-[1100px]">
        <h1 className="text-2xl font-bold tracking-tight mb-6">Grievances</h1>

        <h2 className="text-base font-bold mb-3 text-[var(--color-amber)]">
          Hidden queue · {hidden.length}
        </h2>
        <Table rows={hidden} siteName={siteName} action="unhide" />

        <h2 className="text-base font-bold mt-10 mb-3">Recently visible</h2>
        <Table rows={recent} siteName={siteName} action="hide" />
      </div>
    </div>
  );
}

function Table({ rows, siteName, action }: { rows: typeof schema.grievances.$inferSelect[]; siteName: Map<string, string>; action: 'hide' | 'unhide' }) {
  if (rows.length === 0) return <p className="text-sm text-[var(--color-ink-dim)]">— None —</p>;
  return (
    <div className="border border-[var(--color-border)] rounded-2xl overflow-hidden bg-[var(--color-paper)]">
      {rows.map((r) => (
        <form key={r.id} method="POST" action={`/api/admin/grievance/${r.id}/${action}`}
              className="flex items-start gap-4 px-5 py-4 border-b border-[var(--color-border)] last:border-b-0">
          <div className="text-[10px] font-mono text-[var(--color-ink-faint)] w-12 shrink-0">#{r.id}</div>
          <div className="flex-1">
            <div className="text-xs font-bold mb-1">
              {siteName.get(r.siteId) ?? r.siteId} <span className="text-[var(--color-ink-faint)] font-medium">· {r.tag}</span>
              <span className="text-[var(--color-ink-faint)] font-medium ml-2">· reports: {r.reportsCount}</span>
            </div>
            <p className="text-sm">{r.body}</p>
          </div>
          <button type="submit"
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg ${
                    action === 'unhide'
                      ? 'bg-[var(--color-green)] text-white hover:bg-[var(--color-green-soft)] hover:text-[var(--color-green)]'
                      : 'bg-[var(--color-red)] text-white hover:opacity-90'
                  }`}>
            {action === 'unhide' ? 'Unhide' : 'Hide'}
          </button>
        </form>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Unhide API**

`apps/web/app/api/admin/grievance/[id]/unhide/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { schema } from '@dtb/db';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await ctx.params;
  const id = parseInt(idStr, 10);
  if (Number.isNaN(id)) return NextResponse.json({ error: 'bad_id' }, { status: 400 });

  const db = getDb();
  db.update(schema.grievances).set({ visible: true, reportsCount: 0 }).where(eq(schema.grievances.id, id)).run();
  return NextResponse.redirect(new URL('/admin/grievances', _req.url));
}
```

- [ ] **Step 3: Hide API**

`apps/web/app/api/admin/grievance/[id]/hide/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { schema } from '@dtb/db';
import { getDb } from '@/lib/db';
import { emitGrievanceEvent } from '@/lib/grievance-bus';

export const dynamic = 'force-dynamic';

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await ctx.params;
  const id = parseInt(idStr, 10);
  if (Number.isNaN(id)) return NextResponse.json({ error: 'bad_id' }, { status: 400 });

  const db = getDb();
  db.update(schema.grievances).set({ visible: false }).where(eq(schema.grievances.id, id)).run();
  emitGrievanceEvent('grievance:hide', { grievanceId: id });
  return NextResponse.redirect(new URL('/admin/grievances', _req.url));
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/admin/grievances apps/web/app/api/admin/grievance
git commit -m "feat(admin): /admin/grievances moderation queue + unhide/hide actions"
```

---

## Task 5 — /admin/sites + /admin/stats

**Files:**
- Create: `apps/web/app/admin/sites/page.tsx`, `apps/web/app/admin/stats/page.tsx`

- [ ] **Step 1: Sites viewer**

`apps/web/app/admin/sites/page.tsx`:

```typescript
import { schema } from '@dtb/db';
import { getDb } from '@/lib/db';
import { AdminNav } from '@/components/AdminNav';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const db = getDb();
  const sites = db.select().from(schema.sites).all();

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      <AdminNav active="/admin/sites" />
      <div className="flex-1 p-8 max-w-[1100px]">
        <h1 className="text-2xl font-bold tracking-tight mb-2">Sites</h1>
        <p className="text-sm text-[var(--color-ink-dim)] mb-6">
          Read-only view. Edit <code className="bg-[var(--color-paper-2)] px-1.5 py-0.5 rounded">config/sites/*.json</code> + run <code className="bg-[var(--color-paper-2)] px-1.5 py-0.5 rounded">npm run db:seed</code> to change.
        </p>

        <div className="space-y-3">
          {sites.map((s) => (
            <details key={s.id} className="border border-[var(--color-border)] rounded-xl bg-[var(--color-paper)] overflow-hidden">
              <summary className="cursor-pointer px-5 py-3.5 flex items-center justify-between hover:bg-[var(--color-paper-2)]">
                <div>
                  <span className="font-bold">{s.name}</span>
                  <span className="text-xs text-[var(--color-ink-faint)] ml-2">{s.id}</span>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded ${
                  s.enabled
                    ? 'bg-[var(--color-green-soft)] text-[var(--color-green)]'
                    : 'bg-[var(--color-paper-2)] text-[var(--color-ink-faint)]'
                }`}>
                  {s.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </summary>
              <pre className="text-[11px] font-mono bg-[var(--color-paper-2)] p-4 overflow-x-auto border-t border-[var(--color-border)]">
                {JSON.stringify(JSON.parse(s.configJson), null, 2)}
              </pre>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Stats page**

`apps/web/app/admin/stats/page.tsx`:

```typescript
import { count, eq, gte, and, desc } from 'drizzle-orm';
import { schema } from '@dtb/db';
import { getDb } from '@/lib/db';
import { AdminNav } from '@/components/AdminNav';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const db = getDb();
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;

  // Per-site grievance counts in last 24h
  const sites = db.select().from(schema.sites).all();
  const perSite = sites.map((s) => {
    const n = db.select({ n: count() }).from(schema.grievances)
      .where(and(
        eq(schema.grievances.siteId, s.id),
        gte(schema.grievances.createdAt, dayAgo),
      )).get()?.n ?? 0;
    return { name: s.name, count: n };
  }).sort((a, b) => b.count - a.count);

  // Top reactions
  const allReactions = db.select().from(schema.reactions).all();
  const reactionCounts: Record<string, number> = {};
  for (const r of allReactions) reactionCounts[r.kind] = (reactionCounts[r.kind] ?? 0) + 1;

  // Recent rate-limit hits (denied attempts) — count rows in last 24h with count >= the limit
  const rlRows = db.select().from(schema.rateLimitAttempts).all();
  const recentBlocks = rlRows.length;

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      <AdminNav active="/admin/stats" />
      <div className="flex-1 p-8 max-w-[1100px]">
        <h1 className="text-2xl font-bold tracking-tight mb-6">Stats</h1>

        <h2 className="text-base font-bold mb-3">Grievances per site · last 24h</h2>
        <div className="border border-[var(--color-border)] rounded-2xl overflow-hidden bg-[var(--color-paper)] mb-8">
          {perSite.map((row, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)] last:border-b-0">
              <span className="text-sm font-medium">{row.name}</span>
              <span className="text-base font-bold tabular-nums">{row.count}</span>
            </div>
          ))}
        </div>

        <h2 className="text-base font-bold mb-3">All-time reactions</h2>
        <div className="grid grid-cols-4 gap-4 mb-8">
          {['same', 'angry', 'sad', 'laugh'].map((k) => (
            <div key={k} className="border border-[var(--color-border)] rounded-2xl bg-[var(--color-paper)] p-5">
              <p className="text-[10.5px] uppercase tracking-[0.15em] font-semibold text-[var(--color-ink-faint)] mb-2">{k}</p>
              <p className="text-2xl font-bold tabular-nums">{reactionCounts[k] ?? 0}</p>
            </div>
          ))}
        </div>

        <h2 className="text-base font-bold mb-3">Rate-limit state</h2>
        <p className="text-sm text-[var(--color-ink-dim)]">
          {recentBlocks} active rate-limit rows across all actions and IPs. Pruning runs in V2.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/admin/sites apps/web/app/admin/stats
git commit -m "feat(admin): /admin/sites JSON viewer + /admin/stats counters"
```

---

## Task 6 — /admin/donations (manual ledger)

**Files:**
- Modify: `packages/db/src/schema.ts` (add donations table — was in spec §8 but not yet created)
- Create: 0002 migration (auto-generated)
- Create: `apps/web/app/admin/donations/page.tsx`
- Create: `apps/web/app/api/admin/donation/add/route.ts`

- [ ] **Step 1: Add donations table**

Append to `packages/db/src/schema.ts`:

```typescript
/**
 * Manual donation ledger. V1 reconciliation: admin enters UPI/Razorpay/etc.
 * receipts here. The /donate page shows aggregate transparency stats from this.
 */
export const donations = sqliteTable('donations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  amountInr: real('amount_inr').notNull(),
  source: text('source').notNull(),     // 'upi' | 'github_sponsors' | 'other'
  receivedAt: integer('received_at').notNull(),
  note: text('note'),
});
```

- [ ] **Step 2: Generate + apply migration**

```bash
npm -w @dtb/db run migrate:generate
npm run db:migrate
sqlite3 data/dtb.sqlite ".schema donations"
```

- [ ] **Step 3: Donations page**

`apps/web/app/admin/donations/page.tsx`:

```typescript
import { desc, sum } from 'drizzle-orm';
import { schema } from '@dtb/db';
import { getDb } from '@/lib/db';
import { AdminNav } from '@/components/AdminNav';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const db = getDb();
  const all = db.select().from(schema.donations).orderBy(desc(schema.donations.receivedAt)).all();
  const total = all.reduce((s, d) => s + d.amountInr, 0);
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
  const thisMonth = all.filter((d) => d.receivedAt >= monthStart.getTime()).reduce((s, d) => s + d.amountInr, 0);

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      <AdminNav active="/admin/donations" />
      <div className="flex-1 p-8 max-w-[900px]">
        <h1 className="text-2xl font-bold tracking-tight mb-6">Donations</h1>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="border border-[var(--color-border)] rounded-2xl bg-[var(--color-paper)] p-5">
            <p className="text-[10.5px] uppercase tracking-[0.15em] font-semibold text-[var(--color-ink-faint)] mb-2">This month</p>
            <p className="text-2xl font-bold tabular-nums text-[var(--color-green)]">₹{thisMonth.toLocaleString('en-IN')}</p>
          </div>
          <div className="border border-[var(--color-border)] rounded-2xl bg-[var(--color-paper)] p-5">
            <p className="text-[10.5px] uppercase tracking-[0.15em] font-semibold text-[var(--color-ink-faint)] mb-2">All-time</p>
            <p className="text-2xl font-bold tabular-nums">₹{total.toLocaleString('en-IN')}</p>
          </div>
        </div>

        <h2 className="text-base font-bold mb-3">Log a donation</h2>
        <form method="POST" action="/api/admin/donation/add"
              className="border border-[var(--color-border)] rounded-2xl bg-[var(--color-paper)] p-5 mb-8">
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--color-ink-faint)] mb-1.5">Amount ₹</label>
              <input name="amount" type="number" step="0.01" required
                     className="w-full border border-[var(--color-border-strong)] rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--color-ink-faint)] mb-1.5">Source</label>
              <select name="source" required
                      className="w-full border border-[var(--color-border-strong)] rounded-lg px-3 py-2 text-sm">
                <option value="upi">UPI</option>
                <option value="github_sponsors">GitHub Sponsors</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--color-ink-faint)] mb-1.5">Note</label>
              <input name="note" type="text" placeholder="Optional"
                     className="w-full border border-[var(--color-border-strong)] rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <button type="submit" className="bg-[var(--color-blue)] text-white px-4 py-2 rounded-lg text-sm font-bold">
            Add entry
          </button>
        </form>

        <h2 className="text-base font-bold mb-3">All entries</h2>
        <div className="border border-[var(--color-border)] rounded-2xl overflow-hidden bg-[var(--color-paper)]">
          {all.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-[var(--color-ink-dim)]">— No donations logged —</p>
          ) : all.map((d) => (
            <div key={d.id} className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)] last:border-b-0">
              <div>
                <span className="text-sm font-bold tabular-nums">₹{d.amountInr.toLocaleString('en-IN')}</span>
                <span className="text-xs text-[var(--color-ink-faint)] ml-3">{d.source}</span>
                {d.note && <span className="text-xs text-[var(--color-ink-dim)] ml-3">— {d.note}</span>}
              </div>
              <span className="text-xs text-[var(--color-ink-faint)]">{new Date(d.receivedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add donation API**

`apps/web/app/api/admin/donation/add/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { schema } from '@dtb/db';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const form = await req.formData();
  const amount = parseFloat(String(form.get('amount') ?? '0'));
  const source = String(form.get('source') ?? 'other');
  const note = form.get('note') ? String(form.get('note')) : null;
  if (!amount || Number.isNaN(amount) || amount <= 0) {
    return NextResponse.json({ error: 'bad_amount' }, { status: 400 });
  }
  const db = getDb();
  db.insert(schema.donations).values({
    amountInr: amount, source, receivedAt: Date.now(), note,
  }).run();
  return NextResponse.redirect(new URL('/admin/donations', req.url));
}
```

- [ ] **Step 5: Commit**

```bash
git add packages/db apps/web/app/admin/donations apps/web/app/api/admin/donation
git commit -m "feat(admin): /admin/donations manual ledger + 0002 migration"
```

---

## Task 7 — E2E + tag v0.4.0-admin

**Files:**
- Modify: `apps/web/e2e/homepage.spec.ts` (add admin auth tests)

- [ ] **Step 1: Add tests**

Append to `apps/web/e2e/homepage.spec.ts`:

```typescript
test('admin: unauth redirects to login', async ({ page }) => {
  await page.goto('/admin/grievances');
  await expect(page).toHaveURL(/\/admin\/login/);
});

test('admin: wrong token shows error, right token enters', async ({ page }) => {
  await page.goto('/admin/login');
  await page.getByLabel(/Admin token/i).fill('wrong-token');
  await page.getByRole('button', { name: /Enter/i }).click();
  await expect(page.getByText(/Wrong token/i)).toBeVisible();

  await page.getByLabel(/Admin token/i).fill('dev-admin');
  await page.getByRole('button', { name: /Enter/i }).click();
  await expect(page.getByRole('heading', { name: /Overview/ })).toBeVisible({ timeout: 5_000 });
});
```

- [ ] **Step 2: Run + commit + tag**

```bash
# Ensure DTB_ADMIN_TOKEN is "dev-admin" for the test (the default fallback)
unset DTB_ADMIN_TOKEN
npm run test:e2e
```

Expected: 9 tests pass total (7 from before + 2 new).

```bash
git add apps/web/e2e/homepage.spec.ts
git commit -m "test(web): e2e for admin redirect + login"

npm version 0.4.0-admin --no-git-tag-version
git add package.json package-lock.json
git commit -m "$(cat <<'EOF'
release: v0.4.0-admin

Plan 5 complete. Single-admin operator console at /admin:
- HMAC-signed cookie auth via DTB_ADMIN_TOKEN env
- Middleware gate on all /admin/* and /api/admin/*
- /admin overview with counts
- /admin/grievances moderation queue (hide/unhide)
- /admin/sites JSON config viewer
- /admin/stats per-site activity counters
- /admin/donations manual ledger + add form
EOF
)"
git tag v0.4.0-admin
```

---

## Self-Review

- All `/admin/*` routes are gated by middleware
- Login flow: redirect → /admin/login with `from` param → set cookie → push back to original URL
- No `/admin` link in the public UI
- Donations table added (0002 migration)
- 2 new e2e tests cover the redirect + login

## Execution Handoff

After this plan: Plan 6 (WhatsApp notify-me) and Plan 7 (Fly.io deploy) remain.
