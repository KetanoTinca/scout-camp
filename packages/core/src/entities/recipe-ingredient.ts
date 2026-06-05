import { z } from "zod";

/**
 * `RecipeIngredient` is one ingredient line of a recipe (issue 0006): it links a recipe to a
 * catalog ingredient with a `quantity` in that ingredient's base units, written for the
 * recipe's `baseServings`. One row per line (keyed by `recipeId`) so lines sync independently
 * and last-write-wins, just like `ShopPrice` rows hang off a `Shop`. The `scaling` module
 * rescales the quantity for display; the catalog ingredient supplies the dimension/unit.
 */
export const ENTITY_RECIPE_INGREDIENT = "recipeIngredient" as const;

export const RecipeIngredientSchema = z.object({
  id: z.string().min(1),
  /** The recipe this line belongs to. */
  recipeId: z.string().min(1),
  /** The catalog ingredient this line measures. */
  ingredientId: z.string().min(1),
  /** Quantity in the ingredient's base units, at the recipe's base servings. */
  quantity: z.number().nonnegative(),
  /** Client timestamp (epoch ms) — the last-write-wins ordering key. */
  updatedAt: z.number().int().nonnegative(),
});
export type RecipeIngredient = z.infer<typeof RecipeIngredientSchema>;
