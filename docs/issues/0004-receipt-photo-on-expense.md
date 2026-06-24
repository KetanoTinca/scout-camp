# Receipt Photo on Expense

## What to build

Add an optional **Receipt Photo** to an **Expense** as pure documentation: one inline,
client-compressed base64 photo stored on the Expense record, riding the existing offline
outbox / sync / mirror (per `docs/adr/0002-inline-photo-storage.md`). The expense form lets the
user attach (capture or pick) a photo, which is downscaled (~1024px long edge, JPEG ~0.7) before
it enters the record; the ledger shows a thumbnail with tap-to-view-full; the photo is clearable.

This is the first photo slice, so it also carries the **shared image-compression helper** and the
**Fastify `bodyLimit` / WebSocket frame-size bump** so a sync batch carrying a photo isn't
rejected.

The Receipt Photo is documentation only — it does not link the Expense to any shopping line and
does not change the expense total (`CONTEXT.md` → **Receipt Photo**).

## Acceptance criteria

- [ ] An Expense can carry one optional inline Receipt Photo; absent by default.
- [ ] Attaching a photo downscales/compresses it client-side before it enters the record.
- [ ] The ledger shows a thumbnail; tapping opens the full image; the photo can be removed.
- [ ] A photo attached offline queues in the outbox, syncs on reconnect, and is viewable offline.
- [ ] Server `bodyLimit` and the WS frame size accommodate a sync batch carrying a photo.
- [ ] The Receipt Photo adds no link to shopping/receiving and does not change the camp's expense total.

## Blocked by

None - can start immediately.
