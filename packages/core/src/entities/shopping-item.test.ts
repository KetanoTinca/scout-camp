import { describe, it, expect } from "vitest";
import { ShoppingItemSchema } from "./shopping-item.js";

describe("ShoppingItemSchema", () => {
  const base = {
    id: "s1",
    campId: "c1",
    ingredientId: "i1",
    source: "auto" as const,
    quantity: 300,
    updatedAt: 1,
  };

  it("accepts a well-formed item", () => {
    expect(ShoppingItemSchema.parse(base)).toEqual(base);
  });

  it("accepts each known source and rejects others", () => {
    for (const source of ["auto", "manual", "restock"] as const) {
      expect(ShoppingItemSchema.parse({ ...base, source }).source).toBe(source);
    }
    expect(() => ShoppingItemSchema.parse({ ...base, source: "wishlist" })).toThrow();
  });

  it("allows a zero quantity but rejects a negative one", () => {
    expect(ShoppingItemSchema.parse({ ...base, quantity: 0 }).quantity).toBe(0);
    expect(() => ShoppingItemSchema.parse({ ...base, quantity: -5 })).toThrow();
  });

  it("requires a camp id and an ingredient id", () => {
    expect(() => ShoppingItemSchema.parse({ ...base, campId: "" })).toThrow();
    expect(() => ShoppingItemSchema.parse({ ...base, ingredientId: "" })).toThrow();
  });

  it("treats `received` as optional — unset means not yet bought", () => {
    expect(ShoppingItemSchema.parse(base).received).toBeUndefined();
  });

  it("accepts a nonnegative `received` (incl. zero) and rejects a negative one", () => {
    expect(ShoppingItemSchema.parse({ ...base, received: 250 }).received).toBe(250);
    expect(ShoppingItemSchema.parse({ ...base, received: 0 }).received).toBe(0);
    expect(() => ShoppingItemSchema.parse({ ...base, received: -1 })).toThrow();
  });
});
