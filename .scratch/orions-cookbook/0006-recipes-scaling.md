# Recipes, serving scaling, and cookbook browse

Labels: enhancement, ready-for-agent
Type: AFK
Status: ready-for-agent

## Parent

[0001-prd.md](0001-prd.md) — Orion's Cookbook

## What to build

The recipe cookbook plus the pure `scaling` module in `packages/core`. A recipe has a name, a base
serving count, a category, free tags, ordered cooking steps, and ingredient lines that reference the
catalog with a quantity in the ingredient's base unit. Changing the displayed serving count rescales
every ingredient by ratio (`baseQty × target / baseServings`) via the `scaling` module, with display
rounding through the `units` module. Provide cookbook browse/search filtered by category and tag.
Any recipe may be used in any meal slot later; category is for filtering, not a hard constraint.

## Acceptance criteria

- [ ] Create, edit, delete recipes with name, base servings, category, tags, and ordered steps
- [ ] Add ingredient lines from the catalog with a quantity
- [ ] Changing the serving count rescales all ingredient quantities by ratio, displayed in readable units
- [ ] Browse/search the cookbook filtered by category and tag
- [ ] Recipe edits work offline, sync on reconnect, and broadcast live
- [ ] `scaling` module has isolation tests: ratio correctness, scaling up/down, rounding, base-serving edge cases

## Blocked by

- [0003-ingredient-catalog-units.md](0003-ingredient-catalog-units.md)
