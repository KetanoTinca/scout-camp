import { z } from "zod";

/**
 * `Shop` is a place the group buys ingredients (issue 0005) — just an identity (a name).
 * The actual offers live in `ShopPrice`, which links a shop to an ingredient with a package
 * size and price; the `pricing` module then derives price-per-unit and the cheapest shop.
 */
export const ENTITY_SHOP = "shop" as const;

export const ShopSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  /** Client timestamp (epoch ms) — the last-write-wins ordering key. */
  updatedAt: z.number().int().nonnegative(),
});
export type Shop = z.infer<typeof ShopSchema>;
