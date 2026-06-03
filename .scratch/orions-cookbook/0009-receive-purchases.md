# Receive purchases into inventory

Labels: enhancement, ready-for-agent
Type: AFK
Status: ready-for-agent

## Parent

[0001-prd.md](0001-prd.md) — Orion's Cookbook

## What to build

Close the loop from buying back into inventory. On the shopping list, mark an item as bought. Before
it is added to stock, the actual received quantity is shown and is editable (it may differ from the
planned quantity). Confirming the purchase increases the ingredient's inventory stock by the received
quantity. Cooking does not auto-decrement inventory; post-camp correction stays manual.

## Acceptance criteria

- [ ] Mark a shopping item as bought
- [ ] The received quantity defaults to the planned amount and is editable before confirming
- [ ] Confirming adds the received quantity to the ingredient's inventory stock
- [ ] Purchase state and inventory changes work offline, sync on reconnect, and broadcast live

## Blocked by

- [0008-shopping-list-generation.md](0008-shopping-list-generation.md)
