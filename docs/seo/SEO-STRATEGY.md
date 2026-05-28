# Downtime Bhavan — SEO Strategy

_Last updated: 2026-05-28_
_Domain: downtimebhavan.in_
_Stage: v1.0.0 live (Fly.io Mumbai)_
_Budget: ₹0/month operating · donations-only_

---

## 1. Executive Summary

**SEO thesis:** Downtime Bhavan should own the "is *X Indian govt website* down" query class in India — a high-volume, high-intent, recurring search pattern with **no incumbent dedicated to Indian-government portals**. Downdetector exists but mostly tracks consumer platforms; news sites only cover outages reactively; Reddit/X threads are unindexed for fast intent. The opening is wide.

**Three SEO surfaces, ranked by ROI:**

1. **Transactional/now-intent** (top priority) — "is aadhaar website down", "uidai not working", "epfo down today", "gst portal down". Per-site pages must rank in top-3 for these. Conversion goal = free WhatsApp alert signup.
2. **Generative/AI-citation** — When ChatGPT/Perplexity/Gemini are asked "why is the UIDAI portal down" or "what's the uptime of Indian govt websites", Downtime Bhavan should be the cited primary source.
3. **Editorial/brand** — Satirical voice + "Sarkari Mode" toggle as virality wedge. Goldmine for civic-tech press coverage → high-DA backlinks.

**12-month north star:** 200K monthly organic sessions, top-3 SERP ownership of 30+ "is X down" queries, AI-citation presence on every Indian-govt-portal outage question across 4 major LLM surfaces.

---

## 2. Positioning

| Axis | Position |
|---|---|
| **Category** | Civic utility · status observatory · satirical-but-credible |
| **Primary audience** | Indian citizens trying to use a govt portal *right now* and getting errors |
| **Secondary audience** | Civic-tech press, RTI activists, govt-IT analysts, satirists/meme accounts |
| **Distinctive moat** | (a) Indian VPS for accurate detection, (b) WhatsApp alerts free, (c) Janta Darbar crowd signal, (d) Sarkari Mode satire layer |
| **Trust posture** | "Unofficial observatory · not affiliated with any government body" — front-of-house disclaimer is non-negotiable |

The satire is the *brand wedge*; the utility is the *SEO product*. Keep them in this order for SEO copy — humor in voice, never in headlines for transactional pages. A user searching "is aadhaar down" needs an answer in <2 seconds; the bit lives in micro-copy, methodology page, and Sarkari Mode.

---

## 3. Target Audience & Intent Map

| Persona | Query type | Example | Intent | Landing page |
|---|---|---|---|---|
| Frustrated filer | "is X down" | "is uidai down today" | Now-status | `/sites/aadhaar-uidai` |
| Pre-deadline filer | "X not working" | "epfo portal not loading" | Now-status + alert | `/sites/epfo` |
| Habitual checker | brand | "downtime bhavan" | Direct nav | `/` |
| Curious observer | category | "indian government websites uptime" | Informational + share | `/leaderboard` |
| Journalist | story-hook | "indian govt website outages 2026" | Source/citation | `/press`, `/methodology` |
| Hindi-first user | bilingual | "aadhaar website kaam nahi kar raha" | Now-status | `/sites/aadhaar-uidai` (with Hindi micro-copy) |
| AI surface | generative | LLM asks "is the UIDAI portal reliable" | Citation | All `/sites/*`, `/methodology`, `/leaderboard` |

---

## 4. Keyword Strategy

### 4.1 Pillar map (hub-and-spoke)

```
HUB: Homepage (/) — "Indian government website status"
 ├─ Cluster: Per-portal status pages (/sites/[id])
 │     spokes: "is X down", "X not working today", "X portal status"
 ├─ Cluster: Leaderboard (/leaderboard) — "least reliable indian govt websites"
 ├─ Cluster: Methodology (/methodology) — "how to detect govt website downtime"
 ├─ Cluster: Janta Darbar (/janta-darbar) — "report aadhaar/epfo/gst not working"
 └─ Cluster: Press (/press) — brand entity hub for journalists/AI
```

### 4.2 Tier-1 target keywords (top-3 ranking required)

For each of the 12 V1 sites, the per-portal page must rank for:

