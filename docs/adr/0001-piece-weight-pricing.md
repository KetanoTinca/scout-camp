# Piece Weight: pricing and shopping COUNT ingredients by weight

Some COUNT ingredients (onions, potatoes, apples) are *counted* in recipes ("20 onions")
but *bought and priced by weight* at the shop ("a 1 kg bag"). To bridge this without
abandoning the "one Dimension, one Base Unit, stored everywhere" invariant the whole app
leans on, a COUNT Ingredient may carry an optional **Piece Weight** (approximate mass per
piece, e.g. ~100 g). It changes nothing about the Ingredient's Dimension — recipes,
inventory, and the menu keep counting pieces.

We decided that weight is purely an **edge concern**: anywhere a piece-item with a Piece
Weight is *displayed* it also shows "≈ X kg", and anywhere a quantity is *entered* (shop-price
package, manual shopping line, received-into-stock, inventory stock/par) the user may type
`g`/`kg`, which is converted to pieces at the moment of entry. The stored value is **always
pieces** (the Base Unit), so `pricing` (`pricePerUnit`, `cheapestShop`, `priceLine`) and
`needs` stay completely unit-agnostic and unchanged — a per-kg shop and a per-piece shop for
the same ingredient become comparable because both reduce to price-per-piece.

## Considered options

- **Store the package in its entered unit (kg *or* pieces) and make pricing Piece-Weight-aware.**
  Rejected: it breaks the Base-Unit-everywhere invariant and pushes conversion into the core
  pricing/needs math, which today is pure and dimension-agnostic.
- **Make onions a MASS ingredient.** Rejected: recipes would read "2000 g onion" instead of
  "20 onions", losing the readability that makes the cookbook pleasant.

## Consequences

- The kg/g conversion is **lossy by design**: a "1 kg bag" is stored as its approximate piece
  count and re-displays as pieces, not "1 kg". Accepted as "approx".
- Conversion is **not rounded** — fractional pieces (e.g. 10.5) can occur and are tolerated
  (`quantity` is already a float), keeping the weight accurate.
- The kg/g input option appears **only** when a Piece Weight is set; otherwise pieces only.
- The `units` module gains a Piece-Weight-aware conversion helper (it previously needed only
  static, dimension-only factors).
