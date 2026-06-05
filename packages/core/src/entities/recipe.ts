import { z } from "zod";

/**
 * `Recipe` is a cookbook entry (issue 0006): a name, a `baseServings` count the stored
 * quantities are written for, a `category` for filtering, free-text `tags`, and the ordered
 * cooking `steps`. Its ingredient lines live in `RecipeIngredient` (one row per line, keyed
 * by `recipeId`) — the same identity/details split as `Shop`/`ShopPrice`.
 *
 * Changing the *displayed* serving count never edits the recipe; the `scaling` module
 * rescales each line's quantity by ratio (`baseQty × target / baseServings`) for display.
 * `category` is for filtering only — any recipe may fill any meal slot later (issue 0007).
 */
export const ENTITY_RECIPE = "recipe" as const;

/** Fixed cookbook categories (PRD): used to filter the cookbook, not as a hard constraint. */
export const RecipeCategorySchema = z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK", "DESSERT"]);
export type RecipeCategory = z.infer<typeof RecipeCategorySchema>;
export const RECIPE_CATEGORIES = RecipeCategorySchema.options;

export const RecipeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  /** Servings the stored ingredient quantities are written for. Positive so scaling can divide by it. */
  baseServings: z.number().int().positive(),
  category: RecipeCategorySchema,
  /** Free filter tags, e.g. "vegetarian", "campfire", "quick". */
  tags: z.array(z.string().min(1)).default([]),
  /** Ordered cooking steps; the index is the step number shown in the UI. */
  steps: z.array(z.string().min(1)).default([]),
  /** Client timestamp (epoch ms) — the last-write-wins ordering key. */
  updatedAt: z.number().int().nonnegative(),
});
export type Recipe = z.infer<typeof RecipeSchema>;
