import { describe, it, expect } from "vitest";
import { scaleQuantity, scaleRecipe, type ScalableLine } from "./scaling.js";

describe("scaleQuantity", () => {
  it("returns the base quantity unchanged when target equals base servings", () => {
    expect(scaleQuantity(500, 4, 4)).toBe(500);
  });

  it("scales up by ratio", () => {
    // 100 g for 4 → 150 g for 6 (×1.5).
    expect(scaleQuantity(100, 4, 6)).toBe(150);
  });

  it("scales down by ratio", () => {
    // 100 g for 4 → 25 g for 1 (×0.25).
    expect(scaleQuantity(100, 4, 1)).toBe(25);
  });

  it("keeps full precision for non-integer ratios (display rounds, not the math)", () => {
    // 100 g for 3 → 33.333… g for 1.
    expect(scaleQuantity(100, 3, 1)).toBeCloseTo(33.3333, 4);
  });

  it("scales zero to zero", () => {
    expect(scaleQuantity(0, 4, 10)).toBe(0);
  });

  it("throws on a non-positive base serving count (no ratio to scale by)", () => {
    expect(() => scaleQuantity(100, 0, 4)).toThrow();
    expect(() => scaleQuantity(100, -1, 4)).toThrow();
  });
});

describe("scaleRecipe", () => {
  const lines: (ScalableLine & { ingredientId: string })[] = [
    { ingredientId: "flour", quantity: 1000, dimension: "MASS" },
    { ingredientId: "milk", quantity: 500, dimension: "VOLUME" },
    { ingredientId: "eggs", quantity: 4, dimension: "COUNT" },
  ];

  it("rescales every line by ratio and preserves extra fields", () => {
    const scaled = scaleRecipe(lines, 4, 8); // double the recipe
    expect(scaled.map((l) => l.scaledQuantity)).toEqual([2000, 1000, 8]);
    expect(scaled.map((l) => l.ingredientId)).toEqual(["flour", "milk", "eggs"]);
  });

  it("displays scaled quantities in readable units via the units module", () => {
    const scaled = scaleRecipe(lines, 4, 8);
    expect(scaled.map((l) => l.display)).toEqual(["2 kg", "1 L", "8 pieces"]);
  });

  it("rounds the display of a non-integer scaled quantity (3 decimals, ro-RO)", () => {
    const scaled = scaleRecipe([{ quantity: 100, dimension: "MASS" }], 3, 1);
    // 33.333… g rounded to 3 decimals with comma decimals.
    expect(scaled[0].scaledQuantity).toBeCloseTo(33.3333, 4);
    expect(scaled[0].display).toBe("33,333 g");
  });

  it("is a no-op at the recipe's own base servings", () => {
    const scaled = scaleRecipe(lines, 4, 4);
    expect(scaled.map((l) => l.scaledQuantity)).toEqual([1000, 500, 4]);
  });

  it("returns an empty list for a recipe with no lines", () => {
    expect(scaleRecipe([], 4, 8)).toEqual([]);
  });
});
