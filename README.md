# Orion's Cookbook

A single self-hosted PWA for running scout-camp food logistics — recipes, camp menus,
shopping lists, inventory, and spending — tied together through one shared ingredient catalog.
Works offline on phones at camp and syncs back when online. Currency **RON**, metric units,
protected by one shared password.

> This repository is currently the **architecture skeleton** (slice 0002). It proves the full
> stack end-to-end with a throwaway `Note` record; real features arrive in later slices. See
> [.scratch/orions-cookbook/](.scratch/orions-cookbook/) and [CLAUDE.md](CLAUDE.md).

## Stack

- **`packages/core`** — shared pure TypeScript (Zod schemas, sync protocol, last-write-wins).
- **`apps/server`** — Fastify + Prisma (SQLite) + WebSocket; serves the API, WS, and the built PWA.
- **`apps/web`** — React + Vite PWA with a Dexie offline mirror + outbox.

## Develop

```bash
pnpm install
pnpm build
pnpm test
pnpm dev          # server on :3000, web (Vite) proxying to it
```

Set up env: copy `.env.example` to `.env` and pick an `APP_SECRET` and `APP_PASSWORD`.

## Run (production)

One Docker image serves everything; SQLite lives on a mounted volume. `cloudflared` runs
separately (already configured by the operator) and points at port 3000.

```bash
cp .env.example .env   # set APP_SECRET and APP_PASSWORD
docker compose up --build
```

The container applies database migrations on start and serves the app on `:3000`.

## License

Private project.
