# Architecture skeleton: monorepo, auth, offline + realtime infra

Labels: enhancement, ready-for-agent
Type: HITL
Status: ready-for-agent

## Parent

[0001-prd.md](0001-prd.md) — Orion's Cookbook

## What to build

Stand up the walking skeleton that every later slice builds on, and prove the full request path
end-to-end without yet shipping a real feature. This is a HITL slice: the monorepo layout, Docker
packaging, auth scheme, and the Dexie-outbox + WebSocket sync pattern established here are copied by
every subsequent slice, so they get a human review before propagating.

Set up a pnpm workspace with `packages/core` (shared TS types + Zod schemas), `apps/server`
(Fastify + Prisma + `ws`), and `apps/web` (React + Vite PWA). Fastify serves the built web assets,
a JSON REST API, and a WebSocket endpoint from one process, packaged as a single Docker image with
a mounted SQLite volume (cloudflared runs separately). Implement shared-password auth (`APP_PASSWORD`
+ `APP_SECRET` env), issuing a signed token that the device caches and that works offline after first
login. Implement the generic client sync layer: a Dexie mirror of server data, an outbox of pending
write ops applied optimistically, replayed on reconnect with last-write-wins on a client timestamp,
plus a Workbox/vite-plugin-pwa service worker so the app boots offline. Implement the server WS hub
that broadcasts entity changes to all connected clients. Prove all of this with one minimal sample
record round-tripping through the whole stack.

## Acceptance criteria

- [ ] pnpm monorepo with `packages/core`, `apps/server`, `apps/web` builds with one command
- [ ] Single Docker image runs the app; SQLite persists on a mounted volume; `docker compose up` works
- [ ] Logging in with the shared password issues a token; missing/invalid token is rejected on REST and WS
- [ ] The PWA is installable and boots offline (app shell cached) once logged in
- [ ] A sample write made offline is queued in the outbox and syncs to the server on reconnect (last-write-wins)
- [ ] A change in one connected client appears live in a second client via WebSocket
- [ ] Currency is configured as RON and units metric app-wide
- [ ] HITL review of monorepo layout, auth scheme, and sync pattern completed before merge

## Blocked by

None - can start immediately
