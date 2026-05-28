# Downtime Bhavan · डाउनटाइम भवन

An unofficial public observatory of India's most-used government websites.

**Status:** under development (V1 walking skeleton in progress)
**Live:** not yet
**Design spec:** [docs/superpowers/specs/2026-05-28-downtime-bhavan-design.md](docs/superpowers/specs/2026-05-28-downtime-bhavan-design.md)

## Local development

```bash
nvm use            # uses Node 22 LTS
npm install
npm run db:migrate
npm run db:seed
npm run dev        # starts monitor + web concurrently
```

Open http://localhost:3000.

## Architecture

Monorepo with npm workspaces:
- `apps/web` — Next.js 15 public site
- `packages/db` — SQLite schema (Drizzle ORM)
- `packages/monitor` — Node service that probes sites every 2 min
- `packages/shared` — cross-package TypeScript types

## License

AGPL-3.0 — see [LICENSE](LICENSE). Citizens-funded project. Commercial forks must remain open-source.

> Not affiliated with any government body.
