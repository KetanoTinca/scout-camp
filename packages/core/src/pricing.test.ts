import { describe, it, expect } from "vitest";
import {
  cheapestShop,
  estimateTotal,
  priceLine,
  pricePerUnit,
  type PriceOption,
} from "./pricing.js";

/** A 1 kg bag for 5 RON → 0.005 RON/g. */
const cheap: PriceOption = { shopId: "cheap", packageSize: 1000, packagePrice: 5 };
/** A 2 kg bag for 12 RON → 0.006 RON/g (bigger pack, dearer per unit). */
const dear: PriceOption = { shopId: "dear", packageSize: 2000, packagePrice: 12 };

describe("pricePerUnit", () => {
  it("divides package price by package size (RON per base unit)", () => {
    expect(pricePerUnit({ packageSize: 1000, packagePrice: 5 })).toBe(0.005);
    expect(pricePerUnit({ packageSize: 2000, packagePrice: 12 })).toBe(0.006);
  });

  it("treats a free package as zero per unit", () => {
    expect(pricePerUnit({ packageSize: 500, packagePrice: 0 })).toBe(0);
  });
});

describe("cheapestShop", () => {
  it("returns undefined when there are no offers (the no-price case)", () => {
    expect(cheapestShop([])).toBeUndefined();
  });

  it("picks the offer with the lowest price-per-unit, not the lowest package price", () => {
    // `dear` has the lower *price-per-unit*-beating package price overall but a worse unit rate.
    expect(cheapestShop([dear, cheap])).toBe(cheap);
  });

  it("returns the same row reference so callers can flag it", () => {
    const offers = [cheap, dear];
    expect(cheapestShop(offers)).toBe(offers[0]);
  });

  it("keeps the first offer on a price-per-unit tie", () => {
    const a = { shopId: "a", packageSize: 1000, packagePrice: 4 };
    const b = { shopId: "b", packageSize: 2000, packagePrice: 8 }; // same 0.004 RON/g
    expect(cheapestShop([a, b])).toBe(a);
    expect(cheapestShop([b, a])).toBe(b);
  });
});

describe("priceLine", () => {
  it("returns null when no shop prices the ingredient", () => {
    expect(priceLine(1500, [])).toBeNull();
  });

  it("buys whole packages via ceil and totals the cost at the cheapest shop", () => {
    // Need 1500 g; cheapest is the 1 kg/5 RON bag → ceil(1.5) = 2 bags = 10 RON.
    expect(priceLine(1500, [cheap, dear])).toEqual({
      shopId: "cheap",
      pricePerUnit: 0.005,
      packages: 2,
      cost: 10,
    });
  });

  it("rounds a single base unit over a package boundary up to the next package", () => {
    // Need 1001 g from 1 kg bags → 2 bags.
    expect(priceLine(1001, [cheap]).packages).toBe(2);
  });

  it("buys exactly one package when the need fits a single package", () => {
    expect(priceLine(1000, [cheap]).packages).toBe(1);
  });

  it("buys nothing when the need is already zero", () => {
    expect(priceLine(0, [cheap])).toEqual({
      shopId: "cheap",
      pricePerUnit: 0.005,
      packages: 0,
      cost: 0,
    });
  });
});

describe("estimateTotal", () => {
  it("sums the cost of priced lines", () => {
    const lines = [priceLine(1500, [cheap]), priceLine(3000, [dear])];
    // 2×5 + 2×12 = 34 RON.
    expect(estimateTotal(lines)).toBe(34);
  });

  it("ignores unpriced (null) lines", () => {
    expect(estimateTotal([priceLine(1000, [cheap]), priceLine(1000, [])])).toBe(5);
  });

  it("is zero for an empty list", () => {
    expect(estimateTotal([])).toBe(0);
  });
});
