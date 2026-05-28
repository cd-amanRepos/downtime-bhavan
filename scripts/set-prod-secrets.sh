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
