# Downtime Bhavan — V1 Design Spec

**Date:** 2026-05-28
**Author:** Aman + Claude (brainstorm)
**Status:** Draft 1, pending user review
**Mockup (source of truth):** `.superpowers/brainstorm/28448-1779924034/content/homepage-v6.html`

---

## 1. Problem & Goal

Indian government websites are unreliable. Citizens routinely lose hours hitting refresh on Aadhaar, EPFO, GST, and Income Tax portals — these sites geofence to India-only, return `200 OK` on broken pages, and have no public uptime reporting.

**Goal:** Build a free, satirical-but-credible public observatory that:

1. Tracks the 12 most-used Indian government websites in real time.
2. Lets any citizen request a WhatsApp alert when a broken site comes back online.
3. Lets citizens publicly file grievances about specific outages (Janta Darbar).
4. Publishes a historical uptime record per site (30-day %, 24h sparkline).

The site must look like a **credible product** so the data is trusted; the satire lives in the copy, branding (Downtime Bhavan / डाउनटाइम भवन), and the framing (file numbers, "Janta Darbar," "Mumbai checkpoint," etc.).

**Non-goal:** This is not a generic uptime monitor. We don't ship per-customer status pages, paid SLAs, or API keys. It is a public good.

---

## 2. V1 Scope (Locked)

| Feature | What it does |
|---|---|
| **Status tracker** | 12 sites, tiered states (Working / Degraded / Down), 24h sparkline + 30d uptime % |
| **Notify-me alerts** | Citizens enter a mobile number, verify via WhatsApp OTP, receive one WhatsApp alert when a watched site comes back to "Working" |
| **Janta Darbar (जनता दरबार)** | Citizens file 140-char grievances tagged to a site; aggregated reports auto-flag sites as Degraded; comments stream live |
| **Public uptime stats** | 24-hour sparkline bar + 30-day uptime % per site |
| **Sarkari Mode toggle** | One-click theme flip to a satirical 2008-style govt portal cosplay (decorative, no data change) |
| **Donations page** | `/donate` with UPI ID + QR + GitHub Sponsors fallback for international |

Explicitly **NOT in V1:** Telegram alerts, email alerts, browser push, mobile app, paid features, public API, per-user accounts beyond a phone-number alert subscription, leaderboard page (planned for V1.1), historical site detail page (planned for V1.1), Onion-style news feed (planned for V2).

---

## 3. User Stories

### Citizen with an urgent task

> *"I need to update my Aadhaar address before the deadline tomorrow. The portal is down. I don't want to keep refreshing all day."*

- Lands on homepage, sees status grid showing Aadhaar = Degraded with "OTP not coming · 47 reports."
- Types "Aadhaar Self-Service" into the central notify input.
- Enters mobile number → receives WhatsApp OTP → confirms.
- Gets a WhatsApp message the moment Aadhaar checks pass for 5 consecutive minutes.

### Frustrated citizen who just wants to vent / commiserate

> *"GST portal is down AGAIN. Filing deadline is Friday. My CA is crying."*

- Lands on homepage, sees their experience reflected in the Janta Darbar stream.
- Clicks "File a grievance," picks `GST` + `#error-5xx`, types 140 chars.
- Submits via Turnstile captcha (no phone needed).
- Sees their grievance appear in the live feed, gets the catharsis.

### Curious observer

> *"How bad is it actually? Which sites are worst?"*

- Lands on homepage.
- Reads the hero: "Today, only 7 of 14 government websites are working" (note: 14 → 12 sites for V1; copy uses actual count).
- Scans the Department Status list sorted "Worst first."
- Sees the 30-day uptime % per site.

### Supporter who wants to fund the project

- Clicks "Donate" in footer or any homepage donate prompt.
- Lands on `/donate` page showing the running monthly cost transparency ("This month: ₹X / Y free WhatsApp messages used").
- Scans the UPI QR or copies the UPI ID.
- Optionally: clicks GitHub Sponsors.

---

## 4. Brand, Voice, Visual Design

**Locked design system per `homepage-v5.html` mockup.** That file is the source of truth for visual decisions.

### Brand
- **Name:** Downtime Bhavan · डाउनटाइम भवन
- **Tagline:** "An unofficial observatory"
- **Brand mark:** Custom Ashoka-chakra-inspired SVG (24 spokes, deep blue circle). Large 6% opacity rotating version sits behind hero as backdrop.

