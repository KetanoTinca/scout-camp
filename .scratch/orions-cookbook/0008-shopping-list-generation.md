# Shopping list generation: needs − inventory + manual + restock

Labels: enhancement, ready-for-agent
Type: AFK
Status: ready-for-agent

## Parent

[0001-prd.md](0001-prd.md) — Orion's Cookbook

## What to build

Generate a per-camp shopping list, plus the pure `needs` module in `packages/core` (the heart of the
app). The `needs` module sums every menu entry's scaled ingredient requirement
(`recipeIngredient.qty × (servingsOverride ?? headcount) / baseServings`) across the camp, then
subtracts current inventory to produce a to-buy quantity (`max(0, needs − stockQty)`). The shopping
list shows these auto items, allows manual additions (supplies not in any recipe), and accepts
restock items pushed from low-inventory (par) entries. For each line, reuse the `pricing` module to
suggest the cheapest shop, the packages to buy, and the line cost, with an estimated total for the
list. The list is regenerable after menu or inventory changes.

## Acceptance criteria

- [ ] Generate a shopping list for a camp: scaled menu needs minus current inventory
- [ ] Add manual items to the list
- [ ] Push low/needed inventory items (par) onto a chosen camp's shopping list as restock items
- [ ] Each line suggests cheapest shop, packages-to-buy, and line cost; the list shows an estimated total
- [ ] Regenerating after a menu or inventory change updates the list correctly
- [ ] List edits work offline, sync on reconnect, and broadcast live
- [ ] `needs` module has isolation tests: multi-recipe/slot aggregation, serving overrides, inventory subtraction, the `max(0, …)` floor, mixed dimensions

## Blocked by

- [0004-inventory-stock-par.md](0004-inventory-stock-par.md)
- [0005-shops-prices-cheapest.md](0005-shops-prices-cheapest.md)
- [0007-camp-menu-grid.md](0007-camp-menu-grid.md)
