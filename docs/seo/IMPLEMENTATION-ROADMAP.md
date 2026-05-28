# Implementation Roadmap — Downtime Bhavan SEO

_Companion to SEO-STRATEGY.md_
_Stage at planning time: v1.0.0 LIVE on Fly.io Mumbai · main branch clean · zero SEO foundation_

---

## Approach

Four phases, gated. Don't start phase N+1 until phase N's "Done" checklist is met. Each phase has independent tracks (technical / content / off-page) that can run in parallel within the phase.

Total time-on-tools: ~80–100 hours of focused work across 12 months (solo operator).

---

## Phase 1 — Foundation (weeks 1–4)

**Objective:** Every page indexable, structured, and AI-readable. Zero technical debt remaining.

### Track A — Technical SEO foundation

| # | Task | File(s) | Effort | Owner | Done when |
|---|---|---|---|---|---|
| A1 | Root metadata template | `apps/web/app/layout.tsx` | 1h | dev | Title template `%s · Downtime Bhavan`, description, `metadataBase`, `openGraph`, `twitter`, `robots`, `alternates.canonical`, `icons` all set |
| A2 | `sitemap.ts` | `apps/web/app/sitemap.ts` | 2h | dev | Returns all public routes + dynamic `/sites/[id]` from DB; correct lastModified; submitted to GSC + BWT |
| A3 | `robots.ts` | `apps/web/app/robots.ts` | 0.5h | dev | Disallow `/admin*`, `/api/admin*`, `/api/notify/verify*`, `/api/webhook*`, `/delete-my-data` confirmation step. Allow everything else. Sitemap line included. |
| A4 | `manifest.ts` (PWA) | `apps/web/app/manifest.ts` | 1h | dev | Name, short_name, theme color, icons, start_url. Allows mobile install — supports alert UX. |
| A5 | `llms.txt` | `apps/web/public/llms.txt` | 0.5h | dev | Canonical site summary, sitemap link, key page list. |
| A6 | Per-route `generateMetadata` | every route in `app/` | 4h | dev | Each public route exports route-specific title/description/canonical/OG. Use `Metadata` type. |
| A7 | OG image generator | `apps/web/app/opengraph-image.tsx` + per-route variants | 3h | dev | Branded fallback + per-page dynamic OG (site name + status + uptime%) for `/sites/[id]` |
| A8 | Twitter Card meta | (covered by A1 + A6) | — | dev | `summary_large_image` on all routes |
| A9 | JSON-LD: Organization + WebSite | `apps/web/app/layout.tsx` | 1h | dev | Server-rendered in `<head>` via `next/script type="application/ld+json"` |
| A10 | JSON-LD: per-page schemas | `app/sites/[siteId]/page.tsx`, `app/leaderboard/page.tsx`, `app/methodology/page.tsx`, `app/janta-darbar/page.tsx` | 4h | dev | `WebPage`, `BreadcrumbList`, `Service`/`Dataset` for sites, `Dataset` for leaderboard, `Article` for methodology |
| A11 | Canonical URLs everywhere | per route | (in A6) | dev | No duplicate-content risk via tracking params; `alternates.canonical` set explicitly |
| A12 | `<html lang="en-IN">` | `apps/web/app/layout.tsx` | 0.1h | dev | Switched from `en` → `en-IN`; geo signal for India |
| A13 | Verify CWV mobile (75th pct) | n/a (measure) | 2h | dev | LCP <2.5s, INP <200ms, CLS <0.1 on `/`, `/sites/[id]`, `/leaderboard`, `/janta-darbar` per Lighthouse + field data |
| A14 | GSC + BWT verification | (DNS TXT) | 1h | ops | Both consoles verified; sitemap submitted; "Coverage" report monitored |
| A15 | 404 page | `apps/web/app/not-found.tsx` | 0.5h | dev | Branded, helpful, links to home + sitemap |

### Track B — Content foundation

