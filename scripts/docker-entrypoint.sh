#!/bin/sh
set -e

# Single-container model: run BOTH web and monitor inside the same VM so they
# share the SQLite file via the persistent volume mounted at /data.
# Volumes on Fly cannot be shared across machines, so [processes] in fly.toml
# would create separate machines that can't see each other's writes.

# Idempotent: drizzle migrate is a no-op on subsequent boots; seed upserts.
echo "[entrypoint] running migrations..."
npm run db:migrate || true
echo "[entrypoint] seeding sites..."
npm run db:seed || echo "[entrypoint] seed warning (continuing)"

# Start the monitor as a background process with prefixed logs
echo "[entrypoint] starting monitor in background..."
( npx -w @dtb/monitor tsx src/index.ts 2>&1 | sed 's/^/[monitor] /' ) &
MONITOR_PID=$!

# Propagate signals so Fly can shut us down cleanly
trap "echo '[entrypoint] received signal — stopping'; kill -TERM $MONITOR_PID 2>/dev/null; wait $MONITOR_PID 2>/dev/null; exit 0" TERM INT

# Run web in foreground (replaces shell so tini reaps zombies correctly)
echo "[entrypoint] starting web on port ${DTB_WEB_PORT:-3210}..."
exec npm run -w @dtb/web start
