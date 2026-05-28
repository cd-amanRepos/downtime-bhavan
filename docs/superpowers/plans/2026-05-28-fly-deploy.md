# Plan 7 — Fly.io Mumbai Deploy

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **IMPORTANT — Some steps touch external services (Fly.io API, Cloudflare DNS, the user's domain registrar).** Those steps are **user-side** and must NOT be run by implementer subagents. They are clearly marked `(USER)`. The implementer prepares the artifacts (Dockerfile, fly.toml, scripts, instructions) and stops; the human runs the deploy commands and provisions DNS.

**Goal:** Take the local v0.5.0 build and put it on the public internet at `https://downtimebhavan.in`, running on a Fly.io VM in Mumbai with a real Indian IP, persistent SQLite volume, Cloudflare DNS in front for caching + TLS termination, and a working notify-me flow.

**Architecture:**
- One Fly.io VM in `bom` (Mumbai) region.
- Two processes on the same VM (defined in `fly.toml`'s `[processes]`): `web` (Next.js server on port 3210) + `monitor` (the tick daemon).
- Persistent volume `/data` (1 GB to start) mounted at `/var/lib/dtb` — that's where `dtb.sqlite` lives.
- DNS at the **domain registrar** (NameCheap / GoDaddy / wherever) pointing A/AAAA records directly at Fly's IPv4/IPv6. **No Cloudflare for V1** — added later if/when traffic warrants CDN + DDoS scrubbing.
- TLS via Fly's automatic Let's Encrypt cert (free).
- All secrets via `fly secrets set` — never committed.

**Tech stack additions:**
- Multi-stage Dockerfile (Node 22 alpine base for runtime, ~150 MB)
- `fly.toml` with `[processes]` defining web + monitor

**Builds on:** `v0.5.0-notify` (commit `9f19d74`).

**Assumed user-side prerequisites:**
- ✅ `flyctl` installed and authenticated (`flyctl auth whoami` succeeds)
- ✅ Domain `downtimebhavan.in` purchased
- ⏳ Access to the domain registrar's DNS panel (to add A/AAAA records)
- ⏳ Meta WhatsApp Business (V1 ships in DryRun mode; real Meta creds can be added later via `fly secrets set` without redeploy)

**Deferred to post-launch (Plan 8+):**
- Cloudflare account → CDN + DDoS scrubbing + Turnstile prod keys + R2 backups. Added if/when traffic + abuse warrant it.
- Litestream → R2 continuous backup. Fly volume snapshots (built-in, weekly via cron) cover V1.
- Production Turnstile keys. Dev test keys auto-pass — the IP rate limit (5/min, 30/hr per IP) is the actual abuse defender.

---

## File structure (additions)

```
downtime-bhavan/
├── Dockerfile                       # NEW multi-stage build
├── .dockerignore                    # NEW
├── fly.toml                         # NEW Fly app config
├── scripts/
│   ├── docker-entrypoint.sh         # NEW chooses web/monitor based on FLY_PROCESS_GROUP
│   └── set-prod-secrets.sh          # NEW (USER) one-liner to push all secrets
└── docs/deploy/
    └── DEPLOY.md                    # NEW deployment runbook
```

---

## Task 1 — Dockerfile + entrypoint

**Files:**
- Create: `Dockerfile`, `.dockerignore`, `scripts/docker-entrypoint.sh`

- [ ] **Step 1: `.dockerignore`**

```
node_modules
**/node_modules
**/dist
**/.next
**/coverage
**/.turbo
.env
.env.local
.env.production
data/
*.sqlite
*.sqlite-*
*.db*
.git
.github
.superpowers/
.playwright-report/
test-results/
docs/
LICENSE
README.md
*.log
**/tsconfig.tsbuildinfo
```

- [ ] **Step 2: Dockerfile (multi-stage, Node 22 alpine)**

```dockerfile
# syntax=docker/dockerfile:1.7

# ───────── Stage 1: dependency install ─────────
FROM node:22-alpine AS deps
RUN apk add --no-cache python3 make g++ sqlite-dev
WORKDIR /app

# Copy workspace manifests only (for cache layering)
COPY package.json package-lock.json* ./
COPY apps/web/package.json ./apps/web/
COPY packages/db/package.json ./packages/db/
COPY packages/monitor/package.json ./packages/monitor/
COPY packages/shared/package.json ./packages/shared/

RUN npm ci --include=dev

# ───────── Stage 2: build ─────────
FROM node:22-alpine AS builder
RUN apk add --no-cache python3 make g++ sqlite-dev
WORKDIR /app

# Copy installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules

# Copy source
COPY . .

# Build Next.js standalone output
RUN npm run -w @dtb/web build

# Prune dev dependencies and re-install only production
# (the standalone build copies what it needs but we still need tsx + monitor deps)
# Easier: keep all node_modules; the alpine image stays small enough.

# ───────── Stage 3: runtime ─────────
FROM node:22-alpine AS runtime
RUN apk add --no-cache sqlite tini
WORKDIR /app

ENV NODE_ENV=production
ENV DTB_DB_PATH=/data/dtb.sqlite
ENV DTB_WEB_PORT=3210

# Copy everything we need for both processes
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/apps/web ./apps/web
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/config ./config
COPY scripts/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Volume mount point for SQLite
RUN mkdir -p /data

EXPOSE 3210
ENTRYPOINT ["/sbin/tini", "--", "/docker-entrypoint.sh"]
```

- [ ] **Step 3: `scripts/docker-entrypoint.sh`**

```bash
#!/bin/sh
set -e

# Fly passes process group name in FLY_PROCESS_GROUP
PROC="${FLY_PROCESS_GROUP:-web}"

case "$PROC" in
  web)
    # Run migrations + seed at startup (idempotent)
    echo "[entrypoint] running migrations..."
    npm run db:migrate
    echo "[entrypoint] seeding sites..."
    npm run db:seed || echo "[entrypoint] seed warning (continuing)"
    echo "[entrypoint] starting web on port ${DTB_WEB_PORT:-3210}..."
    exec npm run -w @dtb/web start
    ;;
  monitor)
    echo "[entrypoint] starting monitor daemon..."
    # Migrate runs on the web process; monitor just opens the DB
    # Give web a chance to migrate first
    sleep 8
    exec npx -w @dtb/monitor tsx src/index.ts
    ;;
  *)
    echo "[entrypoint] unknown process: $PROC"
    exit 1
    ;;
esac
```

- [ ] **Step 4: Local build test**

```bash
cd /Users/woofwoof/Desktop/govt-website-tracker
docker build -t dtb:test . 2>&1 | tail -20
```

Expected: image builds, final stage runtime is < 300 MB.

NOTE: Local docker build is optional — if Docker isn't installed locally, skip this step. `fly deploy` will build in the cloud.

- [ ] **Step 5: Commit**

```bash
git add Dockerfile .dockerignore scripts/docker-entrypoint.sh
git commit -m "$(cat <<'EOF'
feat(deploy): multi-stage Dockerfile + entrypoint

Three-stage build (deps → build → runtime) on Node 22 alpine.
Final runtime image ~150 MB. Entrypoint dispatches based on
FLY_PROCESS_GROUP — 'web' migrates+seeds+starts Next; 'monitor'
runs the tick daemon.
EOF
)"
```

---

## Task 2 — fly.toml with web + monitor processes

**Files:**
- Create: `fly.toml`

- [ ] **Step 1: fly.toml**

```toml
# fly.toml — Downtime Bhavan

app = "downtime-bhavan"
primary_region = "bom"      # Mumbai

[build]
  dockerfile = "Dockerfile"

[env]
  NODE_ENV = "production"
  DTB_DB_PATH = "/data/dtb.sqlite"
  DTB_CONFIG_DIR = "/app/config/sites"
  DTB_WEB_PORT = "3210"
  DTB_TICK_MS = "120000"

[[mounts]]
  source = "dtb_data"
  destination = "/data"

[processes]
  web = "/docker-entrypoint.sh"
  monitor = "/docker-entrypoint.sh"

[[services]]
  processes = ["web"]
  internal_port = 3210
  protocol = "tcp"
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 1

  [[services.ports]]
    port = 80
    handlers = ["http"]
    force_https = true

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

  [services.concurrency]
    type = "connections"
    hard_limit = 250
    soft_limit = 200

[[vm]]
  size = "shared-cpu-1x"
  memory = "512mb"
  processes = ["web", "monitor"]
```

- [ ] **Step 2: Commit**

```bash
git add fly.toml
git commit -m "$(cat <<'EOF'
feat(deploy): fly.toml with web + monitor processes on Mumbai shared-cpu-1x

512 MB RAM, single shared-cpu-1x VM running both web (port 3210) and
monitor processes. Persistent volume 'dtb_data' mounted at /data for
the SQLite file. force_https for browsers; min_machines_running=1 so
the monitor never gets reaped.
EOF
)"
```

---

## Task 3 — Production secrets script + DEPLOY runbook

**Files:**
- Create: `scripts/set-prod-secrets.sh`, `docs/deploy/DEPLOY.md`

- [ ] **Step 1: `scripts/set-prod-secrets.sh`**

```bash
#!/bin/bash
# scripts/set-prod-secrets.sh
# One-shot script to push all required secrets to Fly.
# USER runs this once before first deploy, then again only when rotating.
# Do NOT commit a filled-in version. Use as a template.

set -e

if ! command -v flyctl >/dev/null; then
  echo "flyctl not found. Install: https://fly.io/docs/flyctl/install/"
  exit 1
fi

# Required: generate strong secrets
if [ -z "$DTB_ADMIN_TOKEN" ]; then
  DTB_ADMIN_TOKEN=$(openssl rand -hex 32)
  echo "Generated DTB_ADMIN_TOKEN: $DTB_ADMIN_TOKEN  (SAVE THIS — you log in with it)"
fi
if [ -z "$DTB_IP_PEPPER" ]; then
  DTB_IP_PEPPER=$(openssl rand -hex 32)
fi
if [ -z "$DTB_OTP_PEPPER" ]; then
  DTB_OTP_PEPPER=$(openssl rand -hex 32)
fi
if [ -z "$DTB_PHONE_PEPPER" ]; then
  DTB_PHONE_PEPPER=$(openssl rand -hex 32)
fi
if [ -z "$DTB_PHONE_ENC_KEY" ]; then
  # AES-256-GCM needs exactly 32 bytes. The verify route slices/pads.
  DTB_PHONE_ENC_KEY=$(openssl rand -hex 16)  # 32 hex chars = 32 bytes
fi
if [ -z "$DTB_WA_WEBHOOK_VERIFY_TOKEN" ]; then
  DTB_WA_WEBHOOK_VERIFY_TOKEN=$(openssl rand -hex 16)
fi

# Optional: WhatsApp Cloud API (DryRun mode used if unset)
# DTB_WA_PHONE_NUMBER_ID=
# DTB_WA_TOKEN=

# Optional: Donations (UPI ID for /donate)
DTB_UPI_ID="${DTB_UPI_ID:-downtimebhavan@oksbi}"
DTB_GH_SPONSORS="${DTB_GH_SPONSORS:-}"

# Optional: Turnstile prod keys (dev keys are public, fine for V1 launch)
# NEXT_PUBLIC_TURNSTILE_SITEKEY needs to be set at BUILD time as a public
# env var; set via fly secrets is fine — Next bundles it into client code.
# DTB_TURNSTILE_SECRET=

# Push to Fly
flyctl secrets set --app downtime-bhavan \
  DTB_ADMIN_TOKEN="$DTB_ADMIN_TOKEN" \
  DTB_IP_PEPPER="$DTB_IP_PEPPER" \
  DTB_OTP_PEPPER="$DTB_OTP_PEPPER" \
  DTB_PHONE_PEPPER="$DTB_PHONE_PEPPER" \
  DTB_PHONE_ENC_KEY="$DTB_PHONE_ENC_KEY" \
  DTB_WA_WEBHOOK_VERIFY_TOKEN="$DTB_WA_WEBHOOK_VERIFY_TOKEN" \
  DTB_UPI_ID="$DTB_UPI_ID"

[ -n "$DTB_GH_SPONSORS" ] && flyctl secrets set --app downtime-bhavan DTB_GH_SPONSORS="$DTB_GH_SPONSORS"

echo ""
echo "✓ Secrets pushed. Run 'fly secrets list --app downtime-bhavan' to verify."
echo ""
echo "⚠ Save your DTB_ADMIN_TOKEN — it's the login for /admin"
```

- [ ] **Step 2: `docs/deploy/DEPLOY.md`**

```markdown
# Deploying Downtime Bhavan to Fly.io Mumbai

V1 deployment runbook. Estimated time: 30-40 minutes (mostly waiting for Cloudflare DNS).

## Prerequisites (USER)

- [x] flyctl installed + authenticated (`fly auth whoami` works)
- [x] Domain `downtimebhavan.in` purchased
- [ ] Access to the domain registrar's DNS panel
- [ ] Optional: Meta Business + WhatsApp Cloud API for production OTP delivery (V1 launches in DryRun; real WA can be added later)

## Step 1: Create the Fly app (one-time)

```bash
cd /path/to/downtime-bhavan
fly apps create downtime-bhavan --org personal  # or your org
fly volumes create dtb_data --size 1 --region bom --app downtime-bhavan
```

## Step 2: Push secrets (one-time, or to rotate)

```bash
chmod +x scripts/set-prod-secrets.sh
./scripts/set-prod-secrets.sh
# Note the DTB_ADMIN_TOKEN printed — that's your /admin login.
```

## Step 3: First deploy

```bash
fly deploy --app downtime-bhavan --strategy immediate
```

The build runs on a Fly remote builder (no local Docker needed). First deploy
takes ~5-8 minutes. Subsequent deploys ~2-3 minutes due to layer caching.

Check status:

```bash
fly status --app downtime-bhavan
fly logs --app downtime-bhavan
```

Expected: both `web` and `monitor` processes running.

Get the Fly-assigned URL:

```bash
fly apps open --app downtime-bhavan   # opens https://downtime-bhavan.fly.dev
```

Visit the URL — you should see the homepage rendering with Aadhaar data.

## Step 4: Custom domain + TLS

```bash
fly certs create downtimebhavan.in --app downtime-bhavan
fly certs create www.downtimebhavan.in --app downtime-bhavan
```

Get the DNS records you need:

```bash
fly certs show downtimebhavan.in --app downtime-bhavan
```

You'll see something like:
- A: `<fly IPv4>` (apex)
- AAAA: `<fly IPv6>` (apex)
- ACME challenge: `_acme-challenge.downtimebhavan.in CNAME ...` (for verification)

## Step 5: Registrar DNS (USER)

Log into the dashboard at the registrar where you bought `downtimebhavan.in`
(NameCheap, GoDaddy, etc.) and find the DNS records / advanced DNS panel.

Add these 4 records:

| Type | Host | Value | TTL |
|---|---|---|---|
| A | `@` | `<Fly IPv4 from "fly certs show">` | Automatic / 300 |
| AAAA | `@` | `<Fly IPv6 from "fly certs show">` | Automatic / 300 |
| CNAME | `www` | `downtime-bhavan.fly.dev` | Automatic / 300 |
| CNAME | `_acme-challenge` | `<ACME target from "fly certs show">` | Automatic / 300 |

Save. DNS propagation: anywhere from 5 min to 24h. Usually < 1h.

Check propagation:

```bash
dig +short A downtimebhavan.in
dig +short AAAA downtimebhavan.in
```

When you see Fly's IPs in the output, DNS is live.

## Step 6: Wait for TLS cert

```bash
# Poll until "Certificate Status: Ready"
fly certs show downtimebhavan.in --app downtime-bhavan
```

Once ready, visit https://downtimebhavan.in. You should see the live site.

## Step 7: Production smoke test

```bash
# Public homepage
curl -s -o /dev/null -w "%{http_code}\n" https://downtimebhavan.in/
# Public API
curl -s https://downtimebhavan.in/api/status | jq '.sites | length'
# Static pages
for p in /methodology /api /press /contact /privacy /donate /departments /janta-darbar /leaderboard; do
  echo "$p: $(curl -s -o /dev/null -w '%{http_code}' https://downtimebhavan.in$p)"
done
# Admin redirect
curl -s -o /dev/null -w "%{http_code}\n" https://downtimebhavan.in/admin
```

Expected: 200 / 200 / all 200s / 307 (redirect to /admin/login).

## Step 8: Switch WhatsApp to Cloud API (optional, post-Meta-approval)

Once your Meta Business account + WhatsApp templates are approved:

```bash
fly secrets set --app downtime-bhavan \
  DTB_WA_PHONE_NUMBER_ID=<from Meta dashboard> \
  DTB_WA_TOKEN=<long-lived access token>
# No redeploy needed — adapters re-resolve via env at request time
```

Test the notify-me flow end-to-end with your real WhatsApp number.

## Rolling back

```bash
fly releases --app downtime-bhavan
fly deploy --image registry.fly.io/downtime-bhavan:deployment-<release-id> --app downtime-bhavan
```

## SSH into the VM

```bash
fly ssh console --app downtime-bhavan
# Then inside:
ls -la /data           # SQLite file
cat /tmp/dtb-whatsapp.log   # OTP log when in DryRun
sqlite3 /data/dtb.sqlite "SELECT COUNT(*) FROM checks;"
```
```

- [ ] **Step 3: Commit**

```bash
chmod +x scripts/set-prod-secrets.sh
git add scripts/set-prod-secrets.sh docs/deploy/DEPLOY.md
git commit -m "$(cat <<'EOF'
docs(deploy): production secrets script + DEPLOY runbook

set-prod-secrets.sh generates strong random values for all peppers/keys
on first run and pushes via flyctl secrets set. DEPLOY.md is the human
runbook: app create → volume → secrets → deploy → custom domain →
Cloudflare DNS → TLS wait → smoke test → flip proxy on.
EOF
)"
```

---

## Task 4 — README update with deploy section

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Append a Deploy section**

After the existing Architecture section, add:

```markdown
## Deploy to Fly.io

Single VM in Mumbai. Both web + monitor processes run on one machine
sharing a 1 GB persistent volume for the SQLite file.

See [`docs/deploy/DEPLOY.md`](docs/deploy/DEPLOY.md) for the full runbook.

Quick summary:

```bash
fly apps create downtime-bhavan
fly volumes create dtb_data --size 1 --region bom --app downtime-bhavan
./scripts/set-prod-secrets.sh       # generates + pushes secrets
fly deploy --app downtime-bhavan
fly certs create downtimebhavan.in --app downtime-bhavan
# Add A/AAAA/CNAME at Cloudflare per the runbook
```

V1 launches in WhatsApp DryRun mode (OTPs go to the VM's `/tmp/dtb-whatsapp.log`).
Real WhatsApp delivery activates the moment you `fly secrets set DTB_WA_TOKEN=...`.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README deploy section + link to runbook"
```

---

## Task 5 — Deployment (USER)

(USER) These steps require flyctl + Cloudflare account interaction.
Implementer subagent does NOT run any of these. Implementer's job ends at Task 4.

The USER:

- [ ] **Step 1:** Run `fly apps create downtime-bhavan` (or whatever name)
- [ ] **Step 2:** Run `fly volumes create dtb_data --size 1 --region bom --app downtime-bhavan`
- [ ] **Step 3:** Run `./scripts/set-prod-secrets.sh` — SAVE the printed `DTB_ADMIN_TOKEN`
- [ ] **Step 4:** Run `fly deploy --app downtime-bhavan`
- [ ] **Step 5:** Open `https://downtime-bhavan.fly.dev` to verify the staging URL works
- [ ] **Step 6:** Run `fly certs create downtimebhavan.in --app downtime-bhavan` and `fly certs create www.downtimebhavan.in --app downtime-bhavan`
- [ ] **Step 7:** Run `fly certs show downtimebhavan.in --app downtime-bhavan` and copy the A/AAAA/ACME values
- [ ] **Step 8:** Log into your domain registrar's DNS panel and add the 4 records (A, AAAA, two CNAMEs) per `DEPLOY.md` Step 5
- [ ] **Step 9:** Wait for cert: `fly certs show downtimebhavan.in --app downtime-bhavan` until Ready (also verify DNS via `dig +short A downtimebhavan.in`)
- [ ] **Step 10:** Visit `https://downtimebhavan.in` — confirm site loads with valid TLS
- [ ] **Step 11:** Run the curl smoke test from `DEPLOY.md` Step 7
- [ ] **Step 12:** Test the homepage notify-me flow with your own phone (DryRun — check Fly logs for the OTP)
- [ ] **Step 13:** Log into `/admin` with the DTB_ADMIN_TOKEN and verify the dashboard works

When all 13 are green: the product is LIVE.

---

## Task 6 — Tag v1.0.0-live + final commit

**Files:**
- Modify: `package.json` (version), `README.md` (Status: LIVE)

- [ ] **Step 1: Update README Status line**

Change `**Status:** under development (V1 walking skeleton in progress)` to:

```
**Status:** Live at https://downtimebhavan.in 🚀
```

Change `**Live:** not yet` to:

```
**Live:** https://downtimebhavan.in
```

- [ ] **Step 2: Bump version + tag**

```bash
npm version 1.0.0 --no-git-tag-version
git add package.json package-lock.json README.md
git commit -m "$(cat <<'EOF'
release: v1.0.0 — LIVE

Plan 7 complete. Downtime Bhavan is in production at downtimebhavan.in
on Fly.io Mumbai. Single shared-cpu-1x VM with persistent volume,
registrar DNS pointing directly at Fly, Let's Encrypt TLS.

V1 shipping:
- 1 site monitored (Aadhaar SSUP) — Plan 2 adds 11 more
- Janta Darbar live grievance feed + reactions + moderation
- 10 informational sub-routes (departments, leaderboard, etc.)
- Admin dashboard at /admin (token-gated)
- WhatsApp notify-me end-to-end (DryRun by default; Cloud API when
  DTB_WA_TOKEN is set)
- /delete-my-data with OTP verify

Citizens-funded, ad-free, AGPL-3.0, hosted on the same continent
the data describes.
EOF
)"
git tag v1.0.0
git tag --list
```

- [ ] **Step 3: Push to GitHub (optional)**

If you want a public repo:

```bash
gh repo create downtime-bhavan --public --source . --remote origin --push
git push origin --tags
```

---

## Self-Review

**Coverage of Plan 1-6 features going live:**
- ✅ Backend monitor with HTTP probe + state machine + recovery dispatcher
- ✅ SQLite + Drizzle on persistent volume
- ✅ Web app with all routes
- ✅ Admin dashboard via DTB_ADMIN_TOKEN
- ✅ Notify-me (DryRun by default — works without external services)
- ✅ Janta Darbar grievance feed
- ✅ Donations UPI page

**Things explicitly NOT in V1 launch:**
- Cloudflare (no account, no proxy, no Turnstile prod keys). Added in Plan 8 when traffic + abuse signal it's warranted.
- Litestream backup → R2. `fly volumes snapshots create` (built-in, manual or weekly cron) covers V1.
- Production Turnstile keys. Dev keys auto-pass — IP rate limit (5/min, 30/hr per IP) is the real abuse defender.
- Umami analytics.
- GlitchTip error tracking.
- GitHub Actions auto-deploy.
- 11 additional sites (Plan 2 — slot in after launch).
- Real WhatsApp Cloud API (DryRun is fine until you have Meta approval; the switch is one `fly secrets set` away).

**Deploy safety:**
- All secrets via `fly secrets set` — never in fly.toml or Dockerfile
- Migrations run idempotently on every web boot
- Monitor sleeps 8s before opening DB to let web migrate first
- min_machines_running=1 keeps monitor alive
- force_https on services for browser traffic

---

## Execution Handoff

After this plan completes: the project is **LIVE**.

Two execution options:

1. **Subagent-driven (recommended for the 4 prep tasks)** — fresh subagent per task for Tasks 1-4 + 6. Task 5 is USER-only and cannot be subagent-driven.
2. **Inline execution** — execute Tasks 1-4 + 6 inline. Same outcome.

Either way, Task 5 (deployment) is a human-in-the-loop sequence.
