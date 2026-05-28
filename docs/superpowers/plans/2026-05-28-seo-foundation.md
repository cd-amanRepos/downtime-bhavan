# Plan 9 — SEO Foundation (Track A: Technical)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring Downtime Bhavan from "zero SEO foundation" to "every page is indexable, structured, and AI-readable" in one focused build. After this plan, sitemap/robots/manifest/llms.txt are live; every public route has unique title/description/canonical/OG/Twitter Card; root layout emits `Organization` + `WebSite` JSON-LD; per-page schemas are emitted on `/sites/[id]`, `/leaderboard`, `/methodology`, `/janta-darbar`; an `/about` page exists with `Person` schema; dynamic OG images render per route; and a branded 404 page exists.

**Scope:** Track A (technical SEO) only. Track B (per-site content writing, methodology rewrite) and Track C (off-page: Wikidata, social) are separate work, not in this plan.

**Out of scope:**
- Per-site evergreen content (600+ words per portal) — that's Plan 9 / Track B.
- Daily Downtime stream URLs (`/daily/...`) — those routes don't exist yet; will scaffold in Track A only as far as the URL plan calls for. **Defer entirely** to a later content-engine plan.
- Adding the other 11 site configs (Plan 2 work, deferred). This plan's per-site SEO machinery must render correctly whether the DB has 1 site or 12.
- Public data endpoint `/api/public/uptime.json` — Phase 2 of the strategy, not Phase 1.

**Architecture:**
- All SEO primitives live in Next.js 15 App Router's native files: `app/sitemap.ts`, `app/robots.ts`, `app/manifest.ts`, `app/not-found.tsx`, `app/opengraph-image.tsx`. No third-party SEO libs.
- A new `apps/web/lib/seo/` module centralizes (a) site constants (base URL, brand, social handles), (b) JSON-LD builders typed against `schema-dts`, (c) shared metadata helpers.
- `llms.txt` is a static file at `apps/web/public/llms.txt`.
- OG images use `next/og` ImageResponse, rendered at the edge by Next.js. Branded fallback at `app/opengraph-image.tsx`; dynamic per-site at `app/sites/[siteId]/opengraph-image.tsx`.
- `<html lang="en-IN">` replaces current `lang="en"`.
- JSON-LD is server-rendered via `<script type="application/ld+json">` (not via `next/script` — the script-component approach risks client mount delays and Google has stated server-rendered JSON-LD is preferred).

**Tech Stack:** Same as Plans 1–7. One new dev dependency: `schema-dts` (TypeScript types for Schema.org JSON-LD; zero runtime cost).

**Builds on:** `v1.0.0` (commit `4758356`) on `main`.

---

## Constants & site config (referenced by all tasks)

```
SITE_URL          = https://downtimebhavan.in
BRAND_NAME        = Downtime Bhavan
BRAND_HI          = डाउनटाइम भवन
BRAND_TAGLINE     = An unofficial observatory
ORG_LEGAL_NOTE    = Independent civic project. Not affiliated with the Government of India or any government body.
SOCIAL_X          = https://x.com/downtimebhavan   (placeholder until handle confirmed)
SOCIAL_GITHUB     = https://github.com/downtimebhavan (placeholder)
WIKIDATA_QID      = (TBD — populate after Wikidata entity is created; leave empty string if not yet)
FOUNDING_DATE     = 2026-05
LOCALE            = en-IN
COUNTRY           = IN
OPERATOR_NAME     = (the named operator — see /about; provisional placeholder for now)
```

These constants live in `apps/web/lib/seo/constants.ts`. Reading from env vars is overkill at this scale; hard-code with `NEXT_PUBLIC_SITE_URL` override option for local/preview deploys.

---

## File structure (additions)

```
apps/web/
├── app/
│   ├── layout.tsx                        (modify — lang, metadata template, org schema)
│   ├── sitemap.ts                        NEW
│   ├── robots.ts                         NEW
│   ├── manifest.ts                       NEW
│   ├── not-found.tsx                     NEW
│   ├── opengraph-image.tsx               NEW (branded fallback OG)
│   ├── about/page.tsx                    NEW
│   ├── sites/page.tsx                    NEW (index of all tracked sites)
│   ├── sites/[siteId]/page.tsx           (modify — full metadata + schemas)
│   ├── sites/[siteId]/opengraph-image.tsx NEW
│   ├── leaderboard/page.tsx              (modify — metadata + Dataset schema)
│   ├── methodology/page.tsx              (modify — metadata + Article schema)
│   ├── janta-darbar/page.tsx             (modify — metadata + ItemList schema)
│   ├── departments/page.tsx              (modify — metadata)
│   ├── press/page.tsx                    (modify — metadata)
│   ├── contact/page.tsx                  (modify — metadata)
│   ├── donate/page.tsx                   (modify — metadata + DonateAction schema)
│   ├── privacy/page.tsx                  (modify — metadata)
│   └── delete-my-data/page.tsx           (modify — metadata, noindex)
├── components/
│   └── JsonLd.tsx                        NEW (server component wrapper)
├── lib/
│   └── seo/
│       ├── constants.ts                  NEW
│       ├── metadata.ts                   NEW (shared builders)
│       └── schema.ts                     NEW (JSON-LD builders)
├── public/
│   └── llms.txt                          NEW
└── package.json                          (modify — add schema-dts)
```

