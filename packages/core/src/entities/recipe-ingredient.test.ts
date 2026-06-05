import { describe, it, expect } from "vitest";
import { RecipeIngredientSchema } from "./recipe-ingredient.js";

describe("RecipeIngredientSchema", () => {
  const base = {
    id: "ri1",
    recipeId: "r1",
    ingredientId: "i1",
    quantity: 1000,
    updatedAt: 1,
  };

  it("accepts a well-formed line", () => {
    expect(RecipeIngredientSchema.parse(base)).toEqual(base);
  });

  it("allows a zero quantity but rejects a negative one", () => {
    expect(RecipeIngredientSchema.parse({ ...base, quantity: 0 }).quantity).toBe(0);
    expect(() => RecipeIngredientSchema.parse({ ...base, quantity: -1 })).toThrow();
  });

  it("requires a recipe id and an ingredient id", () => {
    expect(() => RecipeIngredientSchema.parse({ ...base, recipeId: "" })).toThrow();
    expect(() => RecipeIngredientSchema.parse({ ...base, ingredientId: "" })).toThrow();
  });
});
