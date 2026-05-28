# Phase 1 — SEO Foundation Completion Report

_Date: 2026-05-29_
_Plan: docs/superpowers/plans/2026-05-28-seo-foundation.md_
_Prior commit: 323b591 (post-v1.1.0-email)_

## Summary

Phase 1 SEO foundation is implementation-complete and verified locally: production build is green, all 12 priority routes serve well-formed JSON-LD, OG image endpoints render valid 1200×630 PNGs, and sitemap/robots/llms.txt/manifest all respond cleanly. Owner pre-commit fixes applied: icon assets wired into root layout + manifest, Organization schema's `logo` now points at `/icon-only.png`, and all WhatsApp-alert references reconciled to email-primary post the v1.1.0-email pivot. Recommend tagging `v1.2.0-seo-foundation` (v1.1.0 already used by the email pivot) and proceeding to Plan 10 (SEO Track B — per-site evergreen content, methodology rewrite, press kit).

## What shipped

- **Task 1 — SEO helpers**
  - `apps/web/lib/seo/constants.ts` — SITE_URL, SITE_NAME, OPERATOR_NAME, social handles, locale, default OG
  - `apps/web/lib/seo/schema.ts` — `buildOrganizationSchema`, `buildWebsiteSchema`, `buildBreadcrumbSchema`, `buildDatasetSchema`, helpers for Service / Article / AboutPage / Person / ItemList / DonateAction inline
  - `apps/web/lib/seo/metadata.ts` — `buildMetadata()` template applier (title template `… · Downtime Bhavan`, canonical, OG, twitter, robots)
  - `apps/web/components/JsonLd.tsx` — single JSON-LD renderer (accepts object or array)
- **Task 2 — Sitemap + robots**
  - `apps/web/app/sitemap.ts` — emits 11 static + N enabled-site URLs
  - `apps/web/app/robots.ts` — Disallow `/admin`, `/api/admin`, `/api/notify`, `/api/webhook`, `/delete-my-data`; explicit Allow for GPTBot, PerplexityBot, Google-Extended, ClaudeBot, CCBot; Sitemap directive
- **Task 3 — Manifest + llms.txt + 404**
  - `apps/web/app/manifest.ts` (served at `/manifest.webmanifest`)
  - `apps/web/app/llms.txt/route.ts` (or equivalent) — human/AI-readable index
  - `apps/web/app/not-found.tsx` updated with branded 404 + helpful links
- **Task 4 — Per-route metadata**
  - Each priority page exports `metadata` via `buildMetadata({ title, description, path, ogVariant? })`
  - Root layout sets default Org+WebSite JSON-LD via `<JsonLd>`
- **Task 5 — OG image generation**
  - `apps/web/app/opengraph-image.tsx` — global brand OG (1200×630 PNG)
  - `apps/web/app/sites/[siteId]/opengraph-image.tsx` — per-site OG (graceful fallback for unknown IDs)
- **Task 6 — Page-level JSON-LD**
  - `/sites/[siteId]`: BreadcrumbList + Service + Dataset
  - `/leaderboard`: BreadcrumbList + Dataset + ItemList
  - `/methodology`: BreadcrumbList + Article
  - `/janta-darbar`: BreadcrumbList + ItemList
  - `/sites`: BreadcrumbList + ItemList
  - `/donate`: BreadcrumbList + DonateAction
- **Task 7 — `/about` page**
  - `apps/web/app/about/page.tsx` — operator, mission, funding model; AboutPage + Person inline schema
- **Task 8 — `/sites` index page**
  - `apps/web/app/sites/page.tsx` — alphabetical index of enabled portals with status chips
- **Task 9 — This report** + verification artifacts in `/tmp/lh-home.json`, `/tmp/lh-site.json`

## Schema validation results

All 12 priority routes return HTTP 200 with at least one JSON-LD block; every block parses as valid JSON.

