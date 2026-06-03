import { z } from "zod";
import { BaseUnitSchema, DimensionSchema, baseUnitForDimension } from "../units.js";

/**
 * `Ingredient` is the shared catalog item that recipes, inventory, and shopping all
 * reference (issue 0003). It carries its identity — a name, a `dimension`, and the
 * `baseUnit` every quantity of it is stored in — plus a free-text `category` for grouping.
 * Non-food supplies (charcoal, bin bags) are simply COUNT-dimension entries in this catalog.
 *
 * `stockQty` (base units) is how much is currently on hand; it ships here defaulting to 0
 * and becomes editable with par levels and low-stock flagging in the inventory slice (0004).
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
    /** Quantity on hand, in base units. Defaults to 0 until the inventory slice. */
    stockQty: z.number().nonnegative().default(0),
    /** Client timestamp (epoch ms) — the last-write-wins ordering key. */
    updatedAt: z.number().int().nonnegative(),
  })
  .refine((ing) => ing.baseUnit === baseUnitForDimension(ing.dimension), {
    message: "baseUnit must be the base unit of its dimension",
    path: ["baseUnit"],
  });
export type Ingredient = z.infer<typeof IngredientSchema>;
