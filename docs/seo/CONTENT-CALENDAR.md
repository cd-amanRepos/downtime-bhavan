# Content Calendar — Downtime Bhavan

_Companion to SEO-STRATEGY.md_
_Planning horizon: 12 months from launch (2026-06 → 2027-05)_
_Constraint: solo operator, ₹0 budget, all content first-party_

---

## Content philosophy

Three streams, each serving a different SEO surface:

1. **Per-site evergreen** — the ranking engine. Updated quietly, evergreen URLs.
2. **The Daily Downtime** — satirical news. The link-bait + brand engine.
3. **Editorial / data reports** — quarterly. The press + AI-citation engine.

> Voice rule: humor in stream #2, neutral civic in #1, sober analytical in #3. Never mix.

---

## Stream 1: Per-site evergreen pages

12 pages at launch (one per V1 site). Each follows a fixed template — see SITE-STRUCTURE.md for the URL/structure spec.

### Template

```
H1: [Site name] status · is [site] down right now?
[Live status component — first paragraph answers in plain text]
H2: 30-day uptime
H2: How we check [site]
H2: Common errors and what they mean
H2: When [site] is down, you can…
H2: Get a WhatsApp alert when [site] comes back up
H2: Recent reports from citizens (Janta Darbar embed)
H2: FAQ
```

**FAQ slots (per page):**
- Is [site] down right now?
- How often does [site] go down?
- Why is [site] slow today?
- Is the [site] outage geofenced (do non-Indian IPs see it differently)?
- What should I do if I urgently need to use [site]?

Target length: 600–900 words of unique content per page + dynamic data. Updated automatically by the monitoring layer + manually refreshed every 90 days.

### Launch sequence

| Week | Site pages live |
|---|---|
| W1 | Aadhaar (UIDAI), EPFO, IRCTC |
| W2 | GST, Income Tax, PAN/NSDL |
| W3 | Passport Seva, DigiLocker, eShram |
| W4 | ESIC, MCA21, FASTag |

By end of week 4, all 12 are live. Refresh cadence: review every 90 days, light copy refresh + stat refresh.

---

## Stream 2: The Daily Downtime (satirical news)

Format: ~250–500 word posts, 3 per week (Mon/Wed/Fri). Onion-style civic satire wired to real outage data.

URL pattern: `/daily/[yyyy]/[mm]/[slug]`

### Post archetypes

| Archetype | Example title | Trigger |
|---|---|---|
| **Incident report (deadpan)** | "UIDAI portal serenely unreachable for 47 minutes; ministry confirms 'maintenance' was prescheduled in your imagination" | Real outage > 30 min |
| **Leaderboard recap** | "This week's most-Down portals: a ceremonial ranking" | Weekly Friday |
| **Definition/explainer** | "What 'Degraded — Community' actually means" | Methodology adjacent |
| **Bilingual gem** | "जब साइट थोड़ी-थोड़ी काम कर रही हो: a glossary" | Brand voice piece |
| **Reader grievance feature** | "Letters from the Janta Darbar: this week in 140 characters" | Curated UGC |
| **Sarkari Mode highlight** | "Activate Sarkari Mode — a 2008 portal cosplay" | Brand piece (one-shot) |
| **Anniversary / milestone** | "100 days of unofficial observation" | Brand piece (calendar-driven) |
| **Real news sidebar** | "[News outlet] reported [portal] was down 'briefly'. Our data: 4h 12m" | Triggered when news undercounts |

### Why this stream matters for SEO

- Fresh signal → Google rewards regular indexing pace.
- Long-tail capture (each post lights up 10–30 long-tail keywords).
- Shareability → backlinks from civic-tech press, X, Reddit.
- AI citation surface — Onion-style civic satire is rare; LLMs picking up "Indian govt portal humor" will surface us.

### Voice guardrails (from project memo)

- Deadpan civil-servant. Polished product, brutal numbers.
- Bilingual Hindi micro-touches — restrained, never gimmicky.
- Never mock individuals, ministers, or named bureaucrats. Always mock the system.
- Always include a real data point. Satire without data = comedy site; satire with data = civic journalism.
- Front each piece with "Filed at [IST time]. Unofficial observatory."

---

## Stream 3: Quarterly editorial reports

Format: long-form (2,000–4,000 words) + downloadable PDF + CSV data. Released the second week of each quarter.

| Report | When | Working title | Distribution |
|---|---|---|---|
| Q3 2026 | 2026-10-14 | "State of Indian Govt Web — Q3 2026: 90 days of unofficial observation" | Press kit to 30 civic-tech outlets; Show HN; X thread |
| Q4 2026 | 2027-01-13 | "The deadline effect: how Indian govt portals perform under filing pressure" | Press + tax/legal beats |
| Q1 2027 | 2027-04-14 | "Year One: what 12 months of data tells us about Sarkari uptime" | Anniversary launch; full press push |
| Q2 2027 | 2027-07-14 | "Geofence index: which Indian govt portals lock out non-Indian IPs" | Tech/policy beats |

Each report is:

- A canonical URL at `/reports/[slug]`
- A downloadable PDF with a stable URL
- A CSV with raw data — Creative Commons BY 4.0
- Schema: `Report` (using `Article` + `Dataset`)
- Pinned in the press kit at `/press`