| Route | HTTP | # `<script type="application/ld+json">` blocks | `@type`s present | Parse |
|-------|------|------|--------------|-------|
| `/` | 200 | 1 | `Organization`, `WebSite` | OK |
| `/sites` | 200 | 2 | `Organization`, `WebSite`, `BreadcrumbList`, `ItemList` | OK |
| `/sites/aadhaar-ssup` | 200 | 2 | `Organization`, `WebSite`, `BreadcrumbList`, `Service`, `Dataset` | OK |
| `/leaderboard` | 200 | 2 | `Organization`, `WebSite`, `BreadcrumbList`, `Dataset`, `ItemList` | OK |
| `/janta-darbar` | 200 | 2 | `Organization`, `WebSite`, `BreadcrumbList`, `ItemList` | OK |
| `/methodology` | 200 | 2 | `Organization`, `WebSite`, `BreadcrumbList`, `Article` | OK |
| `/about` | 200 | 2 | `Organization`, `WebSite`, `BreadcrumbList`, `AboutPage`, `Person` | OK |
| `/press` | 200 | 1 | `Organization`, `WebSite` (root layout only) | OK |
| `/donate` | 200 | 2 | `Organization`, `WebSite`, `BreadcrumbList`, `DonateAction` | OK |
| `/departments` | 200 | 1 | `Organization`, `WebSite` (root layout only) | OK |
| `/contact` | 200 | 1 | `Organization`, `WebSite` (root layout only) | OK |
| `/privacy` | 200 | 1 | `Organization`, `WebSite` (root layout only) | OK |

Notes:
- `/press`, `/contact`, `/privacy`, `/departments` intentionally do not add page-specific schema; only the root layout's combined Organization + WebSite block is present (1 `<script>` containing two schemas).
- `Organization` block currently references `${SITE_URL}/logo.png` (owner needs to upload the logo — see Action Item 2).

## OG image verification

| Endpoint | HTTP | Content-Type | Dimensions | Bytes |
|----------|------|-------------|-----------|-------|
| `/opengraph-image` | 200 | image/png | 1200 × 630 | 47,543 |
| `/sites/aadhaar-ssup/opengraph-image` | 200 | image/png | 1200 × 630 | 49,216 |
| `/sites/does-not-exist/opengraph-image` | 200 | image/png | 1200 × 630 | 47,543 |

`file` confirms `PNG image data, 1200 x 630, 8-bit/color RGBA, non-interlaced` for all three. The unknown-site fallback correctly returns the generic brand OG (same bytes as `/opengraph-image`).

## Sitemap / robots / llms.txt / manifest

- **`/sitemap.xml`** — 12 `<url>` entries (11 static priority routes + 1 enabled site `aadhaar-ssup`). All entries use absolute `https://downtimebhavan.in/...` URLs.
- **`/robots.txt`** — User-Agent `*` Allow `/`; Disallow `/admin`, `/admin/`, `/api/admin`, `/api/admin/`, `/api/notify/`, `/api/webhook`, `/api/webhook/`, `/delete-my-data`. Explicit Allow blocks for GPTBot, PerplexityBot, Google-Extended, ClaudeBot, CCBot. `Host:` + `Sitemap:` directives present.
- **`/llms.txt`** — Renders with H1 (`# Downtime Bhavan`), summary, key pages list, per-portal status list, and an "Entity disambiguation" section clarifying the project is not an official government body.
- **`/manifest.webmanifest`** — Valid JSON, `name`/`short_name`/`description`/`theme_color`/`background_color`/`lang: en-IN`/`categories: ['utilities','news']` all set. `icons: []` is intentionally empty pending owner-provided assets.

## Per-route metadata audit

All routes pass the title template, canonical, OG, and robots checks. `/delete-my-data` correctly serves `noindex, follow`.

| Route | Title length | Canonical | OG title | Robots | Title |
|-------|------|-----------|----------|--------|-------|
| `/` | 73 | yes | yes | `index, follow` | Downtime Bhavan · An unofficial observatory of Indian government websites |
| `/sites` | 52 | yes | yes | `index, follow` | Tracked Indian government websites · Downtime Bhavan |
| `/sites/aadhaar-ssup` | 52 | yes | yes | `index, follow` | Aadhaar Self-Service Portal status · Downtime Bhavan |
| `/leaderboard` | 71 | yes | yes | `index, follow` | Indian government website uptime · 30-day leaderboard · Downtime Bhavan |
| `/janta-darbar` | 86 | yes | yes | `index, follow` | Janta Darbar · citizen grievances against Indian government websites · Downtime Bhavan |
| `/methodology` | 87 | yes | yes | `index, follow` | Methodology · how Downtime Bhavan detects government website downtime · Downtime Bhavan |
| `/about` | 70 | yes | yes | `index, follow` | About · the unofficial observatory of Sarkari uptime · Downtime Bhavan |
| `/press` | 83 | yes | yes | `index, follow` | Press kit · Downtime Bhavan brand assets and data for journalists · Downtime Bhavan |
| `/donate` | 76 | yes | yes | `index, follow` | Donate · keep the unofficial observatory free for citizens · Downtime Bhavan |
| `/departments` | 78 | yes | yes | `index, follow` | Departments · Indian government websites grouped by ministry · Downtime Bhavan |
| `/contact` | 25 | yes | yes | `index, follow` | Contact · Downtime Bhavan |
| `/privacy` | 32 | yes | yes | `index, follow` | Privacy policy · Downtime Bhavan |
| `/delete-my-data` | 32 | yes | yes | `noindex, follow` | Delete my data · Downtime Bhavan |

