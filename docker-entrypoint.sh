#!/bin/sh
set -e

# Apply any pending Prisma migrations against the mounted SQLite volume, creating the
# database file on first run, then start the server.
cd /app/apps/server
pnpm exec prisma migrate deploy

cd /app
exec node apps/server/dist/index.js
