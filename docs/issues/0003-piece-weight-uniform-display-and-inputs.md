# Piece Weight — uniform ≈kg display and quantity inputs

## What to build

Apply the **uniform rule** everywhere a piece-item with a Piece Weight appears, completing the
feature beyond pricing:

- **Display** "≈ X kg" beside the piece quantity on shopping lines, inventory rows, and recipe
  scaled lines.
- **Accept** `piece / g / kg` (converted to pieces on save, via the Piece Weight) on the manual
  shopping-line form, the received-into-stock form, and the inventory stock/par editor.

Reuse the `units` conversion helper from issue 0001. Display reuses the existing mass
formatting (g/kg threshold, ro-RO locale) with an "≈" prefix. Stored values stay in the Base
Unit (pieces); no math changes. Piece-items **without** a Piece Weight render and behave exactly
as today.

## Acceptance criteria

- [ ] Piece-items with a Piece Weight show "≈ X kg" beside the piece count on shopping lines, inventory, and recipe scaled lines.
- [ ] Manual shopping line, received-into-stock, and inventory stock/par accept `piece / g / kg`, converted to pieces.
- [ ] Piece-items without a Piece Weight are unchanged (pieces only, no "≈").
- [ ] Stored quantities remain in the Base Unit (pieces); no pricing/needs math changes.

## Blocked by

- `docs/issues/0001-piece-weight-field-and-catalog.md`