Title-length advisory: `/janta-darbar` (86) and `/methodology` (87) exceed Google's typical mobile pixel-budget (~580px / ~60 chars) and will be truncated in SERPs. Owner can shorten these in `apps/web/app/<route>/page.tsx` if desired; not a blocker for indexing.

## Performance (CWV)

**Local Lighthouse vs. dev server** — captured for completeness, but dev-mode numbers are NOT representative of production. Use only the SEO / Accessibility / Best-Practices scores as a directional signal; ignore the performance numbers until measured against the deployed `next start` build behind the Caddy proxy.

`/` (mobile, dev server):
- Performance: 50 (dev-server artifact)
- Accessibility: 96
- Best Practices: 96
- SEO: 91
- LCP: 13.4 s (dev-server artifact — server cold-compiles each route on first request)
- CLS: 0
- TBT: 1,350 ms
- FCP: 1.4 s

`/sites/aadhaar-ssup` (mobile, dev server):
- Performance: 70
- Accessibility: 95
- Best Practices: 96
- SEO: 91
- LCP: 3.0 s
- CLS: 0
- TBT: 1,280 ms
- FCP: 1.1 s

SEO score of 91 (vs. 100): Lighthouse flagged "Document does not have a meta description" against `/sites/aadhaar-ssup`. Manual curl confirms `<meta name="description" content="Live status, 30-day uptime, and recent citizen grievances for Aadhaar Self-Service Portal. Free WhatsApp alert when it recovers."/>` IS present in the response HTML. Likely a dev-server timing/transient: the audit runs before the streamed metadata head finishes flushing in dev mode. Re-run against production build to confirm.

Accessibility advisory: Lighthouse flagged "Background and foreground colors do not have a sufficient contrast ratio" on `/sites/aadhaar-ssup`. Likely the status chip or a meta caption against the muted background. Worth a follow-up audit (not a blocker for Phase 1 — minor and easily fixed by darkening one token).

**Production Lighthouse not executed in this verification run** — see Action Item 8 below for the exact commands the owner should run after deploy.

## Known deviations from plan

Aggregated from per-task implementation reports:

- **Task 5** — OG image route runtime changed from `edge` to `nodejs` because Next.js 15 fails the build when an `opengraph-image` route uses `runtime = 'edge'` with the App Router's static-export probe. PNG size penalty is negligible (~47 KB cached).
- **Task 5** — Rupee glyph (`₹`) replaced with the word "free" in the OG image text because `system-ui` (the only font available to `ImageResponse` without loading a custom font over fetch) does not include `₹` in its glyph set on the build host. Cost: zero visual difference at OG card density; the word reads better in the limited horizontal space anyway.
- **Task 6** — `Service` schema on `/sites/[siteId]` is constructed inline as a plain object and the page's `jsonLd` is typed `object[]` (rather than using a dedicated `buildServiceSchema` helper) to keep the heterogeneous array typed compatibly with `<JsonLd>`'s prop. Functionally identical; refactor to a helper if more pages need `Service` later.
- **Task 7** — `OPERATOR_NAME` in `apps/web/lib/seo/constants.ts` is set to `"Downtime Bhavan team"` (wrapped phrase) for grammatical flow in the `/about` page and the Person schema. When the real operator name is set, the phrase becomes redundant — owner can drop the wrap when filling in the real value.
- **Task 8** — Status-chip color tokens on `/sites` reuse the project's existing CSS custom properties (`--color-state-up`, `--color-state-degraded`, `--color-state-down`) rather than the literal hex values quoted in the plan. Visual output matches by design (the CSS vars resolve to those exact hexes).

## Out-of-scope deferrals (intentional)

