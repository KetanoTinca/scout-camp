# Orion's Cookbook — agent guide

Self-hosted PWA for running scout-camp food logistics (recipes, camp menus, shopping,
inventory, spending) for a 2–3 person team. Offline-first on phones at camp, live-syncing
between leaders when online, behind a single shared password and a Cloudflare tunnel.

The full spec lives in [.scratch/orions-cookbook/0001-prd.md](.scratch/orions-cookbook/0001-prd.md);
each numbered file there is a vertical slice. This skeleton is slice **0002**; the `Note`
entity is throwaway scaffolding that proves the stack, replaced by real entities in later slices.

## Monorepo layout (pnpm workspace)

- **`packages/core`** — shared, **pure** TypeScript: Zod schemas + types, the sync protocol,
  the last-write-wins rule (`shouldApply`), and locale config (RON / metric). No I/O, no
  framework imports. Imported by both server and web so they agree on shapes and math.
- **`apps/server`** — Fastify + Prisma (SQLite) + `@fastify/websocket`. One process serves
  the JSON REST API, the WebSocket endpoint, **and** the built web assets.
- **`apps/web`** — React + Vite PWA. Dexie (IndexedDB) mirror of server data + an outbox of
  pending writes; service worker (`vite-plugin-pwa`) caches the app shell for offline boot.

## Commands

Run from the repo root.

| Command | What it does |
|---|---|
| `pnpm install` | Install all workspace deps. |
| `pnpm build` | Build core → server → web (topological). |
| `pnpm test` | Run all Vitest suites. |
| `pnpm typecheck` | Typecheck every package. |
| `pnpm dev` | Run server (`tsx watch`, :3000) and web (Vite, proxies `/api`,`/auth`,`/ws` to :3000) in parallel. |
| `pnpm db:migrate` | `prisma migrate deploy` (apply migrations). |
| `docker compose up --build` | Build + run the single production container (needs `.env`). |

Create a migration after editing the Prisma schema:
```
cd apps/server
DATABASE_URL="file:./prisma/dev.db" pnpm exec prisma migrate dev --name <change> --skip-seed
```

## Architecture & the patterns every slice copies

**Auth** ([apps/server/src/auth.ts](apps/server/src/auth.ts)) — shared-password, no per-user
accounts. `POST /auth/login` checks `APP_PASSWORD` and mints an HMAC token signed with
`APP_SECRET`. The web client caches it in `localStorage` so it keeps working offline. Every
REST route requires `Authorization: Bearer <token>`; the WS upgrade requires `?token=` (browsers
can't set WS headers).

**Sync** — the heart, generic over entities:
- Client ([apps/web/src/sync](apps/web/src/sync)): reads come from the Dexie **mirror** (always
  offline-readable). A write is applied to the mirror optimistically and appended to the
  **outbox**, then flushed via `POST /api/sync`. Offline → it stays queued; on reconnect /
  `window 'online'` event the outbox replays. The engine talks to an **injectable
  `SyncTransport`** (`HttpTransport` in the app, a fake in tests) — never to `fetch`/`WebSocket`
  directly.
- Server ([apps/server/src/sync.ts](apps/server/src/sync.ts)): `applyOps` resolves each op
  last-write-wins, persists winners via Prisma, and the `RealtimeHub` broadcasts them over WS
  to the other connected clients.
- **Conflict model**: single offline writer assumed → plain **last-write-wins** on each op's
  client `updatedAt` (epoch ms). The *same* `shouldApply(existing, incoming)` rule from
  `packages/core` guards every apply on both sides, so replays and live updates converge. No CRDTs.

**Adding a new entity** (the slice loop):
1. `packages/core`: add `entities/<name>.ts` with a Zod schema + an `ENTITY_<NAME>` constant; export it.
2. `apps/server`: add the Prisma model (+ migration); register an `EntityHandler` in `sync.ts`'s
   `registry`; add a read endpoint in `routes/api.ts` for hydration.
3. `apps/web`: add a Dexie table in `sync/db.ts`, map it in `DexieMirror`, add its pull endpoint
   in `http-transport.ts`, and hydrate it in `runtime.ts`.

## Conventions

- **TypeScript ESM throughout.** Relative imports use explicit `.js` extensions (e.g.
  `./sync.js`) — required for Node ESM at runtime and resolved fine by Vite/tsx in dev.
- **`verbatimModuleSyntax`** is on: use `import type { … }` for type-only imports.
- **Zod schemas live in `packages/core`** and are the single source of truth; derive TS types
  with `z.infer`. Validate untrusted input (request bodies, WS messages) at the boundary.
- **Tests assert external behaviour through public interfaces** (Vitest). Core modules are pure
  (plain in → plain out, no mocks); the sync engine is tested against a fake transport with
  `fake-indexeddb`. Follow this style for later modules (`units`, `scaling`, `needs`, `pricing`).
- **Currency RON, metric units, app-wide** — fixed constants in `packages/core/config.ts`, never
  per-user settings.

## Env vars

`APP_SECRET` (signs tokens), `APP_PASSWORD` (shared login), `DATABASE_URL` (SQLite file),
`CURRENCY=RON`, `PORT`. In Docker, `DATABASE_URL=file:/data/app.db` on the mounted volume and
`WEB_DIST=/app/apps/web/dist`.

Put a single **`.env` at the repo root** (copy `.env.example`). The server loads it via dotenv
for local dev, and `docker compose` reads it for variable substitution. Real process env always
wins over the file (so the container's injected vars take precedence; no `.env` is shipped in the image).

## Gotchas

- **pnpm blocks dependency build scripts.** Prisma + esbuild are allowlisted via
  `onlyBuiltDependencies` in `pnpm-workspace.yaml`. If a postinstall didn't run, `pnpm rebuild`.
- **`Note.updatedAt` is a Prisma `BigInt`** (epoch ms exceeds 32-bit Int). Convert at the repo
  edge: `Number(row.updatedAt)` on read, `BigInt(n)` on write — keep BigInt out of JSON.
- **The server only serves static web assets when the build exists.** In `pnpm dev` it logs a
  warning and the Vite dev server hosts the UI instead — that's expected.
- **Migrations run on container start** (`docker-entrypoint.sh` → `prisma migrate deploy`), which
  creates `app.db` on the volume on first boot.
```
