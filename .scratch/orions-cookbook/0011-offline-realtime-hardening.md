# Offline/realtime hardening + sync tests

Labels: enhancement, ready-for-agent
Type: AFK
Status: ready-for-agent

## Parent

[0001-prd.md](0001-prd.md) — Orion's Cookbook

## What to build

Harden the offline and realtime behavior now that every write path exists (catalog, inventory, shops,
recipes, menus, shopping, purchases, spending), and add the `sync` module tests. Verify the outbox
queues and replays correctly across all write paths, that last-write-wins resolves a timestamp clash,
and that WebSocket fan-out keeps all clients consistent. The `sync` engine is tested against an
injectable fake transport, asserting observable outcomes (what ends up in the mirror, what the server
receives on flush) rather than internal state.

## Acceptance criteria

- [ ] Every write path (all entities) works offline and replays from the outbox on reconnect
- [ ] A last-write-wins clash resolves deterministically by client timestamp
- [ ] WebSocket fan-out keeps multiple online clients consistent after each mutation
- [ ] The PWA reliably boots and operates offline after first login
- [ ] `sync` module has isolation tests against a fake transport: enqueue/flush, offline-then-reconnect replay, last-write-wins on a clash

## Blocked by

- [0008-shopping-list-generation.md](0008-shopping-list-generation.md)
- [0009-receive-purchases.md](0009-receive-purchases.md)
- [0010-spending-ledger.md](0010-spending-ledger.md)
