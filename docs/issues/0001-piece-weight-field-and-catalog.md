# Piece Weight — field, units conversion, and Catalog editing

## What to build

Introduce **Piece Weight** (the approximate mass of one piece of a COUNT ingredient) as an
optional property of an **Ingredient**, end-to-end through the existing sync path. Add a pure
conversion in the `units` module that turns a weight into a piece count — and back — using a
given Piece Weight. Let users set and clear it in the **Catalog** add/edit form, with the field
visible **only for COUNT ingredients**.

This is the foundation slice for ADR-0001 — it makes a Piece Weight storable, syncable, and
editable, but does not yet change pricing or any other display (those are separate slices).

See `CONTEXT.md` (**Piece Weight**) and `docs/adr/0001-piece-weight-pricing.md`.

## Acceptance criteria

- [ ] An Ingredient carries an optional Piece Weight (approx grams per piece); absent by default and on non-COUNT ingredients.
- [ ] The field is editable only for COUNT ingredients in the Catalog form; leaving it blank clears it.
- [ ] A new pure `units` helper converts weight ↔ pieces via a Piece Weight, isolation-tested (including fractional, non-rounded results).
- [ ] The value persists, round-trips through sync, and appears live on other devices.
- [ ] Non-COUNT ingredients and existing behaviour are unaffected.

## Blocked by

None - can start immediately.
