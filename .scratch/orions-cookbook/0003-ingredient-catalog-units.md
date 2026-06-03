# Ingredient catalog + units module

Labels: enhancement, ready-for-agent
Type: AFK
Status: ready-for-agent

## Parent

[0001-prd.md](0001-prd.md) — Orion's Cookbook

## What to build

The shared ingredient catalog that recipes, inventory, and shopping all reference, plus the pure
`units` module in `packages/core`. An ingredient has a name, a dimension (mass/volume/count), and a
base unit (g/ml/piece). Non-food supplies (charcoal, bin bags) are just count-based catalog items.
The `units` module handles base-unit conversion and human display (g↔kg, ml↔L thresholds; count
stays as pieces). CRUD flows reuse the sync/realtime pattern from the skeleton so the catalog works
offline and updates live.

## Acceptance criteria

- [ ] Create, edit, delete, and list catalog ingredients with name, dimension, and base unit
- [ ] Quantities display in readable units via the `units` module (g/kg, ml/L, pieces)
- [ ] Count-based supply items can be added to the same catalog
- [ ] Catalog reads work offline; edits sync on reconnect and broadcast live to other clients
- [ ] `units` module has isolation tests: to/from base conversion and g/kg, ml/L display thresholds

## Blocked by

- [0002-architecture-skeleton.md](0002-architecture-skeleton.md)
