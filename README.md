# Downtime Bhavan · डाउनटाइम भवन

An unofficial public observatory of India's most-used government websites.

**Status:** Live at https://downtimebhavan.in
**Live:** https://downtimebhavan.in
**Design spec:** [docs/superpowers/specs/2026-05-28-downtime-bhavan-design.md](docs/superpowers/specs/2026-05-28-downtime-bhavan-design.md)

## Local development

```bash
nvm use            # uses Node 22 LTS
npm install
npm run db:migrate
npm run db:seed
npm run dev        # starts monitor + web concurrently
```

Open http://localhost:3210. Override with `DTB_WEB_PORT=4242 npm run dev`.

## Architecture

Monorepo with npm workspaces:
- `apps/web` — Next.js 15 public site
- `packages/db` — SQLite schema (Drizzle ORM)
- `packages/monitor` — Node service that probes sites every 2 min
- `packages/shared` — cross-package TypeScript types

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
# Add A/AAAA/CNAME at your registrar's DNS panel per the runbook
```

V1 launches in WhatsApp DryRun mode (OTPs go to the VM's `/tmp/dtb-whatsapp.log`).
Real WhatsApp delivery activates the moment you `fly secrets set DTB_WA_TOKEN=...`.

## License

AGPL-3.0 — see [LICENSE](LICENSE). Citizens-funded project. Commercial forks must remain open-source.

> Not affiliated with any government body.