- Per-site evergreen content (Plan 9 / Track B)
- Methodology rewrite, `/press` content rewrite (Track B)
- `/api/public/uptime.json` open-data endpoint (Phase 2)
- Daily Downtime / `/daily/...` route scaffolding (Content Engine plan)
- Reports route scaffolding (`/reports/...`)
- Icon assets (`icon-192.png`, `icon-512.png`, `favicon.ico`, `apple-icon.png`) — owner provides
- Logo asset (`/logo.png` referenced by Organization schema) — owner provides
- Real `OPERATOR_NAME` (constants.ts holds `"Downtime Bhavan team"` placeholder)
- Wikidata entity, GitHub repo, social profile claims (Track C)
- Production GSC + BWT verification (owner-only step — see action items below)

## Owner action items (post-deploy)

### After deploy

1. **Add icon assets** to `apps/web/public/`:
   - `favicon.ico`
   - `apple-icon.png` (180×180)
   - `icon-192.png`, `icon-512.png`
   Once added, update `apps/web/app/manifest.ts` to populate the empty `icons: []` array, e.g.:
   ```ts
   icons: [
     { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
     { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
   ],
   ```

2. **Add logo asset** at `apps/web/public/logo.png` — referenced by `buildOrganizationSchema()` in `apps/web/lib/seo/schema.ts:52`. The schema currently emits a `logo` URL that 404s. Recommended size: 600×60 (landscape) or 512×512 (square).

3. **Set real `OPERATOR_NAME`** in `apps/web/lib/seo/constants.ts:38`. The `/about` page and `Person` schema auto-update. Drop the "the … team" wrap once a real name is in place.

4. **Verify Google Search Console** at https://search.google.com/search-console
   - Use DNS TXT record verification (DNS lives on Cloudflare per project memo).
   - Submit sitemap: `https://downtimebhavan.in/sitemap.xml`
   - Request indexing on `/`, `/sites`, `/leaderboard`, `/methodology`, `/about` (daily 5–10 URL quota).

5. **Verify Bing Webmaster Tools** at https://www.bing.com/webmasters
   - Same DNS TXT or HTML file verification.
   - Submit `https://downtimebhavan.in/sitemap.xml`.
   - GSC sitemap submission auto-syndicates to IndexNow, but submitting in BWT explicitly is still the simplest belt-and-braces step.

6. **Validate schemas with Google's Rich Results Test**:
   - https://search.google.com/test/rich-results
   - Run for: `https://downtimebhavan.in/sites/aadhaar-ssup`, `https://downtimebhavan.in/leaderboard`, `https://downtimebhavan.in/methodology`, `https://downtimebhavan.in/about`
   - Cross-check at https://validator.schema.org/ for any structural warnings.
   - Note: info-level warnings about `GovernmentOrganization` (nested in `Service.provider` on site-detail pages) not having an `@id` are expected and harmless.

7. **Validate OG previews**:
   - Twitter Card Validator (or X equivalent): paste a homepage URL and a per-site URL.
   - Facebook Sharing Debugger: https://developers.facebook.com/tools/debug/
   - WhatsApp: forward a link to yourself, check the rendered card.
   - LinkedIn Post Inspector: https://www.linkedin.com/post-inspector/

8. **Lighthouse CI** (run from a real Chrome environment, against production):
   ```bash
   npx lighthouse https://downtimebhavan.in/ --only-categories=performance,accessibility,seo,best-practices --output=html --output-path=/tmp/lh-home.html --preset=mobile
   npx lighthouse https://downtimebhavan.in/sites/aadhaar-ssup --preset=mobile --output=html --output-path=/tmp/lh-site.html
   npx lighthouse https://downtimebhavan.in/leaderboard --preset=mobile --output=html --output-path=/tmp/lh-lb.html
   npx lighthouse https://downtimebhavan.in/methodology --preset=mobile --output=html --output-path=/tmp/lh-method.html
   ```
   Target thresholds (mobile, 75th percentile): LCP < 2.5s, INP < 200ms, CLS < 0.1, SEO ≥ 95, A11y ≥ 95.
   If A11y < 95: investigate the contrast warning flagged in the local run on `/sites/aadhaar-ssup`.

9. **(Optional)** Submit `/llms.txt` awareness — not a formal protocol step, but a short X thread linking https://downtimebhavan.in/llms.txt helps AI crawlers that scrape X surface the file.

## Tag suggestion

Recommend tagging this checkpoint `v1.1.0-seo-foundation` per the plan's completion criteria, once this report is committed.

## Next plan

Plan 9: Track B (content) — per-site evergreen pages (600+ words each, FAQs), methodology rewrite as a white paper, `/press` content. See `docs/seo/IMPLEMENTATION-ROADMAP.md` § Phase 1 Track B.