---

## Task 1 — SEO module scaffolding + root layout

**Files:**
- Create: `apps/web/lib/seo/constants.ts`, `apps/web/lib/seo/metadata.ts`, `apps/web/lib/seo/schema.ts`, `apps/web/components/JsonLd.tsx`
- Modify: `apps/web/app/layout.tsx`, `apps/web/package.json`

This task lays the foundation everything else depends on. Get types and helpers right here; subsequent tasks are mostly applying them.

- [ ] **Step 1: Add `schema-dts` dependency**

```bash
cd apps/web && npm install --save-dev schema-dts
```

Verify it shows under `devDependencies` in `apps/web/package.json` (it's types-only — devDep is correct).

- [ ] **Step 2: Create `apps/web/lib/seo/constants.ts`**

Export hard-coded constants (see "Constants & site config" section above). Allow override via `process.env.NEXT_PUBLIC_SITE_URL` for the base URL only — everything else stays in code. Example shape:

```typescript
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://downtimebhavan.in';
export const BRAND_NAME = 'Downtime Bhavan';
export const BRAND_HI = 'डाउनटाइम भवन';
// ... etc
```

- [ ] **Step 3: Create `apps/web/lib/seo/metadata.ts`**

Export a `buildMetadata({ title, description, path, image?, type?, noindex? })` helper that returns a fully-populated `Metadata` object: `title`, `description`, `alternates.canonical`, `openGraph` (locale `en_IN`, type, url, siteName, images), `twitter` (`summary_large_image`), `robots`. Default `type` to `'website'`. Default OG image to root `/opengraph-image` (Next will resolve to the fallback OG generator); allow override for per-site dynamic OG.

Title rule: when given a fragment, return it as the title; the root layout sets the template `%s · Downtime Bhavan` so child pages just pass the fragment. Home page passes `default` instead via the layout's `title.default`.

- [ ] **Step 4: Create `apps/web/lib/seo/schema.ts`**

Export typed builders using `schema-dts` types:
- `buildOrganizationSchema()` → `Organization` with `name`, `alternateName: BRAND_HI`, `url`, `logo`, `description`, `disambiguatingDescription: ORG_LEGAL_NOTE`, `foundingDate`, `areaServed: { Country, "India" }`, `sameAs: [SOCIAL_X, SOCIAL_GITHUB, WIKIDATA_QID]` (filter out empty strings).
- `buildWebSiteSchema()` → `WebSite` with `name`, `url`, `inLanguage: "en-IN"`, optionally `potentialAction: SearchAction` (only if a public search exists — skip for now).
- `buildBreadcrumbSchema(items: { name: string; url: string }[])` → `BreadcrumbList`.
- `buildPersonSchema({ name, url, image?, sameAs? })` → `Person`.
- `buildDatasetSchema({ name, description, url, distribution? })` → `Dataset`.
- `buildArticleSchema({ headline, url, datePublished, dateModified?, author?, image? })` → `Article`.
- `buildAboutPageSchema({ url, name, description })` → `AboutPage`.
- `buildDonateActionSchema({ recipient: Organization })` → `DonateAction`.
- `buildItemListSchema({ items: { url: string; name: string }[] })` → `ItemList`.

All return strict-typed `WithContext<T>` objects (`{ "@context": "https://schema.org", ...rest }`).

- [ ] **Step 5: Create `apps/web/components/JsonLd.tsx`**

Server component that takes a `data` prop (object) and renders:

```tsx
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
```

JSON.stringify must escape `<` and `&` properly; if the linter complains, use a small replace step (`.replace(/</g, '\\u003c')`).

- [ ] **Step 6: Update root `apps/web/app/layout.tsx`**

Required changes:
1. Change `<html lang="en">` to `<html lang="en-IN">`.
2. Replace the current minimal `export const metadata` with a full `Metadata` object:
   - `metadataBase: new URL(SITE_URL)`
   - `title: { default: 'Downtime Bhavan · An unofficial observatory of Indian government websites', template: '%s · Downtime Bhavan' }`
   - `description: "Live status, 30-day uptime, and citizen grievances for India's most-used government websites. Free WhatsApp alerts when a portal comes back up. Unofficial observatory."`
   - `alternates: { canonical: '/' }` — overridden per route
   - `openGraph: { siteName: BRAND_NAME, locale: 'en_IN', type: 'website', url: SITE_URL }`
   - `twitter: { card: 'summary_large_image' }`
   - `robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } }`
   - `icons: { icon: '/favicon.ico', apple: '/apple-icon.png' }` (icon files may not exist yet; do not fail build if missing — Next handles gracefully)
   - `manifest: '/manifest.webmanifest'` (Next 15 default path for `manifest.ts` output)
   - `category: 'technology'`
3. In the `<body>`, render a top-level `<JsonLd>` with `[buildOrganizationSchema(), buildWebSiteSchema()]` (array — Google accepts a single script with an array of @graph or two separate scripts; use array form).

- [ ] **Step 7: Verify build still passes**

Run `npm run build` (or whatever the project's build command is) from repo root. Fix any TypeScript errors. The `schema-dts` types are strict; expect to need a couple of `as const` annotations.

### Self-review checklist (Task 1)

- [ ] `<html lang="en-IN">` confirmed
- [ ] Root `metadata.title.template` works: dynamically rendering a child page that exports `title: 'X'` produces `<title>X · Downtime Bhavan</title>` in the SSR output
- [ ] `Organization` JSON-LD validates at https://validator.schema.org/
- [ ] `WebSite` JSON-LD validates
- [ ] No console errors / hydration warnings on `/`

---

## Task 2 — sitemap.ts + robots.ts

**Files:** Create `apps/web/app/sitemap.ts`, `apps/web/app/robots.ts`

These two are paired because they reference each other (robots.txt links to sitemap.xml).

- [ ] **Step 1: Create `apps/web/app/sitemap.ts`**

```typescript
import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo/constants';
import { getDb } from '@/lib/db';
import { schema } from '@dtb/db';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export default function sitemap(): MetadataRoute.Sitemap {
  const db = getDb();
  const sites = db
    .select({ id: schema.sites.id })
    .from(schema.sites)
    .where(eq(schema.sites.enabled, true))
    .all();

  const now = new Date();
  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`,             changeFrequency: 'hourly',  priority: 1.0, lastModified: now },
    { url: `${SITE_URL}/sites`,        changeFrequency: 'hourly',  priority: 0.9, lastModified: now },
    { url: `${SITE_URL}/leaderboard`,  changeFrequency: 'daily',   priority: 0.9, lastModified: now },
    { url: `${SITE_URL}/janta-darbar`, changeFrequency: 'hourly',  priority: 0.8, lastModified: now },
    { url: `${SITE_URL}/methodology`,  changeFrequency: 'monthly', priority: 0.7, lastModified: now },
    { url: `${SITE_URL}/about`,        changeFrequency: 'monthly', priority: 0.6, lastModified: now },
    { url: `${SITE_URL}/press`,        changeFrequency: 'monthly', priority: 0.5, lastModified: now },
    { url: `${SITE_URL}/contact`,      changeFrequency: 'yearly',  priority: 0.3, lastModified: now },
    { url: `${SITE_URL}/donate`,       changeFrequency: 'monthly', priority: 0.5, lastModified: now },
    { url: `${SITE_URL}/departments`,  changeFrequency: 'daily',   priority: 0.4, lastModified: now },
    { url: `${SITE_URL}/privacy`,      changeFrequency: 'yearly',  priority: 0.2, lastModified: now },
    // EXCLUDED: /admin/*, /api/*, /delete-my-data
  ];

  const siteEntries: MetadataRoute.Sitemap = sites.map((s) => ({
    url: `${SITE_URL}/sites/${s.id}`,
    changeFrequency: 'hourly' as const,
    priority: 0.8,
    lastModified: now,
  }));

  return [...staticEntries, ...siteEntries];
}
```

Notes: `delete-my-data` is excluded (process page, not content). `/admin/*` and `/api/*` excluded (gated/non-content). All sitemap URLs must return 200 — the `/sites` index and `/about` are added in Tasks 7 and 8; **sitemap will be wrong until those exist**. Sequence: complete Tasks 7 and 8 before deploying this sitemap.

- [ ] **Step 2: Create `apps/web/app/robots.ts`**

```typescript
import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo/constants';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/api/public/'],
        disallow: [
          '/admin',
          '/admin/',
          '/api/admin',
          '/api/admin/',
          '/api/notify/',
          '/api/webhook',
          '/api/webhook/',
          '/delete-my-data',
        ],
      },
      // Explicitly allow AI crawlers — see strategy doc, GEO is a primary KPI
      { userAgent: 'GPTBot',        allow: '/' },
      { userAgent: 'PerplexityBot', allow: '/' },
      { userAgent: 'Google-Extended', allow: '/' },
      { userAgent: 'ClaudeBot',     allow: '/' },
      { userAgent: 'CCBot',         allow: '/' },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
```

- [ ] **Step 3: Manual smoke test**

After deploying, `curl https://downtimebhavan.in/robots.txt` and `curl https://downtimebhavan.in/sitemap.xml` should both return valid output. The dev server (`npm run dev`) suffices for testing locally — visit `http://localhost:3000/robots.txt` and `/sitemap.xml`.

### Self-review checklist (Task 2)

- [ ] `/robots.txt` includes `Sitemap: https://downtimebhavan.in/sitemap.xml`
- [ ] `/robots.txt` disallows `/admin*` and `/api/admin*`
- [ ] `/sitemap.xml` lists all static routes + dynamic site routes from DB
- [ ] No 5xx errors when generating
- [ ] Note: `/sites` and `/about` are listed but their pages don't exist yet — fix when Tasks 7 + 8 land (don't deploy this task without those, or sitemap returns 200 for routes that 404)

---

## Task 3 — manifest.ts + llms.txt + not-found.tsx

**Files:**
- Create: `apps/web/app/manifest.ts`, `apps/web/public/llms.txt`, `apps/web/app/not-found.tsx`

Small grab-bag task — all three are quick standalone files.

- [ ] **Step 1: Create `apps/web/app/manifest.ts`**

```typescript
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Downtime Bhavan',
    short_name: 'Downtime Bhavan',
    description: "Live status of India's most-used government websites.",
    start_url: '/',
    display: 'standalone',
    background_color: '#F7F9FC',
    theme_color: '#1E3A8A',
    lang: 'en-IN',
    orientation: 'portrait',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    categories: ['utilities', 'news'],
  };
}
```

Note: `icon-192.png` and `icon-512.png` need to exist at `apps/web/public/`. If they don't, leave the icons array empty for this task — the user will add icons separately. The manifest still validates.

- [ ] **Step 2: Create `apps/web/public/llms.txt`**

Copy verbatim from `docs/seo/SITE-STRUCTURE.md`'s "llms.txt (proposed)" section, but only include sites currently enabled in the DB. For each disabled (placeholder) site, omit it from the bullet list — don't link to a 404.

Currently only `aadhaar-ssup` exists, so the per-portal list will have only that entry until Plan 2 expands the site set. The narrative section can still mention the full target list (Aadhaar, EPFO, GST, etc.) since that's accurate intent.

- [ ] **Step 3: Create `apps/web/app/not-found.tsx`**

A branded 404 page that uses the same `PageHeader` + `Tricolor` + `PageFooter` shell. Export `generateMetadata` returning `{ title: 'Page not found', robots: { index: false, follow: true } }`.

Content suggestion (deadpan voice):
> # Page not found
> This page is not available — possibly never was. The unofficial observatory does not track this URL.
> 
> [Return to status →](/) · [Browse all tracked portals →](/sites)

Keep the voice quiet; don't make 404 a comedy beat (per voice rules).

### Self-review checklist (Task 3)

- [ ] `/manifest.webmanifest` returns valid JSON
- [ ] `/llms.txt` is plain text, lists only enabled sites
- [ ] `/not-found` (any 404) renders with PageShell, has `noindex`

---

## Task 4 — Per-route generateMetadata across existing public routes

**Files:** Modify every page in:
- `apps/web/app/page.tsx` (home — special case, uses `default` from layout)
- `apps/web/app/sites/[siteId]/page.tsx`
- `apps/web/app/leaderboard/page.tsx`
- `apps/web/app/janta-darbar/page.tsx`
- `apps/web/app/methodology/page.tsx`
- `apps/web/app/departments/page.tsx`
- `apps/web/app/press/page.tsx`
- `apps/web/app/contact/page.tsx`
- `apps/web/app/donate/page.tsx`
- `apps/web/app/privacy/page.tsx`
- `apps/web/app/delete-my-data/page.tsx`

Use the `buildMetadata` helper from Task 1. Each page exports either a static `metadata` or an async `generateMetadata`. Apply the title patterns from `docs/seo/SITE-STRUCTURE.md` § "Title patterns by route".

- [ ] **Step 1: Home (`app/page.tsx`)**

No `metadata` export needed — root layout's `title.default` handles it. Verify the title renders correctly in dev.

- [ ] **Step 2: `/sites/[siteId]/page.tsx`**

Replace the existing minimal `generateMetadata` with:

```typescript
export async function generateMetadata({ params }: { params: Promise<{ siteId: string }> }): Promise<Metadata> {
  const { siteId } = await params;
  const db = getDb();
  const site = db.select().from(schema.sites).where(eq(schema.sites.id, siteId)).get();
  if (!site) return { title: 'Site not found' };
  return buildMetadata({
    title: `${site.name} status · is ${site.name} down right now?`,
    description: `Live status, 30-day uptime, and recent citizen grievances for ${site.name}. Free WhatsApp alert when it recovers.`,
    path: `/sites/${siteId}`,
    type: 'website',
  });
}
```

Title length check: `${site.name}` can be long (e.g., "Aadhaar Self-Service Update Portal"). If the constructed title exceeds 60 chars, fall back to `${site.name} status · Downtime Bhavan` — but the template already adds `· Downtime Bhavan` so prefer just `${site.name} status` as the fragment in those cases. Implement length check inline.

- [ ] **Step 3: `/leaderboard/page.tsx`**

```typescript
export const metadata = buildMetadata({
  title: 'Indian government website uptime · 30-day leaderboard',
  description: 'Ranked 30-day uptime of the Indian government websites tracked by Downtime Bhavan. Updated continuously from an Indian VPS.',
  path: '/leaderboard',
});
```

- [ ] **Step 4: `/janta-darbar/page.tsx`**

```typescript
export const metadata = buildMetadata({
  title: 'Janta Darbar · citizen grievances against Indian government websites',
  description: 'Live citizen grievances against India\'s government portals — tagged, time-stamped, and anonymous. The public-pulse layer of Downtime Bhavan.',
  path: '/janta-darbar',
});
```

- [ ] **Step 5: `/methodology/page.tsx`**

```typescript
export const metadata = buildMetadata({
  title: 'Methodology · how Downtime Bhavan detects government website downtime',
  description: 'Hybrid HTTP and headless browser checks from an Indian VPS. Definitions of Working, Degraded, and Down. False-positive policy and detection cadence.',
  path: '/methodology',
});
```

- [ ] **Step 6: `/departments/page.tsx`**

```typescript
export const metadata = buildMetadata({
  title: 'Departments · Indian government websites grouped by ministry',
  description: 'Browse tracked Indian government websites grouped by department. Live status and 30-day uptime per portal.',
  path: '/departments',
});
```

- [ ] **Step 7: `/press/page.tsx`**

```typescript
export const metadata = buildMetadata({
  title: 'Press kit · Downtime Bhavan brand assets and data for journalists',
  description: 'Brand assets, sample data, and contact details for journalists, researchers, and civic-tech reporters covering Indian government website reliability.',
  path: '/press',
});
```

- [ ] **Step 8: `/contact/page.tsx`**

```typescript
export const metadata = buildMetadata({
  title: 'Contact · Downtime Bhavan',
  description: 'Contact the unofficial observatory of Indian government websites.',
  path: '/contact',
});
```

- [ ] **Step 9: `/donate/page.tsx`**

```typescript
export const metadata = buildMetadata({
  title: 'Donate · keep the unofficial observatory free for citizens',
  description: 'Downtime Bhavan runs on donations. UPI for Indian donors. Funds keep WhatsApp alerts free as the subscriber base grows.',
  path: '/donate',
});
```

- [ ] **Step 10: `/privacy/page.tsx`**

```typescript
export const metadata = buildMetadata({
  title: 'Privacy policy',
  description: 'How Downtime Bhavan handles your data. Phone numbers used only for WhatsApp alerts. No tracking, no third-party ads.',
  path: '/privacy',
});
```

- [ ] **Step 11: `/delete-my-data/page.tsx`**

```typescript
export const metadata = buildMetadata({
  title: 'Delete my data',
  description: 'Remove your phone number and alert preferences from Downtime Bhavan.',
  path: '/delete-my-data',
  noindex: true,  // process page; don't index
});
```

`buildMetadata` from Task 1 must accept a `noindex` boolean and override `robots.index = false` when true.

### Self-review checklist (Task 4)

- [ ] Every public route has a unique title and description
- [ ] All titles are 30–60 chars after the `· Downtime Bhavan` suffix is appended (template-aware)
- [ ] All descriptions are 120–160 chars
- [ ] Each page has `alternates.canonical` set correctly
- [ ] `/delete-my-data` has `noindex` in robots meta
- [ ] No duplicate title or description across pages
- [ ] Build still passes; no TS errors

---

## Task 5 — OG image generators

**Files:**
- Create: `apps/web/app/opengraph-image.tsx` (branded fallback)
- Create: `apps/web/app/sites/[siteId]/opengraph-image.tsx` (per-site dynamic)

Both use Next.js's `ImageResponse` from `next/og`. 1200×630 px. Edge runtime.

- [ ] **Step 1: Branded fallback `apps/web/app/opengraph-image.tsx`**

Design:
- Background: `#F7F9FC` (paper)
- Tricolor strip at top: saffron / white / green band, 12 px tall total
- Centered Ashoka-chakra-inspired SVG mark at 6% opacity, large (~400 px)
- Top-left: small "DOWNTIME BHAVAN" wordmark in navy (`#1E3A8A`)
- Center-left: large title "An unofficial observatory" in Plus Jakarta Sans 700, navy
- Center-left: subtitle "of Indian government websites" in `#475569`
- Bottom-left: small `downtimebhavan.in` in `#94A3B8`
- Bottom-right: small "live · WhatsApp alerts · ₹0" pill row

Export:

```typescript
export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Downtime Bhavan — an unofficial observatory of Indian government websites';

export default async function Image() {
  return new ImageResponse(
    (
      <div style={{ /* ... layout per design above ... */ }}>
        {/* ... */}
      </div>
    ),
    { ...size }
  );
}
```

Avoid loading Plus Jakarta Sans for the OG — use the system Inter fallback inline; the ImageResponse renderer can't reliably load Google Fonts at edge without bundling. Acceptable trade-off; OG image fonts don't need brand-typography purity.

- [ ] **Step 2: Per-site dynamic `apps/web/app/sites/[siteId]/opengraph-image.tsx`**

Design:
- Same background + tricolor strip + chakra backdrop
- Center: site name (large), status dot + state word (Working / Degraded / Down) in sober color
- Below: "30-day uptime: NN.N%" if known, else "Tracking started recently"
- Footer: small `downtimebhavan.in/sites/[id]` URL

Reads DB at render time:

```typescript
export const runtime = 'nodejs'; // need DB access
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { siteId: string } }) {
  const db = getDb();
  const site = db.select().from(schema.sites).where(eq(schema.sites.id, params.siteId)).get();
  if (!site) {
    // Fall back to brand image
    // ... render fallback ...
  }
  const status = db.select().from(schema.siteStatus).where(eq(schema.siteStatus.siteId, params.siteId)).get();
  // ... render with status + uptime ...
}
```

Critical: cannot use `runtime = 'edge'` here because Drizzle + better-sqlite3 are Node-only. Use `runtime = 'nodejs'`. Caching: Next.js caches OG images by URL; the site detail OG can use `revalidate = 300` (5 min) to keep status fresh without hammering the DB.

### Self-review checklist (Task 5)

- [ ] `https://downtimebhavan.in/opengraph-image` returns a 1200x630 PNG
- [ ] `https://downtimebhavan.in/sites/aadhaar-ssup/opengraph-image` returns a 1200x630 PNG with site name + status
- [ ] X / LinkedIn / WhatsApp link previews show the correct image (test via X card validator, https://cards-dev.twitter.com/validator)
- [ ] If a site doesn't exist, OG falls back gracefully (no 500)

---

## Task 6 — Per-page JSON-LD schemas

**Files:** Modify pages to render `<JsonLd>` components with appropriate schema:
- `apps/web/app/sites/[siteId]/page.tsx` → `WebPage` + `BreadcrumbList` + `Service` + `Dataset` (uptime data)
- `apps/web/app/leaderboard/page.tsx` → `WebPage` + `BreadcrumbList` + `Dataset` + `ItemList`
- `apps/web/app/methodology/page.tsx` → `WebPage` + `BreadcrumbList` + `Article`
- `apps/web/app/janta-darbar/page.tsx` → `WebPage` + `BreadcrumbList` + `ItemList`
- `apps/web/app/about/page.tsx` (Task 7) → `WebPage` + `AboutPage` + `Person`
- `apps/web/app/donate/page.tsx` → `WebPage` + `DonateAction`
- `apps/web/app/sites/page.tsx` (Task 8) → `WebPage` + `ItemList`

- [ ] **Step 1: `/sites/[siteId]`**

After data is fetched (the page already does this), render:

```tsx
<JsonLd data={[
  buildBreadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: 'Sites', url: `${SITE_URL}/sites` },
    { name: site.name, url: `${SITE_URL}/sites/${site.id}` },
  ]),
  // Service representing the government portal being tracked
  {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: site.name,
    url: site.url,
    serviceType: 'Government online service',
    provider: { '@type': 'GovernmentOrganization', name: site.name },
  },
  // Dataset representing the uptime tracking data
  buildDatasetSchema({
    name: `${site.name} uptime — 30 day rolling`,
    description: `30-day rolling uptime percentage for ${site.name} as measured by Downtime Bhavan from an Indian VPS.`,
    url: `${SITE_URL}/sites/${site.id}`,
  }),
]} />
```

- [ ] **Step 2: `/leaderboard`**

```tsx
<JsonLd data={[
  buildBreadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: 'Leaderboard', url: `${SITE_URL}/leaderboard` },
  ]),
  buildDatasetSchema({
    name: 'Indian government website uptime — 30 day rolling',
    description: 'Ranked 30-day uptime for the Indian government websites tracked by Downtime Bhavan.',
    url: `${SITE_URL}/leaderboard`,
    // distribution: future — point to /api/public/uptime.json once it exists (Phase 2)
  }),
  buildItemListSchema({
    items: rankedSites.map((s, i) => ({
      url: `${SITE_URL}/sites/${s.id}`,
      name: s.name,
    })),
  }),
]} />
```

- [ ] **Step 3: `/methodology`**

```tsx
<JsonLd data={[
  buildBreadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: 'Methodology', url: `${SITE_URL}/methodology` },
  ]),
  buildArticleSchema({
    headline: 'How Downtime Bhavan detects government website downtime',
    url: `${SITE_URL}/methodology`,
    datePublished: '2026-05-28T00:00:00+05:30',
    dateModified: new Date().toISOString(),
  }),
]} />
```

- [ ] **Step 4: `/janta-darbar`**

```tsx
<JsonLd data={[
  buildBreadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: 'Janta Darbar', url: `${SITE_URL}/janta-darbar` },
  ]),
  // Note: do NOT use Review schema for citizen grievances — that's a different intent.
  buildItemListSchema({
    items: recentGrievances.slice(0, 10).map((g) => ({
      url: `${SITE_URL}/sites/${g.siteId}`,
      name: `${g.tag} — ${g.body.slice(0, 60)}`,
    })),
  }),
]} />
```

- [ ] **Step 5: `/donate`**

```tsx
<JsonLd data={[
  {
    '@context': 'https://schema.org',
    '@type': 'DonateAction',
    recipient: buildOrganizationSchema(),
  },
]} />
```

### Self-review checklist (Task 6)

- [ ] Every schema validates at https://validator.schema.org/
- [ ] No duplicate `Organization`/`WebSite` schemas (those live only in root layout)
- [ ] Server-rendered (visible in `view-source`, not just hydrated client-side)
- [ ] Google's Rich Results Test passes for at least one site-detail page and the leaderboard

---

## Task 7 — /about page

**Files:** Create `apps/web/app/about/page.tsx`

The strategy doc requires a named-operator About page for E-E-A-T. Content can be lean for v1 — the SEO/schema win is the named entity, not the prose volume.

- [ ] **Step 1: Create the page**

Use `PageShell` (same as link pages from Plan 4). Content sections:

1. **Heading**: "About Downtime Bhavan"
2. **Mission paragraph**: 2 sentences. "Downtime Bhavan is an independent civic project that tracks the live status, 30-day uptime, and citizen-reported grievances against India's most-used government websites. We are not affiliated with the Government of India or any government body."
3. **What we do**: Bulleted list — live monitoring from an Indian VPS, hybrid HTTP + headless detection, free WhatsApp alerts, public grievance stream.
4. **Who runs this**: Named operator (placeholder for now — the deployer fills in). Photo, one-paragraph bio, links to LinkedIn / GitHub / X.
5. **Funding**: One sentence + link to `/donate`. "Downtime Bhavan is donation-funded. Operating cost: ₹0 to citizens. UPI accepted."
6. **Trust & corrections**: "If our data is wrong, write to corrections@downtimebhavan.in. We publish corrections publicly within 48 hours."
7. **Contact**: Link to `/contact`.

Voice: civic, sober, slightly warm. Hindi micro-touch acceptable (e.g., "An unofficial observatory · एक अनौपचारिक वेधशाला" as a subhead).

- [ ] **Step 2: Add metadata + schema**

```typescript
export const metadata = buildMetadata({
  title: 'About · the unofficial observatory of Sarkari uptime',
  description: 'Downtime Bhavan is an independent civic project tracking Indian government website reliability. Not affiliated with any government body.',
  path: '/about',
});
```

JSON-LD:
```tsx
<JsonLd data={[
  buildBreadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: 'About', url: `${SITE_URL}/about` },
  ]),
  buildAboutPageSchema({
    url: `${SITE_URL}/about`,
    name: 'About Downtime Bhavan',
    description: '...',
  }),
  buildPersonSchema({
    name: OPERATOR_NAME, // from constants
    url: `${SITE_URL}/about`,
    sameAs: [SOCIAL_X, SOCIAL_GITHUB].filter(Boolean),
  }),
]} />
```

- [ ] **Step 3: Footer link**

Add `/about` to the footer in `apps/web/components/PageFooter.tsx` if not already present. Verify on `/`.

### Self-review checklist (Task 7)

- [ ] `/about` renders, links from footer
- [ ] Named operator visible (even if placeholder)
- [ ] `Person` schema validates
- [ ] `AboutPage` schema validates
- [ ] Hindi micro-touch present (one phrase, restrained)

---

## Task 8 — /sites index page

**Files:** Create `apps/web/app/sites/page.tsx`

The strategy doc's URL hierarchy lists `/sites` as the canonical index of all tracked sites. Currently only `/sites/[siteId]` exists. The sitemap references `/sites`; this task makes it real.

- [ ] **Step 1: Create the page**

A simple index — heading, brief intro, and a list of all enabled sites with current state + 30d uptime + link to detail.

```tsx
export const dynamic = 'force-dynamic';

export const metadata = buildMetadata({
  title: 'Tracked Indian government websites · Downtime Bhavan',
  description: 'All Indian government websites currently tracked by Downtime Bhavan, with live status and 30-day uptime.',
  path: '/sites',
});

export default async function Page() {
  const db = getDb();
  const sites = db.select({
    id: schema.sites.id,
    name: schema.sites.name,
    url: schema.sites.url,
  }).from(schema.sites).where(eq(schema.sites.enabled, true)).all();
  
  const statuses = db.select().from(schema.siteStatus).all();
  const statusMap = new Map(statuses.map(s => [s.siteId, s]));

  return (
    <PageShell active="status">
      {/* heading, intro paragraph, list of sites with status pills */}
    </PageShell>
  );
}
```

JSON-LD:
```tsx
<JsonLd data={[
  buildBreadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: 'Sites', url: `${SITE_URL}/sites` },
  ]),
  buildItemListSchema({
    items: sites.map((s) => ({
      url: `${SITE_URL}/sites/${s.id}`,
      name: s.name,
    })),
  }),
]} />
```

Visually, reuse styles from `DepartmentStatusPanel` or the leaderboard rows — same dot+name+state pattern. Don't reinvent.

- [ ] **Step 2: Wire into nav**

This is *not* a primary nav item (the homepage already shows live status). It's a deep-link entry for SEO + crawlers + the sitemap. Adding to footer is sufficient (alongside `/about`, `/leaderboard`, etc.). Don't add to top nav.

### Self-review checklist (Task 8)

- [ ] `/sites` renders with at least the 1 enabled site
- [ ] Each site row links to `/sites/[id]`
- [ ] Page shows current state and 30d uptime
- [ ] Schema validates
- [ ] Footer link added

---

## Task 9 — CWV verification + final smoke test

**Files:** None modified — measurement task. Produce a short report.

- [ ] **Step 1: Run Lighthouse on the deployed site (or `npm run start` locally) for**:
  - `/`
  - `/sites/aadhaar-ssup`
  - `/leaderboard`
  - `/janta-darbar`
  - `/methodology`
  - `/about` (after Task 7)
  - `/sites` (after Task 8)

Mobile profile, slow-4G throttling.

- [ ] **Step 2: Confirm**:
  - LCP < 2.5s on every page
  - INP < 200ms
  - CLS < 0.1
  - No accessibility violations (Lighthouse a11y score ≥ 95)
  - All structured data validates via Google's Rich Results Test

- [ ] **Step 3: Confirm at SERP-validation tools**:
  - https://validator.schema.org/ — paste a `/sites/[id]` page source, verify all schemas parse
  - https://cards-dev.twitter.com/validator — verify Twitter card on a `/sites/[id]` page
  - https://developers.facebook.com/tools/debug/ — verify OG image renders correctly

- [ ] **Step 4: Submit to GSC + BWT**

Manual (ops) steps — owner runs these:
  1. Verify property at https://search.google.com/search-console (DNS TXT — DNS is on Cloudflare)
  2. Submit sitemap: `https://downtimebhavan.in/sitemap.xml`
  3. Verify property at https://www.bing.com/webmasters
  4. Submit sitemap there too
  5. Request indexing on `/`, `/leaderboard`, `/methodology`, `/about` (5–10 URL quota)

These are user actions — the implementer task is to document the URLs/steps in this checklist; the user runs them.

- [ ] **Step 5: Produce a final report**

Write `docs/seo/PHASE-1-COMPLETION-REPORT.md` covering:
  - Lighthouse scores per page
  - Schema validation status per page
  - List of any deviations from the plan and why
  - Open items (icons not yet created, real OPERATOR_NAME not yet set, etc.)

### Self-review checklist (Task 9)

- [ ] Lighthouse mobile passes on all priority routes
- [ ] All schemas validate
- [ ] Twitter + Facebook previews render correctly
- [ ] Report committed at `docs/seo/PHASE-1-COMPLETION-REPORT.md`

---

## Sequencing

Strict dependencies:
- Task 1 must complete first (everything else uses the helpers it creates).
- Tasks 2 and 3 depend on Task 1 (use constants).
- Task 7 (/about) and Task 8 (/sites) must complete before Task 2's sitemap deploys, or sitemap will 404 on listed routes.
- Tasks 4 and 6 depend on Task 1.
- Task 5 (OG images) depends on Task 1 (uses constants).
- Task 9 is last — verifies everything.

Parallelizable groups:
- After Task 1: Tasks 3 (manifest+llms+404), 5 (OG images), 7 (/about) can run in parallel (different files).
- Tasks 4 + 6 should be sequential or carefully coordinated since both touch the same page files.
- Task 8 (/sites) can run in parallel with Task 7 (different file).
- Task 2 (sitemap+robots) runs after Tasks 7 + 8 complete (so sitemap doesn't list missing routes).

Recommended execution order: 1 → (3, 5, 7, 8 in parallel) → 4 → 6 → 2 → 9.

---

## Out-of-scope / explicit non-goals

- **Per-site evergreen content (600+ unique words per portal)** — Track B / Plan 9.
- **Methodology page rewrite** — Track B.
- **Press kit page rewrite** — Track B.
- **Daily Downtime route scaffolding (`/daily/...`)** — defer to content-engine plan.
- **Reports route scaffolding (`/reports/...`)** — defer.
- **Public data endpoint `/api/public/uptime.json`** — Phase 2.
- **Real-named operator on `/about`** — placeholder for now; owner replaces when ready.
- **Icon assets (`icon-192.png`, `icon-512.png`, favicon.ico, apple-icon.png)** — owner provides; manifest+layout reference them gracefully if missing.
- **Wikidata entity, GitHub repo, social profile setup** — Track C.
- **GSC + BWT verification** — owner-only ops step in Task 9.

---

## Completion criteria

- [ ] All 9 tasks' self-review checklists pass
- [ ] Build is green; no TypeScript errors
- [ ] All routes in `sitemap.xml` return 200
- [ ] Lighthouse mobile passes CWV thresholds on priority routes
- [ ] At least one site-detail page passes Google's Rich Results Test
- [ ] `docs/seo/PHASE-1-COMPLETION-REPORT.md` committed
- [ ] Tag release as `v1.1.0-seo-foundation` (or whatever fits the project's versioning convention)