### Voice (in copy)
- Deadpan civil-servant. Brutal numbers stated plainly.
- Bilingual Hindi micro-touches (Devanagari script) used as a quiet companion to English, never as primary voice.
- Bureaucratic framing: file numbers, "Mumbai checkpoint," "Issued from," "विभाग स्थिति."
- **Hero copy (locked):** "Don't worry. We'll *notify you* when your *Sarkari site* will come up." ("notify you" italicized in Spectral navy; "Sarkari site" italicized in Spectral with subtle saffron underline.)
- Other examples that land (keep this register):
  - "Today, only X of 12 government websites are *working.*"
  - "India loves you, citizen."
  - "Office of Public Grievances," "Mumbai Observation Post," "विभाग स्थिति."

### Visual System

- **Palette:**
  - Background: `#F7F9FC` (paper)
  - Surface: `#FFFFFF`
  - Primary navy: `#1E3A8A` (govt-blue)
  - Saffron accent: `#F08C2A` (Indian flag) — used sparingly (CTAs, tricolor strip, hover states)
  - Green accent: `#138808` (Indian flag green) — used for primary "File a grievance" action and tricolor strip
  - Status colors: red `#B91C1C` / amber `#B45309` / green `#15803D`
- **Tricolor strip:** 3px saffron / white / green band below the header.
- **Typography:**
  - Body & UI: `Plus Jakarta Sans` (300-700)
  - Italic emphasis (one phrase per page max): `Spectral` italic
  - Hindi script: `Noto Sans Devanagari`
  - **No JetBrains Mono. No monospace fonts at all.**
- **Status indicators:** Dot + plain CAPS text in colored ink. No pill backgrounds. No colored left bars.
- **Sparklines (24-bar 24h history):** Uniform bar height (~14px), color-only variation (up/degraded/down). Subtle, not jagged. Track color `#EDF0F5` for unknown segments.
- **CTAs by zone:**
  - "Set alert" (center primary): **navy filled** (`--blue`)
  - "Report a broken site" (center secondary): **saffron outlined**
  - "File a grievance" (right panel sticky): **navy filled** (matches "Set alert" — DO NOT use India-flag green here; it clashes with the blue/white palette)
- **Layout:** 3-column command center. Left = Department Status (with inline status counts dot-row in header — `4 Unreachable · 3 Degraded · 5 Working`, NO pills), Center = Notify-me hero + Most-Watched social proof, Right = Janta Darbar live grievance stream with sticky CTA.
- **Focus-mode interaction:** When the notify input has `:focus-within`, both side columns collapse (grid column width → 0, opacity → 0, scale 0.96) with a 380ms cubic-bezier transition. Center expands to full width. `Esc` blurs and panels return. Pure CSS via `:has(.notify-form:focus-within)` — no JS framework needed.

### Hard "never do this" list (learned from v1-v5 iteration)
- No JetBrains Mono. No monospace fonts at all.
- No status pills with rounded colored backgrounds.
- No eyebrow/section pills with rounded backgrounds.
- No serif body copy.
- No magazine-style hero (no giant italic Newsreader/Fraunces drama).
- No cream paper backgrounds.
- No left-border colored bars as status indicator.
- No flag-green CTAs (India-flag green clashes with the blue/white palette and was rejected for "File a grievance").
- No status-count pills in the center hero (counts live in the left status panel header as dot-row).
- No jagged-height sparklines — uniform height, color only.

---

## 5. Detection & Status Architecture

### Detection: hybrid two-layer

| Check | Frequency | What it does | Outcome |
|---|---|---|---|
| **HTTP layer-1 ping** | Every 2 minutes | Make HEAD/GET request from Indian VPS, measure status code + latency | `up` if 2xx/3xx within 10s; `down` otherwise |
| **Headless layer-2 validation** | Every 15 minutes | Playwright loads the actual user-facing page; asserts a critical DOM selector exists (e.g., login form, search input, OTP field) | `up` if assertion passes; `degraded` if page loads but critical selector missing/broken; `down` if page fails to render |
| **Community signal** | Continuous | Count reports per site in last 10 minutes | Auto-flag `degraded — community` if ≥20 reports and layer-1+2 both say `up` |

### Status state machine (per site)

