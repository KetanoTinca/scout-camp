# Shops, package prices, and cheapest-shop computation

Labels: enhancement, ready-for-agent
Type: AFK
Status: ready-for-agent

## Parent

[0001-prd.md](0001-prd.md) — Orion's Cookbook

## What to build

Multi-shop, package-aware pricing for catalog ingredients, plus the pure `pricing` module in
`packages/core`. Maintain a list of shops. For an ingredient, record per shop a package size (in
base units) and a package price in RON. The `pricing` module computes price-per-unit, selects the
cheapest shop, and (given a needed quantity) computes packages-to-buy via `ceil` and the line cost;
the shopping slice later reuses it. Surface price-per-unit and a cheapest-shop indicator in the UI.

## Acceptance criteria

- [ ] Create, edit, delete, and list shops
- [ ] Record per-shop package size + package price for an ingredient
- [ ] Price-per-unit is computed and the cheapest shop is flagged per ingredient
- [ ] Shop/price edits work offline, sync on reconnect, and broadcast live
- [ ] `pricing` module has isolation tests: price-per-unit, cheapest-shop selection, `ceil` package math, line cost, and the no-price case

## Blocked by

- [0003-ingredient-catalog-units.md](0003-ingredient-catalog-units.md)
