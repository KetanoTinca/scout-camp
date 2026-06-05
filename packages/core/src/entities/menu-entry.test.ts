import { describe, it, expect } from "vitest";
import { MEAL_SLOTS, MenuEntrySchema } from "./menu-entry.js";

describe("MenuEntrySchema", () => {
  const base = {
    id: "m1",
    campId: "c1",
    date: "2026-07-02",
    slot: "LUNCH" as const,
    recipeId: "r1",
    updatedAt: 1,
  };

  it("accepts a well-formed entry without an override", () => {
    expect(MenuEntrySchema.parse(base)).toEqual(base);
  });

  it("accepts a positive integer serving override", () => {
    expect(MenuEntrySchema.parse({ ...base, servingsOverride: 6 }).servingsOverride).toBe(6);
  });

  it("rejects a non-positive or fractional override", () => {
    expect(() => MenuEntrySchema.parse({ ...base, servingsOverride: 0 })).toThrow();
    expect(() => MenuEntrySchema.parse({ ...base, servingsOverride: 2.5 })).toThrow();
  });

  it("rejects an unknown meal slot", () => {
    expect(() => MenuEntrySchema.parse({ ...base, slot: "SUPPER" })).toThrow();
  });

  it("requires camp, recipe ids and a valid date", () => {
    expect(() => MenuEntrySchema.parse({ ...base, campId: "" })).toThrow();
    expect(() => MenuEntrySchema.parse({ ...base, recipeId: "" })).toThrow();
    expect(() => MenuEntrySchema.parse({ ...base, date: "2026-7-2" })).toThrow();
  });
});

describe("MEAL_SLOTS", () => {
  it("lists the five slots in serving order", () => {
    expect(MEAL_SLOTS).toEqual([
      "BREAKFAST",
      "MORNING_SNACK",
      "LUNCH",
      "AFTERNOON_SNACK",
      "DINNER",
    ]);
  });
});