```
                  ┌──────────────┐
                  │   Working    │
                  └──────┬───────┘
                         │ HTTP fails OR headless assertion fails
                         ▼
                  ┌──────────────┐
                  │   Degraded   │  ← also entered from community-signal (≥20 reports/10min)
                  └──────┬───────┘
                         │ HTTP fails consistently for ≥4 min (2 consecutive HTTP failures)
                         ▼
                  ┌──────────────┐
                  │     Down     │
                  └──────────────┘
                         │ HTTP recovers AND headless passes for ≥5 min (3 consecutive successes)
                         ▼
                       (Working)
```

**Recovery rule** (for triggering Notify-me alerts): a site must transition from `Down` or `Degraded` back to `Working` AND maintain `Working` for ≥5 consecutive minutes before alerts fire. This prevents flapping outages from spamming users.

### Critical-selector definitions (per site)

Each site has a JSON config defining the layer-2 selector to assert. Sample format:

```json
{
  "id": "aadhaar-ssup",
  "name": "Aadhaar Self-Service",
  "url": "https://uidai.gov.in/ssup",
  "selectors": {
    "must_exist": ["input[name='aadhaar']", "button:has-text('Send OTP')"],
    "must_not_exist": ["text=Service temporarily unavailable", "text=Error 504"]
  },
  "checkpoint_region": "mumbai",
  "headless_timeout_ms": 20000
}
```

The 12 site configs live in `config/sites/*.json` and are version-controlled.

### V1 site list (locked)

1. **Aadhaar Self-Service Portal** — uidai.gov.in/ssup
2. **EPFO Member Portal** — unifiedportal-mem.epfindia.gov.in
3. **GST Portal** — gst.gov.in
4. **Income Tax e-Filing** — incometax.gov.in
5. **Passport Seva** — passportindia.gov.in
6. **DigiLocker** — digilocker.gov.in
7. **Vahan / Sarathi** — parivahan.gov.in
8. **MCA Portal** — mca.gov.in
9. **eShram** — eshram.gov.in
10. **National Scholarship Portal** — scholarships.gov.in
11. **PMJAY (Ayushman Bharat)** — pmjay.gov.in
12. **CBSE Results** — cbseresults.nic.in

---

## 6. Notify-Me Alert Flow

### Subscribe flow

1. User types site name (or selects from dropdown) in the central notify input.
2. User taps "Set alert."
3. Modal opens: "Enter your WhatsApp number" (Indian +91 only for V1, with country code prefix locked).
4. User enters mobile number → backend sends WhatsApp OTP via WhatsApp Cloud API (`authentication` template).
5. User enters 6-digit OTP → backend verifies.
6. On verify: subscription is created. User sees confirmation toast: "Alert set. We'll WhatsApp you when [Site] is back."
7. **Soft limit:** max 5 active alerts per verified number. 6th attempt requires user to remove one first.

### Trigger flow

1. Monitoring runner detects site transition to `Working` AND sustained for ≥5 min.
2. Worker fetches all `active` subscriptions for that site.
3. For each subscription, send a WhatsApp message via the approved `site_back_up` template:
   > _"✓ {Site Name} is working again. (downtimebhavan.in)_
   > _If you'd like to stop alerts for this site, reply STOP."_
4. Mark subscription as `triggered` (one-shot — users re-subscribe if they want another alert).
5. If WhatsApp API returns error for that number, mark `failed` and skip retries.

### Abuse prevention

- WhatsApp OTP verification mandatory.
- Phone number stored as **SHA-256 hash + server-side pepper** (env var). Plaintext phone is held in memory only during the active subscription's send-window, then discarded. We only retain the hash for de-dup.
- Max 5 active alerts per hashed number.
- Max 3 OTP requests per number per hour.
- Cloudflare Turnstile on the OTP request endpoint to block bots.
- IP rate-limit: max 10 OTP requests per IP per hour.

### Privacy posture

- We never share, sell, or repurpose the phone number.
- A `/privacy` page documents data handling per India's **DPDP Act 2023**.
- A `/delete-my-data` endpoint takes a phone number + WhatsApp OTP and purges all subscriptions for that hash.
- Sample retention: phone-number-hash deleted within 30 days of last subscription expiring/firing.

---

## 7. Janta Darbar (Public Pulse)

### Submission flow

1. User clicks "File a grievance" (right panel sticky CTA).
2. Modal/inline form: site dropdown + tag dropdown + 140-char textarea.
3. **Cloudflare Turnstile** challenge (invisible).
4. Submit → IP rate-limit: 5 grievances per IP per minute, 30 per hour.
5. Server runs a banned-word filter (custom list of profanity, slurs, communal language).
6. Server-side length check (≤140 chars).
7. Grievance is published to the live SSE stream immediately if it passes filters; flagged for review otherwise.

