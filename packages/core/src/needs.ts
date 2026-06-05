import { scaleQuantity } from "./scaling.js";

/**
 * The pure `needs` module (PRD "Deep modules" — the heart of the app). It answers "what must
 * we buy for this camp?" in two steps:
 *
 *   1. **Aggregate** — for every menu placement, scale each recipe ingredient line to the
 *      placement's serving target (`scaleQuantity`, reused from the `scaling` module) and sum
 *      the base-unit requirement per ingredient across the whole camp.
 *   2. **Net off inventory** — subtract what's already in stock, flooring each shortfall at
 *      zero (`max(0, needed − stock)`): you never buy a negative quantity.
 *
 * The shopping slice (0008) turns these to-buy figures into priced lines via the `pricing`
 * module. No I/O, no framework, dimension-agnostic (it sums base units per ingredient id) —
 * plain data in, plain data out, isolation-tested.
 */

/** One placed recipe's contribution: its base servings, the servings to cook for, its lines. */
export interface NeedSource {
  /** Servings the recipe's stored quantities are written for (the scaling baseline). */
  baseServings: number;
  /** Servings this placement cooks for — the menu entry's override, else the camp headcount. */
  targetServings: number;
  /** The recipe's ingredient lines: a catalog ingredient and a base-unit quantity. */
  lines: readonly { ingredientId: string; quantity: number }[];
}

/**
 * Sum the scaled base-unit requirement per ingredient across every placement. The returned
 * map's iteration order is first-seen order, so callers get a stable, deterministic list.
 */
export function aggregateNeeds(sources: readonly NeedSource[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const source of sources) {
    for (const line of source.lines) {
      const scaled = scaleQuantity(line.quantity, source.baseServings, source.targetServings);
      totals.set(line.ingredientId, (totals.get(line.ingredientId) ?? 0) + scaled);
    }
  }
  return totals;
}

/** Floor a shortfall at zero — stock at or above the need means nothing to buy. */
export function netToBuy(needed: number, stock: number): number {
  return Math.max(0, needed - stock);
}

/** A to-buy figure for one ingredient: total need, current stock, and the floored shortfall. */
export interface IngredientNeed {
  ingredientId: string;
  /** Total scaled requirement across the camp, in base units. */
  needed: number;
  /** Current inventory on hand, in base units. */
  stock: number;
  /** What to buy: `max(0, needed − stock)`, in base units. */
  toBuy: number;
}

/**
 * The shopping needs for a camp: aggregate every placement's scaled requirement, then net off
 * inventory. Every ingredient the menu requires is returned (including those fully covered by
 * stock, with `toBuy` 0) so the caller can decide what to surface; stock defaults to 0 for an
 * ingredient not present in `stockByIngredient`.
 */
export function shoppingNeeds(
  sources: readonly NeedSource[],
  stockByIngredient: ReadonlyMap<string, number>,
): IngredientNeed[] {
  const totals = aggregateNeeds(sources);
  const needs: IngredientNeed[] = [];
  for (const [ingredientId, needed] of totals) {
    const stock = stockByIngredient.get(ingredientId) ?? 0;
    needs.push({ ingredientId, needed, stock, toBuy: netToBuy(needed, stock) });
  }
  return needs;
}
