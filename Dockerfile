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
# (npm workspaces hoists everything to root; apps/web/node_modules is empty)
COPY --from=deps /app/node_modules ./node_modules

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
