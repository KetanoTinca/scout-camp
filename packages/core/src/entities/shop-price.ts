import { z } from "zod";

/**
 * `ShopPrice` is a per-shop package offer for one catalog ingredient (issue 0005): a
 * `packageSize` in the ingredient's base units (e.g. 1000 for a 1 kg bag) and the
 * `packagePrice` paid for that package, in RON. There is at most one offer per
 * (ingredient, shop) pair; the `pricing` module turns a set of these into price-per-unit,
 * the cheapest shop, and the packages-and-cost a needed quantity implies.
 */
export const ENTITY_SHOP_PRICE = "shopPrice" as const;

export const ShopPriceSchema = z.object({
  id: z.string().min(1),
  /** The catalog ingredient this offer prices. */
  ingredientId: z.string().min(1),
  /** The shop the offer is at. */
  shopId: z.string().min(1),
  /** Package size in the ingredient's base units. Positive so price-per-unit is well-defined. */
  packageSize: z.number().positive(),
  /** Price of one package, in RON. */
  packagePrice: z.number().nonnegative(),
  /** Client timestamp (epoch ms) — the last-write-wins ordering key. */
  updatedAt: z.number().int().nonnegative(),
});
export type ShopPrice = z.infer<typeof ShopPriceSchema>;
