# Orion's Cookbook — agent guide

Self-hosted PWA for running scout-camp food logistics (recipes, camp menus, shopping,
inventory, spending) for a 2–3 person team. Offline-first on phones at camp, live-syncing
between leaders when online, behind a single shared password and a Cloudflare tunnel.

The full spec lives in [.scratch/orions-cookbook/0001-prd.md](.scratch/orions-cookbook/0001-prd.md);
each numbered file there is a vertical slice. Shipped so far: **0002** (infra skeleton), **0003**
(ingredient catalog + `units` module), **0004** (inventory — editable stock & optional par levels,
low-stock flagging), **0005** (shops + per-shop package prices + the `pricing` module: price-per-unit,
cheapest-shop, package/cost math), **0006** (recipe cookbook + the `scaling` module: ratio rescaling
with readable display; browse/search by category & tag), **0007** (camps + the day/meal-slot menu
grid: `campDays` enumerates a camp's inclusive date range, recipes placed in a slot auto-scale to
the camp headcount or a per-placement serving override, reusing the `scaling` module), **0008**
(per-camp shopping list + the `needs` module — the heart: aggregate every menu placement's scaled
ingredient requirement, net off inventory with a `max(0, need − stock)` floor; lines are priced via
the `pricing` module and the list mixes auto/manual/restock sources, regenerable from the menu), **0009**
(receive purchases — mark a shopping line bought, edit the received quantity off the planned default,
and confirming adds it to the ingredient's stock; bought lines are frozen records, excluded from the
estimate and skipped by regeneration. `ShoppingItem` gained an optional `received` field whose presence
flags the line bought — an *extend* slice, no new entity), **0010** (per-camp spending ledger — a
standalone manual `Expense` entity: amount in RON, label, optional category, optional camp day, with a
running per-camp total. Deliberately independent of the shopping estimate — buying a line does not post
an expense; a plain new-entity slice with no new pure module, the total is just a sum), **0011**
(offline/realtime hardening — no new entity; isolation tests for the generic sync engine against a
fake transport: every entity's writes queue offline and replay on reconnect, a timestamp clash
resolves last-write-wins regardless of arrival order, and two clients sharing a fake hub converge on
fan-out; the Fastify `RealtimeHub` gets its own fan-out/drop-on-disconnect test).
`Ingredient` is the first real entity and serves as catalog **and** inventory; `Shop` and `ShopPrice`
(one offer per ingredient×shop) are the second and third; `Recipe` and `RecipeIngredient` (one line
per recipe×ingredient) are the fourth and fifth; `Camp` and `MenuEntry` (one placement per
camp×day×slot, holding an optional `servingsOverride`) are the sixth and seventh; `ShoppingItem`
(one buy line per camp, tagged auto/manual/restock) is the eighth; `Expense` (one ledger line per
camp) is the ninth — all the same identity/details split as Shop/ShopPrice. The `Note` entity is
throwaway scaffolding from the skeleton that proves the stack. With 0011's sync hardening, all of the
PRD's planned slices (0002–0011) are now shipped.

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

**Adding a new entity** (the slice loop — 0005 added `Shop` and `ShopPrice` this way, the first
new entities since the skeleton):
1. `packages/core`: add `entities/<name>.ts` with a Zod schema + an `ENTITY_<NAME>` constant; export it.
2. `apps/server`: add the Prisma model (+ migration); register an `EntityHandler` in `sync.ts`'s
   `registry`; add a read endpoint in `routes/api.ts` for hydration; map the row in `repository.ts`.
3. `apps/web`: add a Dexie table in `sync/db.ts` (bump `version()`), add its pull endpoint in
   `http-transport.ts`, and hydrate it in `runtime.ts`.

`DexieMirror` derives an entity's table name generically as `` `${entity}s` `` (no per-entity
wiring), and the pull endpoint reads the matching response key — so an `ENTITY_*` value must
pluralise cleanly with a trailing `s`: `shop` → table `shops`, `shopPrice` → table `shopPrices`
(camelCase + `s`). Keep the Dexie table name, the REST response key, and the constant in lockstep.

*Extending* an existing entity (e.g. 0004 added `parLevel` to `Ingredient`) skips the new-table
steps — just thread the field through the Zod schema → Prisma model (+ migration) → the
`EntityHandler`'s `put` → the repository's read mapping → the UI. No new Dexie table or pull
endpoint is needed, and no Dexie version bump unless the field must be *indexed* (Dexie stores the
whole record regardless of declared indexes).

## Conventions

- **TypeScript ESM throughout.** Relative imports use explicit `.js` extensions (e.g.
  `./sync.js`) — required for Node ESM at runtime and resolved fine by Vite/tsx in dev.
- **`verbatimModuleSyntax`** is on: use `import type { … }` for type-only imports.
- **Zod schemas live in `packages/core`** and are the single source of truth; derive TS types
  with `z.infer`. Validate untrusted input (request bodies, WS messages) at the boundary.
- **Tests assert external behaviour through public interfaces** (Vitest). Core modules are pure
  (plain in → plain out, no mocks); the sync engine is tested against a fake transport with
  `fake-indexeddb`. `units`, the `isLowStock` inventory rule, `pricing`, `scaling`, and `needs`
  all follow this style — keep any new pure module isolation-tested the same way.
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
- **Every entity's `updatedAt` is a Prisma `BigInt`** (epoch ms exceeds 32-bit Int) — `Note`,
  `Ingredient`, `Shop`, `ShopPrice`, `Recipe`, `RecipeIngredient`, and each entity to come. Convert
  at the repo edge: `Number(row.updatedAt)` on read, `BigInt(n)` on write — keep BigInt out of JSON.
- **SQLite has no array columns**, so `string[]` fields are stored JSON-encoded in a `String`
  column (`Recipe.tags`, `Recipe.steps`). The Zod schema keeps the field a `string[]`; the sync
  handler `JSON.stringify`s on write and the repository `JSON.parse`s on read. Same convert-at-the-
  edge discipline as BigInt — the wire/JSON shape stays a real array.
- **The local SQLite file is at `apps/server/prisma/prisma/dev.db`, not `apps/server/prisma/dev.db`.**
  Prisma resolves a relative `DATABASE_URL` (`file:./prisma/dev.db`) against the *schema* directory
  (`apps/server/prisma/`), so `./prisma/...` nests one level deeper. Run `prisma migrate dev` from
  `apps/server` (the migration command above) so it lands on that same file.
- **The server only serves static web assets when the build exists.** In `pnpm dev` it logs a
  warning and the Vite dev server hosts the UI instead — that's expected.
- **Migrations run on container start** (`docker-entrypoint.sh` → `prisma migrate deploy`), which
  creates `app.db` on the volume on first boot.