| # | Task | File(s) | Effort | Owner | Done when |
|---|---|---|---|---|---|
| B1 | Per-site page template + content | `app/sites/[siteId]/page.tsx` + content JSON | 8h | content | All 12 V1 sites have ≥600 unique words + FAQ + status component + Janta Darbar embed |
| B2 | `/methodology` rewrite | `app/methodology/page.tsx` | 3h | content | Reads as a white paper: detection, definitions, false-positive policy, hybrid HTTP+headless, IST timing, Indian VPS rationale |
| B3 | `/about` (new) | `app/about/page.tsx` | 2h | content | Named operator, mission, FAQ, Person schema with sameAs, contact, funding transparency |
| B4 | `/press` press kit | `app/press/page.tsx` | 2h | content | Brand assets ZIP, one-paragraph descriptions (50/100/250 word variants), high-res logos, contact email, sample stats |
| B5 | Refine `/leaderboard` headlines + meta | `app/leaderboard/page.tsx` | 1h | content | Title: "Indian government website uptime · 30-day leaderboard"; meta description; schema `Dataset` |
| B6 | Refine `/janta-darbar` for SEO | `app/janta-darbar/page.tsx` | 1h | content | Add H1, meta, intro paragraph; SSE stream stays |
| B7 | Refine `/donate` for trust | `app/donate/page.tsx` | 0.5h | content | Funding transparency, what donations fund (WhatsApp scaling), schema `DonateAction` |

### Track C — Off-page (low effort in Phase 1; mostly setup)

| # | Task | Effort | Done when |
|---|---|---|---|
| C1 | Wikidata entity | 1h | Brand entity created with description, claims, sameAs |
| C2 | GitHub repo: open-source detection code | 2h | Repo public, README links to site, topics tagged |
| C3 | Social profile setup (X primary) | 1h | `@downtimebhavan` (or available variant), bio links home, posts brand-aligned |
| C4 | Brand mention monitor setup | 0.5h | Google Alerts for "Downtime Bhavan" + "downtimebhavan" + key tier-1 portal names |

### Phase 1 Done = checklist

- [ ] Every track A1–A15 task verified
- [ ] All 12 site pages live with content, schema, FAQ
- [ ] `/about` and rewritten `/methodology` published
- [ ] GSC + BWT verified, sitemap submitted, no critical Coverage issues
- [ ] CWV passing on 4 priority routes
- [ ] Wikidata entity live; GitHub repo public
- [ ] No 404s on any page in sitemap (crawl with Screaming Frog free tier or `curl + jq`)

---

## Phase 2 — Expansion (weeks 5–12)

**Objective:** Content engine running. AI-citation surface achievable. First press wins.

### Track A — Content engine

| # | Task | Effort | Done when |
|---|---|---|---|
| A1 | Daily Downtime stream launches | 1h setup + 3h/week ongoing | URL pattern live (`/daily/[yyyy]/[mm]/[slug]`); RSS feed at `/feed.xml`; first 12 posts published over 4 weeks |
| A2 | RSS feed | 1h | Auto-generated from Daily Downtime + reports; linked from `<head>` |
| A3 | Author entity (Person schema) | 0.5h | One named operator with photo, bio, sameAs (LinkedIn, X, GitHub) |
| A4 | Update cadence baked into per-site pages | 1h | Static content reviewed every 90 days; "Last reviewed: [date]" displayed; `dateModified` schema updated |
| A5 | Bilingual micro-content audit | 2h | Hindi/Devanagari phrases on every page reviewed for accuracy + restraint |

### Track B — GEO (AI search optimization)

| # | Task | Effort | Done when |
|---|---|---|---|
| B1 | First-sentence quotability sweep | 2h | Every tier-1 page opens with a single quotable factual sentence |
| B2 | Dataset schema on `/leaderboard` | 1h | `Dataset` JSON-LD with `distribution` pointing to `/api/public/uptime.json` |
| B3 | Public data endpoint | 4h | `/api/public/uptime.json` returns 30-day uptime per site, cached, CORS-open |
| B4 | AI-citation baseline + weekly check | 1h/week | 20 tier-1 queries checked weekly on ChatGPT, Perplexity, Gemini, Google AIO; results logged |
| B5 | FAQ schema on tier-1 pages | 1h | Each site page has 3–5 FAQs with `FAQPage` schema (sparingly used) |

### Track C — Off-page