Reports are AI-citation goldmines because they're original quantitative research that LLMs cannot get elsewhere.

---

## 12-month calendar (compressed view)

### Month 0 (launch, June 2026)
**Goal:** SEO foundation live + 12 site pages.
- W1-W4: Per-site pages live (stream 1)
- W1: SEO foundation deploy (sitemap, robots, schema, OG, llms.txt)
- W2: Daily Downtime stream launches — 3 posts/week from here on
- W4: `/about` + `/methodology` rewritten as authority pages
- W4: GSC + BWT submitted; AI-citation baseline measurement begins

### Month 1 (July 2026)
- Daily Downtime cadence: 12 posts
- W1: Sarkari Mode toggle launch + 1 viral-aim Daily Downtime post
- W3: Open-data endpoint `/api/public/uptime.json` live
- W4: Show HN + civic-tech outlet pitch round 1

### Month 2 (August 2026)
- Daily Downtime cadence: 12 posts
- W2: First "Letters from Janta Darbar" curated post (UGC feature)
- W3: First explainer post linking to `/methodology`
- W4: Internal linking audit + first SEO health check

### Month 3 (September 2026)
- Daily Downtime cadence: 12 posts
- Quarter close — start drafting Q3 report
- W3: Mid-quarter press follow-ups
- W4: KPI checkpoint (Month 3 target: 8K sessions, 4 tier-1 ranking #1-3)

### Month 4 (October 2026)
- Q3 2026 report drops **W2** with full press push
- Daily Downtime cadence continues
- W3: Reddit / HN amplification of report
- W4: Add 3 new sites if data justifies (Plan 2 expansion)

### Month 5 (November 2026)
- Daily Downtime + ongoing
- W1: Bilingual content audit — refine Hindi micro-touches based on Search Console query data
- W3: First wave of competitive-keyword content (Q3 report citations driving traffic)

### Month 6 (December 2026)
- Daily Downtime + ongoing
- W2: "Year-end Sarkari uptime tracker" — viral-aim long post (Onion-style + data)
- W4: Q4 report drafting begins

### Month 7 (January 2027)
- Q4 2026 report drops **W2**
- W3: First wave of Wikipedia / Wikidata entity submissions (now that press citations exist)

### Month 8 (February 2027)
- Daily Downtime
- W2: Add 5 more sites (now at 17 total)
- W4: AI-citation deep audit; tune schema for any gaps

### Month 9 (March 2027)
- Daily Downtime
- W1: "ITR filing season" content surge — pre-deadline how-to pieces
- W3: Tax-beat press outreach (Mint, ET Tax)

### Month 10 (April 2027)
- Q1 2027 report drops **W2** — "Year One"
- Full anniversary press push
- W4: Brand campaign moment

### Month 11 (May 2027)
- Daily Downtime
- W2: Add 5 more sites (now at 22 total)
- W3: Backlink audit — fortify weak referrers

### Month 12 (June 2027)
- Year-1 retrospective
- KPI checkpoint vs the 12-month targets
- 13-month plan drafted

---

## Content quality gates

Before publishing any stream-2 (Daily Downtime) post:

- [ ] Real data anchor present (numbers from our monitoring)
- [ ] No named individual mocked
- [ ] Title is 50–65 chars and includes at least one searchable noun (portal name, date)
- [ ] Lead sentence is quotable and accurate
- [ ] Internal link to at least one tier-1 site page or `/methodology`
- [ ] Author byline + IST timestamp
- [ ] Schema: `NewsArticle` with `datePublished` + `dateModified` + `author` (Person) + `publisher` (Organization)

Before publishing any stream-3 (report):

- [ ] Original quantitative claims with methodology footnotes
- [ ] CSV released with same DOI-style stable URL
- [ ] Press contacts list reviewed (no spam, no list-blasts)
- [ ] PDF accessible (no image-only text)
- [ ] Embeds OG/Twitter Card with chart preview

---

## Topics watchlist (idea bank — pull from when stuck)

- "The Aadhaar maintenance window: when does UIDAI actually patch?"
- "GST portal vs the last day of the month: a love story"
- "Why IRCTC at 10:00 IST is a national prayer time"
- "Hindi error messages: a tasting menu"
- "If government websites had Service Level Agreements"
- "The Janta Darbar dictionary: 14 phrases citizens use to describe slow portals"
- "What 'site is currently undergoing maintenance' means in IST hours"
- "Filing PF withdrawal during EPFO downtime: a flowchart"
- "The geofence map: which portals don't load outside India"
- "Sarkari design language: a love letter to underline-on-hover"
- "Status: ✅ working / ❌ working / ❓ ¯\\_(ツ)_/¯"

---

## Avoid

- **Listicles** without data anchors
- **Anything topical that doesn't tie to a portal we track**
- **Posts about specific bureaucrats or politicians**
- **Engagement-bait UGC drives** (devalue Janta Darbar's signal quality)
- **Translated AI-generated Hindi** — bilingual touches must be human-written
- **AMP** (no longer required; adds complexity)
- **Sponsored content / affiliate** — destroys positioning
