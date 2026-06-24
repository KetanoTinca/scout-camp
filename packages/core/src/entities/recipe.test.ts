import { describe, it, expect } from "vitest";
import { RecipeSchema } from "./recipe.js";

describe("RecipeSchema", () => {
  const base = {
    id: "r1",
    name: "Pancakes",
    baseServings: 4,
    category: "BREAKFAST" as const,
    tags: ["quick", "vegetarian"],
    steps: ["Mix", "Fry"],
    updatedAt: 1,
  };

  it("accepts a well-formed recipe", () => {
    expect(RecipeSchema.parse(base)).toEqual(base);
  });

  it("defaults tags and steps to empty arrays when omitted", () => {
    const parsed = RecipeSchema.parse({
      id: "r2",
      name: "Plain",
      baseServings: 2,
      category: "DINNER",
      updatedAt: 1,
    });
    expect(parsed.tags).toEqual([]);
    expect(parsed.steps).toEqual([]);
  });

  it("requires base servings to be a positive integer (scaling divides by it)", () => {
    expect(() => RecipeSchema.parse({ ...base, baseServings: 0 })).toThrow();
    expect(() => RecipeSchema.parse({ ...base, baseServings: -2 })).toThrow();
    expect(() => RecipeSchema.parse({ ...base, baseServings: 2.5 })).toThrow();
  });

  it("rejects an unknown category", () => {
    expect(() => RecipeSchema.parse({ ...base, category: "BRUNCH" })).toThrow();
  });

  it("treats a dish photo as optional", () => {
    expect(RecipeSchema.parse(base).dishPhoto).toBeUndefined();
  });

  it("accepts an image data URL as the dish photo", () => {
    const dataUrl = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
    expect(RecipeSchema.parse({ ...base, dishPhoto: dataUrl }).dishPhoto).toBe(dataUrl);
  });

  it("rejects a dish photo that is not an image data URL", () => {
    expect(() => RecipeSchema.parse({ ...base, dishPhoto: "ftp://x/p.png" })).toThrow();
  });
});
