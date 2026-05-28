# Deploying Downtime Bhavan to Fly.io Mumbai

V1 deployment runbook. Estimated time: 30-40 minutes (mostly waiting for DNS propagation).

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
