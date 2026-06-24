import { z } from "zod";
import { BaseUnitSchema, DimensionSchema, baseUnitForDimension } from "../units.js";

/**
 * `Ingredient` is the shared catalog item that recipes, inventory, and shopping all
 * reference (issue 0003). It carries its identity — a name, a `dimension`, and the
 * `baseUnit` every quantity of it is stored in — plus a free-text `category` for grouping.
 * Non-food supplies (charcoal, bin bags) are simply COUNT-dimension entries in this catalog.
 *
 * `stockQty` (base units) is how much is currently on hand and `parLevel` (base units) is
 * the optional minimum we want to keep — when stock falls to or below it the inventory view
 * flags the item as low (issue 0004). Both are hand-adjustable; nothing auto-decrements them.
 */
export const ENTITY_INGREDIENT = "ingredient" as const;

export const IngredientSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    dimension: DimensionSchema,
    /** Derived from `dimension` (1:1); persisted for explicitness and forward-compat. */
    baseUnit: BaseUnitSchema,
    /** Optional grouping label, e.g. "Produce", "Dairy", "Supplies". */
    category: z.string().optional(),
    /** Quantity on hand, in base units. Defaults to 0 until first adjusted. */
    stockQty: z.number().nonnegative().default(0),
    /** Optional par (minimum) level, in base units. Unset means no low-stock flagging. */
    parLevel: z.number().nonnegative().optional(),
    /**
     * Optional approximate mass of one piece, in grams — the Piece Weight (issue 0001, ADR-0001).
     * COUNT ingredients only; lets a piece-count be shown and priced/shopped as an approximate
     * weight without changing the dimension. Unset means the item is purely counted.
     */
    pieceWeight: z.number().positive().optional(),
    /** Client timestamp (epoch ms) — the last-write-wins ordering key. */
    updatedAt: z.number().int().nonnegative(),
  })
  .refine((ing) => ing.baseUnit === baseUnitForDimension(ing.dimension), {
    message: "baseUnit must be the base unit of its dimension",
    path: ["baseUnit"],
  })
  .refine((ing) => ing.pieceWeight === undefined || ing.dimension === "COUNT", {
    message: "pieceWeight is only valid for COUNT ingredients",
    path: ["pieceWeight"],
  });
export type Ingredient = z.infer<typeof IngredientSchema>;

/**
 * Whether an ingredient is "low": a par level is set and current stock has fallen to or
 * below it (issue 0004). Pure rule shared by the inventory view now and the restock push
 * later, so "low" means the same thing everywhere. No par set → never low.
 */
export function isLowStock(ing: Pick<Ingredient, "stockQty" | "parLevel">): boolean {
  return ing.parLevel !== undefined && ing.stockQty <= ing.parLevel;
}