- `is [site] down` · `[site] down today` · `[site] not working` · `[site] portal status` · `[site] website status`

Indicative volume bands (estimated, free-tier — refine with Search Console once GSC is verified):

| Site | Primary query | Est. monthly searches in India |
|---|---|---|
| Aadhaar (UIDAI) | is uidai down | High (20K–80K) |
| EPFO | epfo not working | High (15K–60K) |
| GST | gst portal down | High (10K–40K) |
| Income Tax | income tax portal not working | High (8K–30K) |
| IRCTC | irctc down | Very high (50K+) |
| eShram | eshram portal status | Mid (3K–10K) |
| ESIC | esic down | Mid (2K–8K) |
| DigiLocker | digilocker not working | Mid (2K–8K) |
| Passport Seva | passport seva not working | Mid (3K–10K) |
| MCA21 | mca portal down | Low–mid (1K–4K) |
| NSDL/PAN | pan card website down | Mid (3K–12K) |
| FASTag | fastag portal down | Mid–high (5K–15K) |

> Ranking even mid-band terms compounds: there are ~20 portal-related modifiers ("kaam nahi kar raha", "loading slow", "showing error", "server down", "site is down right now") each adding a long-tail tail.

### 4.3 Tier-2 (editorial/AI-citation)

- "most unreliable indian government websites"
- "average uptime of indian government portals"
- "why are indian government websites slow"
- "indian government website outages 2026"
- "is there a downdetector for indian government websites"

These map to `/leaderboard`, `/methodology`, and future "Daily Downtime" editorial content (see CONTENT-CALENDAR.md).

### 4.4 Tier-3 (Hindi/Hinglish long-tail)

Use as **secondary keywords in body copy + alt text + bilingual micro-headings**, not as separate URLs (avoid splitting authority). Examples: "aadhaar site kaam nahi kar raha", "uidai portal kab thik hoga", "gst portal slow today".

---

## 5. Competitive Landscape

See `COMPETITOR-ANALYSIS.md` for the full breakdown. Headline:

