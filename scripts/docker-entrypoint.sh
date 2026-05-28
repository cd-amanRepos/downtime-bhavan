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
