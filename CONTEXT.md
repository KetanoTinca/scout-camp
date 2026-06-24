# Orion's Cookbook

Self-hosted, offline-first PWA for running scout-camp food logistics — ingredient catalog,
recipes, camp menus, shopping, inventory, and spending — for a small leader team.

## Language

**Ingredient**:
A catalog item that recipes, inventory, and shopping all reference; also covers non-food
supplies (charcoal, bin bags). Has exactly one Dimension.
_Avoid_: item, product, good

**Dimension**:
What an Ingredient is measured by — one of MASS, VOLUME, or COUNT.
_Avoid_: unit type, measure

**Base Unit**:
The single canonical unit every stored quantity of a Dimension uses — grams for MASS,
millilitres for VOLUME, pieces for COUNT. One Base Unit per Dimension; everything stored
(recipe lines, stock, par levels, shop package sizes, shopping quantities) is in it.

**Piece Weight**:
The approximate mass of one piece of a COUNT Ingredient (e.g. ~100 g per onion). Optional.
Lets a piece-count be shown — and priced/shopped — as an approximate weight, **without
changing the Ingredient's Dimension** (an onion stays COUNT; recipes still count pieces).
_Avoid_: average weight, unit weight, conversion factor

**Dish Photo**:
An optional photo of a Recipe (what the dish looks like), set and edited only in the
Cookbook. One per Recipe; shown in the cookbook and as a read-only thumbnail on every menu
placement of that recipe. Illustrates the dish — it is not a per-day record of a meal cooked.
_Avoid_: food photo, meal photo

**Receipt Photo**:
An optional photo attached to an Expense as documentation of a purchase. One per Expense; it
does not link the Expense to any shopping line and does not change the Expense's meaning.
_Avoid_: receipt scan, proof of purchase

## Relationships

- An **Ingredient** has exactly one **Dimension**
- A **Dimension** has exactly one **Base Unit**
- A COUNT **Ingredient** may have an optional **Piece Weight**
- A **Recipe** may have one **Dish Photo**; menu placements display it but do not own it
- An **Expense** may have one **Receipt Photo** (pure documentation)

## Flagged ambiguities

- **Shop-price unit for a piece-item** — _resolved._ A COUNT Ingredient with a Piece Weight
  may have its shop package entered in pieces *or* in weight, but the package size is always
  **stored in the Base Unit (pieces)**, converting weight → pieces via the Piece Weight at the
  moment of entry. Pricing math is unchanged and stays unit-agnostic. The kg/g entry option
  appears only when a Piece Weight is set; otherwise pieces only. The round-trip is lossy by
  design (a "1 kg bag" re-displays as its approximate piece count) — accepted as "approx".