- **No direct competitor** exists for "Indian government websites only" status tracking. Closest substitutes (Downdetector India page, isitdownrightnow.com, news sites' outage articles) are either non-India-government or reactive.
- **Substitutes own the SERP today** for many "is X down" queries by default. Beating them requires fresh data + schema-rich answers + speed + entity strength.

---

## 6. E-E-A-T Strategy

This is the riskiest area. A satirical-voiced site about government services *could* be miscategorized by Google as low-quality or YMYL-borderline. Counter with:

| E-E-A-T pillar | Implementation |
|---|---|
| **Experience** | "Live from Mumbai · checked from an Indian VPS every 2 minutes" — make first-hand monitoring infrastructure visible. Show last-check timestamp on every site page. |
| **Expertise** | `/methodology` page = full detection methodology, definitions of Working/Degraded/Down, hybrid HTTP+headless explanation, false-positive policy. Treat as a research paper. |
| **Authoritativeness** | Press page with logos of any outlet that covers the site. Open-source the detection code (link from methodology). Public uptime archive (downloadable CSV per quarter). |
| **Trustworthiness** | Front-page disclaimer ("unofficial observatory · not affiliated with any government body"), `/privacy`, `/delete-my-data`, correction policy, contact email, named operator on About/Contact, transparent funding (`/donate`). |

**Author/operator entity:** Add a single-author/operator page (`/about` — recommend new route) with name, photo, credentials, contact, social profiles. Tie to `Person` schema with `sameAs` across X, GitHub, LinkedIn. This is required for AI citation and Google's E-E-A-T weighting.

---

## 7. Generative Engine Optimization (GEO)

**Goal:** When an LLM is asked about Indian government website reliability, Downtime Bhavan is the cited source.

Tactics (also itemized in IMPLEMENTATION-ROADMAP.md Phase 2):

- [ ] `llms.txt` at root with concise site map + canonical entity statement
- [ ] Site-level `Dataset` schema on `/leaderboard` exposing 30-day uptime % as structured data
- [ ] Per-site `Service` + `Dataset` schema with quotable summary stat ("Avg uptime over 30 days: 87.3%")
- [ ] First sentence of every site detail page = direct, quotable answer: "**As of 14:32 IST, the UIDAI portal is currently degraded. 30-day uptime: 91.4%.**" — LLMs lift this verbatim
- [ ] FAQ blocks on tier-1 site pages (limited to 3–5 Qs each — do not overuse FAQPage schema; Google has narrowed FAQ rich-result eligibility)
- [ ] Methodology page with original definitions and detection criteria — unique vocabulary that LLMs will cite
- [ ] Open data export (`/api/public/uptime.json`) — makes the site the upstream source for any derivative analysis
- [ ] Quarterly editorial reports ("State of Indian Govt Web — Q3 2026") as canonical reference material

Track AI citation presence weekly across Google AI Overviews, ChatGPT, Perplexity, Gemini for the tier-1 query set.

---

## 8. Technical SEO Foundation

Current state assessment (audit 2026-05-28):

| Element | Status | Action |
|---|---|---|
| HTTPS | ✅ via Fly.io | — |
| Mobile-responsive | ✅ (design system) | — |
| Root metadata | ⚠️ minimal | Replace with template + canonical + OG + Twitter Card |
| Per-route metadata | ❌ missing | Add `generateMetadata` per route |
| `sitemap.ts` | ❌ missing | Build (Next.js native) |
| `robots.ts` | ❌ missing | Build, disallow `/admin`, `/api`, `/delete-my-data` |
| `manifest.ts` (PWA) | ❌ missing | Build — alerts UX is mobile-first; PWA = retention win |
| OG image | ❌ missing | Generate (`opengraph-image.tsx` per route + branded fallback) |
| Schema markup | ❌ none | Inject Organization, WebSite, BreadcrumbList, Dataset, Service per page |
| `llms.txt` | ❌ missing | Add at `/llms.txt` |
| Canonical tags | ❌ missing | Add via `metadata.alternates.canonical` |
| `hreflang` | ❌ missing | Add `x-default` + `en-IN` (Hindi is bilingual micro-touch, not full locale — do NOT split hreflang for it) |
| Indian VPS / Mumbai region | ✅ Fly.io Mumbai | Good for both detection and CWV for IN users |
| Image optimization | needs audit | Migrate to `next/image` everywhere, AVIF/WebP |
| INP / LCP | needs measurement | Set targets: LCP <2.0s, INP <150ms, CLS <0.05 |

See IMPLEMENTATION-ROADMAP.md for the build sequence.

---

## 9. Content Strategy (summary)

Detailed plan in `CONTENT-CALENDAR.md`. Three content streams:

1. **Per-site evergreen pages** (12 to start, growing to 30+) — primary ranking surface.
2. **The Daily Downtime** — satirical news series (parked in product memo; revive as SEO play). 2–3 short posts/week. Onion-style + real outage data. **This is the link-bait engine.**
3. **Editorial reports** (quarterly) — "State of Indian Govt Web Q3 2026" with original uptime data. Citation/PR magnet.

---

## 10. Link Building & Off-Page

Approach: **earned only.** ₹0 budget; no paid links. Channels:

- **Civic-tech press** — pitch to The Ken, Morning Context, MediaNama, Internet Freedom Foundation blog, Scroll, The Wire. Hook = "we built an unofficial uptime monitor for Indian govt sites and the numbers are brutal."
- **Tech/HN/Reddit** — Show HN launch post (one shot, get right). r/india, r/IndianTech, r/IndianGaming have shared interest.
- **Twitter/X reach** — automate post-only outage alerts to a brand X account; not for follow growth, for embed/citation surface.
- **GitHub** — open-source the detection code with README links back to the site. Topic tags: `indian-government`, `uptime`, `observability`.
- **Wikipedia** — once 3+ tier-2 press mentions exist, add a brand entry. Patient.
- **Wikidata** — add brand entity immediately (free, high authority signal).

Avoid: HARO clones, guest post farms, directory submission spam, link exchanges.

---

## 11. Local SEO (light touch)

Not a brick-and-mortar business, but include India geo-signals:

- `<html lang="en-IN">` (currently `en`)
- INR-only on `/donate` page (UPI primary)
- "Mumbai, India" location entity in `Organization` schema
- IST timestamps everywhere (already designed)
- Google Business Profile: skip — no local intent

---

## 12. KPIs & Measurement

### Free measurement stack (no paid tools)

- **Google Search Console** — primary truth for rankings/impressions/clicks
- **Bing Webmaster Tools** — also free; submit sitemap
- **Umami** (self-hosted) — privacy-respecting analytics (already in deploy plan per resume-state)
- **AI citation tracker** — weekly manual check of 20 tier-1 queries on ChatGPT/Perplexity/Gemini + AIO

### KPI table

| Metric | Baseline (M0) | Month 3 | Month 6 | Month 12 |
|---|---|---|---|---|
| Organic sessions / month | ~0 | 8,000 | 50,000 | 200,000 |
| Pages indexed (Google) | 0 | 25 | 50 | 80+ |
| Tier-1 queries ranking #1–3 | 0 | 4 | 12 | 25 |
| Tier-1 queries ranking #1–10 | 0 | 10 | 25 | 40 |
| Referring domains (unique) | 0 | 10 | 35 | 80 |
| AI-citation surface (out of 20 monitored queries) | 0 | 4 | 10 | 16 |
| WhatsApp alert subscribers | 0 | 1,500 | 8,000 | 30,000 |
| Janta Darbar reports / week | 0 | 50 | 300 | 1,500 |
| CWV: LCP / INP / CLS (75th pct) | TBD | <2.5s / <200ms / <0.1 | <2.0s / <175ms / <0.08 | <1.8s / <150ms / <0.05 |
| Branded search volume | 0 | 200 | 2,000 | 15,000 |

> Donations and revenue are deliberately not SEO KPIs — they're product KPIs downstream of the SEO funnel.

---

## 13. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Google miscategorizes satirical content as misleading | M | H | Front-page "unofficial observatory" disclaimer, About/Methodology pages, no satire in transactional copy, `Organization.disambiguatingDescription` schema |
| Govt portal owner sends legal/takedown | L–M | H | Carefully phrased disclaimer, no logos used as brand impersonation, methodology transparency, public correction policy, named operator |
| Site goes down during a viral moment (Sarkari Mode launch) | M | M | Fly.io autoscale, Cloudflare in front, status page on subdomain |
| Detection false positives spike (looks like content farm) | M | H | Show methodology, allow per-site "false positive" report, post-mortem any sustained false positive in public changelog |
| Hindi misclassification ("Hinglish queries treated as English") | M | M | Use `lang` attributes correctly per micro-touch; do not over-index on Hindi-only routes |
| Domain-name confusion with `pmoindia.gov.in` etc. | L | H | Disclaimer + schema `disambiguatingDescription`, never use "Government of India" in title tags |
| GSC verification blocked by hosting setup | L | L | Use DNS TXT record verification (already controlling DNS) |
| Site reputation abuse penalty (we host third-party content?) | L | M | All grievance reports are post-moderated, banned-word filter, report button, clear editorial policy |
| Content drift away from civic utility | M | M | "Does this serve a frustrated citizen?" decision rule (per project memo) |

---

## 14. Done = checklist for Phase 1

- [ ] All public pages have unique title (30–60 chars), description (120–160 chars), canonical, OG, Twitter Card
- [ ] `sitemap.ts`, `robots.ts`, `manifest.ts`, `llms.txt` live and validated
- [ ] Organization + WebSite schema on root layout; per-page schemas where applicable
- [ ] GSC + BWT verified, sitemap submitted, no critical issues
- [ ] CWV passing on mobile for `/`, `/sites/[id]`, `/leaderboard`, `/janta-darbar`
- [ ] All 12 `/sites/[id]` pages have full evergreen content + FAQ + structured data
- [ ] `/about` page exists with named operator + Person schema
- [ ] `/methodology` reads as a credible white paper
- [ ] Open-data endpoint `/api/public/uptime.json` live, linked from methodology

---

## 15. Companion Documents

- `COMPETITOR-ANALYSIS.md` — top 5 competitors, gap analysis, what they do well/badly
- `CONTENT-CALENDAR.md` — 12-month editorial plan, "Daily Downtime" cadence
- `IMPLEMENTATION-ROADMAP.md` — 4-phase build sequence with dependencies
- `SITE-STRUCTURE.md` — URL hierarchy, internal linking matrix, sitemap quality gates
