# Inventory: stock levels, par levels, low-stock flagging

Labels: enhancement, ready-for-agent
Type: AFK
Status: ready-for-agent

## Parent

[0001-prd.md](0001-prd.md) — Orion's Cookbook

## What to build

Turn the catalog into a usable inventory of the group's standing stores. Each ingredient carries a
current stock quantity (in its base unit) and an optional par (minimum) level. Provide an inventory
view where stock can be adjusted by hand and items below par are flagged as low. This is the source
of truth the shopping list later subtracts from and the restock list draws from.

## Acceptance criteria

- [ ] Each ingredient has an editable current stock quantity in its base unit
- [ ] Each ingredient can have an optional par (minimum) level
- [ ] Inventory view flags items at or below par as low
- [ ] Stock adjustments work offline, sync on reconnect, and broadcast live
- [ ] Stock and par display use the `units` module formatting

## Blocked by

- [0003-ingredient-catalog-units.md](0003-ingredient-catalog-units.md)
