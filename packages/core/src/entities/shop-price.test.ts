import { describe, it, expect } from "vitest";
import { ShopPriceSchema } from "./shop-price.js";

describe("ShopPriceSchema", () => {
  const base = {
    id: "p1",
    ingredientId: "i1",
    shopId: "s1",
    packageSize: 1000,
    packagePrice: 5,
    updatedAt: 1,
  };

  it("accepts a well-formed offer", () => {
    expect(ShopPriceSchema.parse(base)).toEqual(base);
  });

  it("rejects a non-positive package size (would divide by zero in pricing)", () => {
    expect(() => ShopPriceSchema.parse({ ...base, packageSize: 0 })).toThrow();
    expect(() => ShopPriceSchema.parse({ ...base, packageSize: -1 })).toThrow();
  });

  it("allows a zero package price but rejects a negative one", () => {
    expect(ShopPriceSchema.parse({ ...base, packagePrice: 0 }).packagePrice).toBe(0);
    expect(() => ShopPriceSchema.parse({ ...base, packagePrice: -1 })).toThrow();
  });
});