### Tag taxonomy

- `otp-not-coming`
- `error-5xx`
- `blank-page`
- `slow`
- `login-failed`
- `payment-failed`
- `other`

### Moderation

- **Post-moderation:** auto-publish on submit (after filters), then community report button on each grievance.
- 3 community reports → auto-hide pending review.
- Admin dashboard at `/admin` (password-protected, single admin token in env) shows queue.
- Hard-banned words list checked on submit (no rude language about specific people; satirical commentary about systems is fine).

### Real-time stream

- Server-Sent Events from `/api/pulse/stream`.
- Client receives new grievances as they're posted (after filters pass).
- Stream limited to last 60 minutes; older items paginated via `/api/pulse?before=…`.

### Effect on status

- If a site receives ≥20 grievances in any 10-minute window while auto-checks say `Working`, the site is auto-flagged `Degraded — Community` for 15 minutes.
- After 15 minutes, the flag clears if grievance rate drops below 5/10-min.
- This is transparent: the site's status card shows "Flagged by 20+ citizens" instead of the standard reason.

---

## 8. Tech Stack & Infrastructure

| Layer | Choice | Free? |
|---|---|---|
| VPS | **Oracle Cloud Always Free** (ARM, Mumbai region, 1 VM with 4 cores + 24GB RAM) | ✅ Always free |
| OS | Ubuntu 24.04 LTS | ✅ |
| Web framework | **Next.js 15** App Router + TypeScript + Tailwind v3 | ✅ OSS |
| Database | **SQLite** (file: `/var/lib/dtb/db.sqlite`) | ✅ OSS |
| DB backup | **Litestream** → **Cloudflare R2** (10GB free forever) | ✅ |
| Monitoring runner | **Node 22 + Playwright** as a systemd service running cron-like loops | ✅ OSS |
| CDN + DNS | **Cloudflare** (free tier) | ✅ |
| Captcha | **Cloudflare Turnstile** | ✅ free |
| Alerts → WhatsApp | **Meta WhatsApp Business Cloud API** (direct integration) | ✅ 1,000 utility conversations/month free, ~₹0.115/msg beyond |
| OTP delivery | Same WhatsApp Cloud API (`authentication` template) | ✅ same quota |
| Realtime | Server-Sent Events from Next.js | ✅ |
| Analytics | **Umami** self-hosted on same VM | ✅ OSS |
| Error tracking | **GlitchTip** self-hosted (Sentry-compatible API) on same VM | ✅ OSS |
| Donations | UPI ID + QR on `/donate`, plus GitHub Sponsors link | ✅ zero fees on UPI |
| Domain | downtimebhavan.in via NameCheap/GoDaddy | ❌ ~$10/year (only spend) |
| Source control | GitHub (public repo recommended for trust + donations) | ✅ |
| CI/CD | GitHub Actions deploying to VM via SSH | ✅ free |

### Repository layout (planned)

```
downtime-bhavan/
├── apps/
│   └── web/                  # Next.js app (site + API routes)
│       ├── app/
│       ├── components/
│       ├── lib/
│       └── public/
├── packages/
│   ├── monitor/              # Headless monitoring runner (Node + Playwright)
│   │   ├── src/
│   │   ├── runners/
│   │   └── package.json
│   ├── db/                   # SQLite schema + migrations + Drizzle ORM
│   └── shared/               # Shared types
├── config/
│   └── sites/                # 12 JSON files, one per tracked site
├── docs/
│   └── superpowers/
│       └── specs/            # This document and future specs
├── infra/
│   ├── systemd/              # Service unit files for monitor + web
│   └── litestream.yml
└── README.md
```

### Data model (SQLite)

