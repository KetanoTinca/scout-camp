# Per-camp spending ledger

Labels: enhancement, ready-for-agent
Type: AFK
Status: ready-for-agent

## Parent

[0001-prd.md](0001-prd.md) — Orion's Cookbook

## What to build

A standalone manual expense ledger per camp. Log expense entries with an amount (RON), a label, an
optional category, and an optional day within the camp. Show a running total for the camp. This is
independent of the shopping list's estimated cost (which is shown separately and is not auto-posted
as an expense).

## Acceptance criteria

- [ ] Add, edit, delete expense entries on a camp (amount, label, optional category, optional day)
- [ ] The camp shows a total of logged expenses
- [ ] Amounts are in RON
- [ ] Expense edits work offline, sync on reconnect, and broadcast live

## Blocked by

- [0007-camp-menu-grid.md](0007-camp-menu-grid.md)
