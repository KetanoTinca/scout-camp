import { z } from "zod";

/**
 * `ShoppingItem` is one line of a camp's shopping list (issue 0008): a catalog `ingredientId`
 * and a `quantity` (base units) to buy for a given `campId`. Its `source` records where the
 * line came from:
 *   - `auto`    — generated from the menu's scaled needs minus inventory (the `needs` module);
 *                 regenerating the list reconciles these against the current menu/stock.
 *   - `manual`  — added by hand (a supply not in any recipe).
 *   - `restock` — pushed from a low-inventory (par) entry to top stock back up.
 *
 * Lines reference the catalog live, so the `units` module displays the quantity and the
 * `pricing` module prices it (cheapest shop, packages-to-buy, cost). One row per line, synced
 * last-write-wins like every other entity. Issue 0009 closes the loop with `received`: marking a
 * line bought records the quantity actually received and adds it to the ingredient's stock.
 */
export const ENTITY_SHOPPING_ITEM = "shoppingItem" as const;

/** Where a shopping line originated. The UI flags it; regeneration only touches `auto` lines. */
export const SHOPPING_SOURCES = ["auto", "manual", "restock"] as const;
export const ShoppingSourceSchema = z.enum(SHOPPING_SOURCES);
export type ShoppingSource = z.infer<typeof ShoppingSourceSchema>;

export const ShoppingItemSchema = z.object({
  id: z.string().min(1),
  /** The camp whose list this line belongs to. */
  campId: z.string().min(1),
  /** The catalog ingredient to buy (supplies live in the catalog too, as COUNT entries). */
  ingredientId: z.string().min(1),
  /** Where this line came from — auto from the menu, manual, or an inventory restock. */
  source: ShoppingSourceSchema,
  /** Quantity to buy, in the ingredient's base units. */
  quantity: z.number().nonnegative(),
  /**
   * Quantity actually received into inventory, in base units (issue 0009). Unset until the line
   * is marked bought; its presence both flags the line as bought and is the amount that was added
   * to the ingredient's stock. Defaults to the planned `quantity` but is editable before confirming.
   */
  received: z.number().nonnegative().optional(),
  /** Client timestamp (epoch ms) — the last-write-wins ordering key. */
  updatedAt: z.number().int().nonnegative(),
});
export type ShoppingItem = z.infer<typeof ShoppingItemSchema>;