```sql
-- Site definitions are file-based config (config/sites/*.json), seeded into:
CREATE TABLE sites (
  id TEXT PRIMARY KEY,           -- e.g. 'aadhaar-ssup'
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  config_json TEXT NOT NULL,     -- selectors etc.
  enabled INTEGER NOT NULL DEFAULT 1
);

-- Layer-1 (HTTP) and Layer-2 (headless) check results
CREATE TABLE checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id TEXT NOT NULL,
  checked_at INTEGER NOT NULL,   -- unix epoch ms
  layer TEXT NOT NULL,           -- 'http' | 'headless'
  result TEXT NOT NULL,          -- 'up' | 'degraded' | 'down'
  http_status INTEGER,
  latency_ms INTEGER,
  failure_reason TEXT,
  FOREIGN KEY (site_id) REFERENCES sites(id)
);
CREATE INDEX idx_checks_site_time ON checks(site_id, checked_at DESC);

-- Current/derived state per site (denormalized for fast reads)
CREATE TABLE site_status (
  site_id TEXT PRIMARY KEY,
  current_state TEXT NOT NULL,   -- 'working' | 'degraded' | 'down'
  state_since INTEGER NOT NULL,
  uptime_30d_pct REAL,
  last_check_at INTEGER,
  community_flag INTEGER DEFAULT 0,  -- 1 if currently flagged by reports
  FOREIGN KEY (site_id) REFERENCES sites(id)
);

-- Notify-me subscriptions
CREATE TABLE subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id TEXT NOT NULL,
  phone_hash TEXT NOT NULL,      -- SHA-256(phone + server pepper)
  phone_ciphertext TEXT,         -- encrypted phone for actually sending (decrypted at send)
  status TEXT NOT NULL,          -- 'pending_otp' | 'active' | 'triggered' | 'cancelled' | 'failed'
  created_at INTEGER NOT NULL,
  triggered_at INTEGER,
  FOREIGN KEY (site_id) REFERENCES sites(id)
);
CREATE INDEX idx_sub_site_status ON subscriptions(site_id, status);
CREATE INDEX idx_sub_phone_hash ON subscriptions(phone_hash);

-- OTP attempts (short-lived)
CREATE TABLE otp_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phone_hash TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used INTEGER DEFAULT 0,
  ip_addr TEXT
);

-- Janta Darbar grievances
CREATE TABLE grievances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id TEXT NOT NULL,
  tag TEXT NOT NULL,
  body TEXT NOT NULL,            -- ≤140 chars
  ip_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  visible INTEGER DEFAULT 1,     -- 0 if hidden by moderation
  reports_count INTEGER DEFAULT 0,
  FOREIGN KEY (site_id) REFERENCES sites(id)
);
CREATE INDEX idx_griev_site_time ON grievances(site_id, created_at DESC);
CREATE INDEX idx_griev_recent ON grievances(created_at DESC) WHERE visible = 1;

-- Reactions (😡 ✓same here)
CREATE TABLE reactions (
  grievance_id INTEGER NOT NULL,
  ip_hash TEXT NOT NULL,
  kind TEXT NOT NULL,            -- 'angry' | 'same'
  created_at INTEGER NOT NULL,
  PRIMARY KEY (grievance_id, ip_hash, kind),
  FOREIGN KEY (grievance_id) REFERENCES grievances(id)
);

-- Donations (manual reconciliation V1)
CREATE TABLE donations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  amount_inr REAL,
  source TEXT,                   -- 'upi' | 'github_sponsors'
  received_at INTEGER NOT NULL,
  note TEXT
);
```

### Component responsibilities

- **`apps/web`** — Next.js. Renders site, serves API for notify/grievance/SSE/donate, hosts admin dashboard.
- **`packages/monitor`** — separate Node process running as `dtb-monitor.service`. Runs two loops: HTTP ping loop (2-min interval) and headless loop (15-min interval). Writes to `checks` table. Derives `site_status` on each write.
- **`packages/db`** — Drizzle ORM schema + migrations. Used by both web and monitor.
- **WhatsApp webhook** — Next.js route at `/api/webhook/whatsapp` for receiving delivery status callbacks and the `STOP` keyword.

---

## 9. Donations

- **Primary:** UPI ID (TBD — user to provide) + QR code on `/donate` page.
- **Secondary:** GitHub Sponsors link.
- **Transparency block on `/donate`:**
  - Running monthly cost (currently ~₹0)
  - WhatsApp usage: `X of 1,000 free conversations used`
  - Total donations this month: ₹Y (from manual reconciliation)
  - List of monthly recurring costs (domain prorated, etc.)
- **Soft prompt:** Footer of every page contains "Funded by citizens · Donate" link.
- **No anonymous-donor wall (V1).** Donors are private unless they reach out.

---

## 10. Privacy & Legal Posture

