# Backlog

What's queued up for post-v1.3.0. Roughly ordered by impact-per-effort. Not a roadmap, just a list — pick whichever serves the moment.

## Per-site HTML selector tuning  (high impact, ongoing)

All 12 site configs in `config/sites/*.json` currently have empty `selectors.mustExist` and `selectors.mustNotExist` arrays. The HTML layer-2 check still catches:

- Empty bodies
- Non-HTML content types
- HTTP error codes

But not "the page loads with a `<div class="error">Service unavailable</div>` banner inside otherwise-clean HTML". To catch those, each site needs hand-tuned selectors. This is an **ongoing observation task** — best done when a site is actually broken in the wild, not upfront.

**Per-site workflow:**

1. Wait until a site is misbehaving (or visit it suspecting it is — Indian govt portals oblige).
2. Open dev tools, find the error pattern: a CSS class, an inline text string, a missing key element.
3. Add to that site's JSON config:
   ```json
   "selectors": {
     "mustExist": ["form#login"],            // present on healthy page
     "mustNotExist": ["text=Service unavailable", ".server-error"]
   }
   ```
4. `npm run db:seed && fly deploy --app downtime-bhavan`. No code change.

**Sites to tune (none yet):**

- [ ] `aadhaar-ssup` — UIDAI portal
- [ ] `epfo-member` — EPFO member login
- [ ] `gst-portal` — GST services login
- [ ] `income-tax` — Income Tax e-Filing
- [ ] `passport-seva` — Passport Seva
- [ ] `digilocker` — DigiLocker
- [ ] `parivahan` — Vahan/Sarathi
- [ ] `mca` — MCA portal
- [ ] `eshram` — eShram
- [ ] `scholarships` — National Scholarship Portal
- [ ] `pmjay` — PMJAY
- [ ] `cbse-results` — CBSE Results (only relevant May-July when results drop)

## Other queued work

### Plan 8.1 — Resend domain verification
Domain added in Resend; finish SPF / DKIM / DMARC records at registrar so `alerts@downtimebhavan.in` is fully verified for deliverability. Inbox placement rate jumps significantly.

### WhatsApp adapter activation
Code path is in `packages/monitor/src/whatsapp-send.ts` + `apps/web/lib/whatsapp-cloud.ts`. The day Meta approves both templates (`otp_verify` + `site_back_up`):
```bash
fly secrets set --app downtime-bhavan DTB_WA_PHONE_NUMBER_ID=... DTB_WA_TOKEN=...
```
No code change. Flip the homepage hero copy from "email alert" back to "WhatsApp" and the "WhatsApp coming soon" pill goes away.

### Cloudflare prod Turnstile keys
Current setup uses Cloudflare's invisible test sitekey — auto-passes, no real bot protection. Spam will eventually show up in `/admin/grievances`. When it does:
1. Sign up at cloudflare.com, register `downtimebhavan.in` for Turnstile.
2. `fly secrets set --app downtime-bhavan NEXT_PUBLIC_TURNSTILE_SITEKEY=0x... DTB_TURNSTILE_SECRET=0x...`
3. `fly deploy` (NEXT_PUBLIC_ is build-time, needs rebuild).

### Litestream → R2 SQLite backup
Becomes worth it once there's a meaningful volume of grievances + subscriptions in `data/dtb.sqlite`. Fly auto-snapshots the volume daily (5-day retention) which covers V1.

### Plan 9 — SEO Track B (content)
Per-site evergreen content (600+ words per portal, FAQ, structured copy). `/methodology` rewrite as a white paper. `/press` content. `/about` real operator bio. Track A (sitemap, schema, OG, metadata, manifest) already shipped via `v1.2.0-seo-foundation`.

### Selector observation tooling (V2)
A future `/admin/observations` page could periodically save raw HTML responses + screenshots to /data for sites that recently transitioned to degraded. Makes the "find the right selector" step much faster than visiting each portal manually.
