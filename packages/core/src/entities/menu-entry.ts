import { z } from "zod";

/**
 * `MenuEntry` is one recipe placed in a camp's menu (issue 0007): it pins a `recipeId` to a
 * specific `date` (one of the camp's days) and `slot` (one of the five ordered meal slots).
 * One row per placement — a slot holds zero or more — so placements sync independently and
 * last-write-wins, the same as `RecipeIngredient` rows hang off a `Recipe`.
 *
 * Menus reference recipes live (no snapshot): the recipe's current lines are scaled to the
 * camp `headcount` for display, unless this placement sets `servingsOverride` (e.g. a
 * hike-day meal feeding fewer people), which then becomes the scaling target instead.
 */
export const ENTITY_MENU_ENTRY = "menuEntry" as const;

/** The five ordered meal slots of a camp day (PRD). The array order is the display order. */
export const MealSlotSchema = z.enum([
  "BREAKFAST",
  "MORNING_SNACK",
  "LUNCH",
  "AFTERNOON_SNACK",
  "DINNER",
]);
export type MealSlot = z.infer<typeof MealSlotSchema>;
export const MEAL_SLOTS = MealSlotSchema.options;

export const MenuEntrySchema = z.object({
  id: z.string().min(1),
  /** The camp this placement belongs to. */
  campId: z.string().min(1),
  /** Which camp day this is on, `YYYY-MM-DD` (one of `campDays`). */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD"),
  /** Which of the five meal slots on that day. */
  slot: MealSlotSchema,
  /** The recipe placed here, referenced live (no snapshot). */
  recipeId: z.string().min(1),
  /** Optional per-placement serving target; absent means scale to the camp headcount. */
  servingsOverride: z.number().int().positive().optional(),
  /** Client timestamp (epoch ms) — the last-write-wins ordering key. */
  updatedAt: z.number().int().nonnegative(),
});
export type MenuEntry = z.infer<typeof MenuEntrySchema>;
