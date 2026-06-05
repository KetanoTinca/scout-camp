import { describe, it, expect } from "vitest";
import { IngredientSchema, isLowStock } from "./ingredient.js";

describe("isLowStock", () => {
  it("is never low when no par level is set", () => {
    expect(isLowStock({ stockQty: 0, parLevel: undefined })).toBe(false);
    expect(isLowStock({ stockQty: 5000, parLevel: undefined })).toBe(false);
  });

  it("flags stock below par as low", () => {
    expect(isLowStock({ stockQty: 200, parLevel: 500 })).toBe(true);
  });

  it("flags stock exactly at par as low (at or below)", () => {
    expect(isLowStock({ stockQty: 500, parLevel: 500 })).toBe(true);
  });

  it("is not low when stock is above par", () => {
    expect(isLowStock({ stockQty: 750, parLevel: 500 })).toBe(false);
  });

  it("treats a zero par level as a real threshold (empty stock is low)", () => {
    expect(isLowStock({ stockQty: 0, parLevel: 0 })).toBe(true);
    expect(isLowStock({ stockQty: 1, parLevel: 0 })).toBe(false);
  });
});

describe("IngredientSchema parLevel", () => {
  const base = {
    id: "i1",
    name: "Flour",
    dimension: "MASS" as const,
    baseUnit: "g" as const,
    stockQty: 1000,
    updatedAt: 1,
  };

  it("accepts an ingredient with no par level", () => {
    expect(IngredientSchema.parse(base).parLevel).toBeUndefined();
  });

  it("accepts a non-negative par level", () => {
    expect(IngredientSchema.parse({ ...base, parLevel: 500 }).parLevel).toBe(500);
  });

  it("rejects a negative par level", () => {
    expect(() => IngredientSchema.parse({ ...base, parLevel: -1 })).toThrow();
  });
});
