import { format, type Dimension } from "./units.js";

/**
 * The pure `scaling` module (PRD "Deep modules"). A recipe stores each ingredient quantity
 * for its `baseServings`; to cook for a different headcount you rescale every quantity by
 * the same ratio. This module owns that ratio and the readable display of the result — the
 * cookbook uses it now, and the menu/needs slices (0007/0008) reuse `scaleQuantity` to
 * scale recipes to the camp headcount.
 *
 * No I/O, no framework — plain numbers in, plain numbers/strings out, isolation-tested.
 * Display rounding is delegated to the `units` module so it matches the rest of the app.
 */

/**
 * Scale one base-unit quantity from `baseServings` to `targetServings` by ratio:
 * `baseQty × targetServings / baseServings`. `baseServings` must be positive (a recipe with
 * zero servings has no ratio to scale by); the `RecipeSchema` guarantees this for stored
 * recipes, and this throws if a caller passes a non-positive base so bad input fails loudly.
 */
export function scaleQuantity(
  baseQty: number,
  baseServings: number,
  targetServings: number,
): number {
  if (baseServings <= 0) {
    throw new Error(`baseServings must be positive, got ${baseServings}`);
  }
  return (baseQty * targetServings) / baseServings;
}

/** A recipe line the scaler needs: its base-unit quantity and the dimension to display it in. */
export interface ScalableLine {
  /** Quantity in base units, at the recipe's base servings. */
  quantity: number;
  /** The ingredient's dimension, used to pick readable display units. */
  dimension: Dimension;
}

/** What scaling adds to each line: the scaled quantity and its readable display string. */
export interface ScaledLine {
  /** Quantity in base units, scaled to the target servings. */
  scaledQuantity: number;
  /** Human-readable quantity, rounded via the `units` module (e.g. "1,5 kg"). */
  display: string;
}

/**
 * Rescale every line of a recipe from `baseServings` to `targetServings`, attaching each
 * line's `scaledQuantity` (base units) and a readable `display`. Generic over the line shape
 * so callers can pass lines carrying extra fields (ingredient id/name) and read them back.
 */
export function scaleRecipe<T extends ScalableLine>(
  lines: readonly T[],
  baseServings: number,
  targetServings: number,
): (T & ScaledLine)[] {
  return lines.map((line) => {
    const scaledQuantity = scaleQuantity(line.quantity, baseServings, targetServings);
    return { ...line, scaledQuantity, display: format(scaledQuantity, line.dimension) };
  });
}
