# Camp creation and day/meal-slot menu grid

Labels: enhancement, ready-for-agent
Type: AFK
Status: ready-for-agent

## Parent

[0001-prd.md](0001-prd.md) — Orion's Cookbook

## What to build

Camp planning. Create a camp with a name, start/end dates, and a headcount. For each day in the
range, present the five ordered meal slots (Breakfast, Morning Snack, Lunch, Afternoon Snack,
Dinner). Each slot can hold one or more recipes. Recipes in the menu auto-scale to the camp headcount
via the `scaling` module, and an individual recipe instance can override the serving count (e.g. a
hike-day meal feeding fewer people). Menus reference recipes live (no snapshot). Provide a
week-at-a-glance view of the menu.

## Acceptance criteria

- [ ] Create, edit, delete a camp with name, start/end dates, and headcount
- [ ] Each day shows the five ordered meal slots
- [ ] Add and remove one or more recipes per slot
- [ ] Recipes auto-scale to the camp headcount; a per-instance serving override is supported
- [ ] A whole-camp menu overview is viewable
- [ ] Menu edits work offline, sync on reconnect, and broadcast live

## Blocked by

- [0006-recipes-scaling.md](0006-recipes-scaling.md)