- **Footer disclaimer everywhere:** "An unofficial observatory · Not affiliated with any government body."
- **`/privacy` page** documenting data handling per DPDP Act 2023:
  - Phone numbers: stored as SHA-256 hash + server pepper for de-dup; ciphertext (encrypted with AES-GCM, key in env var) for actual delivery; ciphertext purged 30 days after subscription resolves.
  - IPs: hashed for rate-limit + Janta Darbar de-dup; hashes kept 30 days, then purged.
  - Grievance text: retained indefinitely (it's public content).
- **`/methodology` page** documenting how we detect status, what "degraded" means, how community flags work. This is the trust-building page.
- **`/delete-my-data` endpoint:** user enters phone, gets WhatsApp OTP, confirms → all subscriptions and OTP records for that hash purged.
- **Robots.txt + sitemap.xml** to permit search engines.
- **No scraping or republishing of government data beyond uptime measurements** — the only data we publish about each site is our own check results and citizen-submitted grievances.

---

## 11. Out of V1 Scope (V1.1+ ideas)

- Leaderboard page (worst performers, hall of shame)
- Per-site detail page with full historical chart, incident log, RSS feed
- Telegram alerts
- Email alerts
- Browser push
- Mobile app
- Public API (read-only)
- Onion-style satirical news feed
- Mobile-optimized layout pass (V1 will be mobile-functional but desktop-first)
- Multilingual UI (Hindi-first toggle beyond the micro-touches)

---

## 12. V1 Prerequisites (Before Build)

These are external dependencies that must be in place before / during implementation:

| Item | Owner | Status |
|---|---|---|
| Buy domain `downtimebhavan.in` | User | Pending |
| Sign up for Oracle Cloud (Always Free tier, Mumbai region) | User | Pending |
| Get a dedicated Indian SIM for WhatsApp Business (₹200 one-time) | User | Pending |
| Set up Meta Business account + WhatsApp Cloud API access | User | Pending (1-2 day approval) |
| Get 2 WhatsApp message templates approved by Meta: `authentication`, `site_back_up` | User | Pending (1-2 day review per template) |
| Sign up for Cloudflare (free) — DNS + Turnstile + R2 | User | Pending |
| GitHub repo (public, e.g. `aman/downtime-bhavan`) | User | Pending |
| UPI ID for donations | User | Pending |

The implementation plan (next step) will detail tasks that don't depend on these prereqs vs tasks that do.

---

## 13. Open Questions / Decisions to Confirm Before Plan

None blocking. All major V1 decisions resolved during brainstorm:
- Visual design (v5 mockup) ✓
- Site list (12 sites) ✓
- Notify channel (WhatsApp only) ✓
- Abuse prevention (mobile + OTP) ✓
- Detection (hybrid HTTP + Playwright headless) ✓
- Stack (free-tier Oracle Cloud + Next.js + SQLite + WhatsApp Cloud API) ✓
- Donations (UPI primary) ✓
- Pulse design (Janta Darbar with Turnstile + post-moderation) ✓

---

## 14. Success Criteria for V1 Launch

- All 12 sites monitored with hybrid checks running every 2 min (HTTP) / 15 min (headless).
- Notify-me subscription end-to-end: user submits → OTP → confirms → site recovers → WhatsApp alert delivered. Tested manually for ≥3 of the 12 sites.
- Janta Darbar live feed with Turnstile, banned-word filter, rate-limits in place.
- 30-day uptime % begins showing real data (will start at "insufficient data" until 30 days pass).
- 24h sparkline shows real check data from day 1.
- Site is reachable at downtimebhavan.in with valid TLS.
- `/privacy`, `/methodology`, `/donate` pages live.
- `/delete-my-data` works.
- Disclaimer footer visible on every page.
- Sarkari Mode toggle functional (theme flip, no data change).
- Donations UPI QR live.

Launch readiness gates after build:
1. **2-week soak test** in staging with all 12 sites being monitored, fake alerts being triggered to a test number, before any public launch.
2. **Legal review** of `/privacy` and disclaimer text (user discretion; may skip for V1 but recommended).
3. **Soft launch on personal X/Reddit** before broad announcement to gauge response.

---

## 15. Future Work (V2+ Hints)

- **News feed** in fake-newspaper style ("The Daily Downtime") — Onion-style satirical pieces about specific outages
- **Leaderboard page** — "Worst Performing Sites of 2026"
- **Multi-region monitoring** — Bengaluru + Delhi checkpoints in addition to Mumbai, for geolocation accuracy
- **API & RSS feeds** for journalists and researchers
- **Public dataset** of historical outages (CSV downloads)
- **WhatsApp group / community channel** for high-frequency users
- **Premium tier?** TBD — likely never; this stays free.

---

*End of spec.*