| # | Task | Effort | Done when |
|---|---|---|---|
| C1 | Show HN launch | 2h | One launch post; respond to comments for 24h |
| C2 | Civic-tech outreach round 1 | 4h | 8 pitches sent to: The Ken, Morning Context, MediaNama, IFF, Scroll, The Wire, Pratidhwani, Article-14 |
| C3 | r/india + r/IndianTech post | 1h | One launch post, follow community rules, respond honestly to "is this satire or real?" |
| C4 | Sarkari Mode launch moment | 4h | Toggle ships; companion Daily Downtime post; X thread; HN comment surge |

### Track D — Technical refinements

| # | Task | Effort | Done when |
|---|---|---|---|
| D1 | Image migration to next/image | 2h | All images use `next/image`; AVIF/WebP enabled |
| D2 | Lighthouse CI in deploy | 2h | Lighthouse runs on every deploy; threshold fails build if CWV drop |
| D3 | Internal linking pass | 2h | Tier-1 pages each link to 3–5 other tier-1 pages; leaderboard links to all sites; sites link back to leaderboard |
| D4 | Crawl audit | 1h | No orphan pages; no redirect chains > 1 hop; no broken internal links |

### Phase 2 Done = checklist

- [ ] 30+ Daily Downtime posts published
- [ ] AI-citation surface present on ≥4 of 20 monitored queries
- [ ] ≥3 referring domains from civic-tech outlets
- [ ] ≥1,500 WhatsApp alert subscribers (cross-checked against product KPI)
- [ ] Sarkari Mode shipped and at least one viral moment captured (≥10K X impressions)
- [ ] CWV regression budget enforced in CI

---

## Phase 3 — Scale (months 4–6)

**Objective:** Compound growth. First quarterly report drops. Programmatic site expansion.

### Track A — Content scale

| # | Task | Effort | Done when |
|---|---|---|---|
| A1 | Q3 2026 editorial report | 16h | Published; PDF + CSV; press kit updated; ≥10 outlets pitched |
| A2 | Site expansion to 17 sites | 4h dev + 4h content | 5 new sites added (Plan 2 enabling); pages live with full template |
| A3 | Daily Downtime continues | 3h/week | Cadence maintained; voice consistent |
| A4 | First "Letters from Janta Darbar" curated post | 2h | UGC feature post — drives Janta Darbar engagement loop |
| A5 | Topic clusters audit | 3h | Each cluster has a clear hub page + spokes; internal linking re-balanced |

### Track B — GEO advanced

| # | Task | Effort | Done when |
|---|---|---|---|
| B1 | `disambiguatingDescription` on Organization | 0.5h | Schema explicitly states "not affiliated with Government of India" |
| B2 | Quotable-fact embeds | 2h | Every tier-1 page has a `<blockquote>` with a one-line stat citizens can screenshot |
| B3 | AI-citation iteration | 1h/week | Gaps identified in B4 of Phase 2 → targeted content fixes |
| B4 | Add `ClaimReview` schema where appropriate | 2h | Methodology + reports use `ClaimReview` when correcting news outlet inaccuracies |

### Track C — Off-page

| # | Task | Effort | Done when |
|---|---|---|---|
| C1 | Q3 report press push | 6h | 30 outlets pitched; targeted angle per outlet; follow-ups; pickups tracked |
| C2 | Backlink quality audit | 2h | Toxic/spam backlinks disavowed if any appear |
| C3 | Wikipedia entry (when 3+ press citations exist) | 4h | Draft submitted; meets WP:N notability; not deleted within 30 days |
| C4 | Reddit / HN organic re-share moments | 1h/month | Earned shares only — never spam |

### Phase 3 Done = checklist

- [ ] Q3 2026 report has ≥5 press citations
- [ ] ≥12 tier-1 queries ranking #1–3
- [ ] AI-citation surface ≥10 of 20 monitored queries
- [ ] 17+ site pages live
- [ ] ≥35 referring domains
- [ ] ≥50K organic sessions in month 6

---

## Phase 4 — Authority (months 7–12)

**Objective:** Establish Downtime Bhavan as the canonical Indian govt portal observatory. Brand is the moat.

### Track A — Authority content

