# Piece Weight — shop-price package entered in kg/g

## What to build

In the price editor, let a COUNT ingredient that **has a Piece Weight** enter each shop's
package size in `piece / g / kg`. Convert the weight to pieces on save so the stored package
size stays in the **Base Unit (pieces)** and the pricing/needs math is untouched. The
cheapest-shop flag must correctly compare a per-kg offer against a per-piece offer for the
*same* ingredient (both reduce to price-per-piece). When no Piece Weight is set, only `piece`
is offered.

Per `docs/adr/0001-piece-weight-pricing.md`, the conversion is intentionally lossy: a package
entered as "1 kg" is stored — and later re-displayed — as its approximate piece count.

## Acceptance criteria

- [ ] For a piece-item with a Piece Weight, the package-size unit picker offers `piece / g / kg`.
- [ ] A weight-entered package is stored in pieces via the Piece Weight; `pricing` and `needs` math are unchanged.
- [ ] Cheapest-shop selection is correct across mixed per-kg and per-piece offers on the same ingredient.
- [ ] Only `piece` is offered when the ingredient has no Piece Weight.
- [ ] Reopening the editor shows a weight-entered package as its (approximate) piece count — accepted per ADR-0001.

## Blocked by

- `docs/issues/0001-piece-weight-field-and-catalog.md`
