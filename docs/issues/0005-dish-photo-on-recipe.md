# Dish Photo on Recipe

## What to build

Add an optional **Dish Photo** to a **Recipe**: one inline, client-compressed base64 photo on
the Recipe record (per `docs/adr/0002-inline-photo-storage.md`). It is set and edited **only in
the Cookbook** form (downscaled/compressed on attach, clearable); the cookbook card displays it;
every menu placement of that recipe shows a **read-only thumbnail**. It illustrates the dish — it
is not a per-day record of a meal cooked (`CONTEXT.md` → **Dish Photo**).

Reuses the shared image-compression helper and `bodyLimit` handling introduced by the Receipt
Photo slice.

## Acceptance criteria

- [ ] A Recipe can carry one optional inline Dish Photo; absent by default.
- [ ] The photo is set/edited only in the Cookbook form (downscaled/compressed on attach) and is clearable.
- [ ] The cookbook card shows the photo; every menu-grid placement of that recipe shows a read-only thumbnail.
- [ ] A photo attached offline queues in the outbox, syncs on reconnect, and is viewable offline.
- [ ] Stored inline per ADR-0002, reusing the image helper and `bodyLimit` handling from the Receipt Photo slice.

## Blocked by

- `docs/issues/0004-receipt-photo-on-expense.md`
