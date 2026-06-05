import type { ShopPrice } from "./entities/shop-price.js";

/**
 * The pure `pricing` module (PRD "Deep modules"). Given an ingredient's per-shop package
 * offers, it computes price-per-unit, picks the cheapest shop, and — for a needed quantity
 * (in base units) — the whole packages to buy and the resulting cost. The shopping slice
 * (0008) reuses `priceLine`/`estimateTotal` to price a whole list.
 *
 * No I/O, no framework — plain numbers in, plain numbers out, isolation-tested.
 */

/** The facet of a shop offer the pricing math needs: which shop, package size, package price. */
export type PriceOption = Pick<ShopPrice, "shopId" | "packageSize" | "packagePrice">;

/**
 * Cost of one base unit at a given offer: `packagePrice / packageSize` (RON per base unit).
 * `packageSize` is guaranteed positive by `ShopPriceSchema`, so this never divides by zero.
 */
export function pricePerUnit(offer: Pick<ShopPrice, "packageSize" | "packagePrice">): number {
  return offer.packagePrice / offer.packageSize;
}

/**
 * The cheapest of the given offers by price-per-unit, or `undefined` when there are none
 * (the "no price" case). Ties keep the first offer in input order, so selection is stable.
 * Generic over the offer shape so callers can pass full `ShopPrice` rows and read back the
 * winning row's id/shop to flag it in the UI.
 */
export function cheapestShop<T extends Pick<ShopPrice, "packageSize" | "packagePrice">>(
  offers: readonly T[],
): T | undefined {
  let best: T | undefined;
  let bestPpu = Infinity;
  for (const offer of offers) {
    const ppu = pricePerUnit(offer);
    if (ppu < bestPpu) {
      bestPpu = ppu;
      best = offer;
    }
  }
  return best;
}

/** A priced shopping line: which shop to buy at, how many whole packages, and the total cost. */
export interface PriceLine {
  shopId: string;
  /** Price per base unit at the chosen shop. */
  pricePerUnit: number;
  /** Whole packages to buy to cover `toBuy` (`ceil`), since you can't buy a fraction of one. */
  packages: number;
  /** `packages × packagePrice` at the chosen shop, in RON. */
  cost: number;
}

/**
 * Price a needed quantity (`toBuy`, base units) against an ingredient's offers: pick the
 * cheapest shop, buy whole packages (`ceil(toBuy / packageSize)`), and total the cost.
 * Returns `null` when no shop prices the ingredient — the caller shows it as unpriced.
 */
export function priceLine(toBuy: number, offers: readonly PriceOption[]): PriceLine | null {
  const best = cheapestShop(offers);
  if (!best) return null;
  const packages = Math.ceil(toBuy / best.packageSize);
  return {
    shopId: best.shopId,
    pricePerUnit: pricePerUnit(best),
    packages,
    cost: packages * best.packagePrice,
  };
}

/** Sum the cost of priced lines for an estimated total; unpriced (`null`) lines contribute nothing. */
export function estimateTotal(lines: readonly (PriceLine | null)[]): number {
  return lines.reduce((sum, line) => sum + (line?.cost ?? 0), 0);
}