| # | Task | Effort | Done when |
|---|---|---|---|
| A1 | Q4 2026, Q1 2027, Q2 2027 reports | 16h × 3 | All three reports published on schedule |
| A2 | Site expansion to 25+ sites | 4h dev + 4h content | Plan 2's full headless validation maturity; 13 more sites added across phase |
| A3 | "Year One" anniversary report | 24h | Long-form retrospective + data archive release |
| A4 | Daily Downtime cadence maintained | 3h/week | No skipped weeks |
| A5 | Bilingual content expansion review | 2h | Hindi micro-touches optimized based on real Search Console query data |

### Track B — Authority signals

| # | Task | Effort | Done when |
|---|---|---|---|
| B1 | Open data downloads + DOI-style URLs | 2h | Quarterly data dumps with stable URLs in `/data/[yyyy-qq].csv` |
| B2 | Methodology citations from academics | 1h/month | Track citations via Google Scholar alerts |
| B3 | API documentation page | 2h | `/docs/api` with the public data endpoint, terms of use (CC BY 4.0) |

### Track C — Brand & partnerships

| # | Task | Effort | Done when |
|---|---|---|---|
| C1 | Civic-tech conference talk (DEFTech, Decoding India) | 8h | One talk delivered or one written piece in a civic-tech publication |
| C2 | Relationship with IFF / Article-14 / MediaNama | ongoing | Recurring source/citation relationship |
| C3 | Annual brand audit | 4h | Voice consistency, design system drift check, satire-utility balance review |

### Phase 4 Done = checklist (12-month north star)

- [ ] ≥200K monthly organic sessions
- [ ] ≥25 tier-1 queries ranking #1–3
- [ ] ≥40 tier-1 queries ranking #1–10
- [ ] AI-citation surface ≥16 of 20 monitored queries
- [ ] ≥80 unique referring domains
- [ ] ≥30K WhatsApp alert subscribers
- [ ] Branded search volume ≥15K/month
- [ ] CWV at LCP <1.8s, INP <150ms, CLS <0.05

---

## Dependencies & critical path

```
Phase 1 Track A (technical) ──┐
                              ├──> Phase 2 Track A (content engine)
Phase 1 Track B (content)  ───┘
                              ├──> Phase 2 Track B (GEO)
Phase 1 Track A4 (manifest) ──> Phase 2 mobile retention
Phase 1 Track A9-A10 (schema) ─> Phase 2 Track B (AI citation depends on schema)
Phase 2 Track C1+C2 (HN+press) ─> Phase 3 Track C3 (Wikipedia needs prior citations)
Phase 3 Track A1 (Q3 report) ──> Phase 4 reports + brand authority
Plan 2 product expansion ─────> Phase 3 Track A2 site expansion
```

**Critical blockers:**

- A6 (per-route generateMetadata) blocks AI citation quality — top priority.
- A2 (sitemap) blocks all indexation — second priority.
- B1 (per-site pages) blocks tier-1 ranking — third priority.
- B2/A10 (methodology + schema) blocks E-E-A-T at the strategic level.

---

## What we are deliberately NOT doing

- **Paid ads** — out of scope, ₹0 budget.
- **Paid backlinks / guest post farms** — banned.
- **AMP** — deprecated, adds complexity.
- **English-only content** OR **separate Hindi locale** — bilingual micro-touch only; no `/hi` route.
- **Aggressive FAQ schema bloat** — Google narrowed FAQ rich result eligibility in 2023–2024; use sparingly.
- **Google News manual application** — closed since March 2025; rely on automatic inclusion.
- **PageRank sculpting** with `rel="nofollow"` internally — not 2010 anymore.
- **Mass-templated programmatic SEO without uniqueness** — each per-site page must carry ≥600 unique words.

---

## Resource budget

| Resource | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|---|---|---|---|---|
| Dev hours | ~30h | ~15h | ~10h | ~10h |
| Content hours | ~20h | ~25h | ~30h | ~50h |
| Off-page hours | ~5h | ~10h | ~15h | ~20h |
| Tools | $0 (GSC, BWT, Umami self-hosted) | $0 | $0 | $0 |
| Infra cost | $0 (Fly.io + Cloudflare free tiers) | $0 | possibly +$5 VPS upgrade | possibly +$5 |

Total: ~250–300h over 12 months. Sustainable for a solo operator.
