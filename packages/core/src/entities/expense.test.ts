import { describe, it, expect } from "vitest";
import { ExpenseSchema } from "./expense.js";

describe("ExpenseSchema", () => {
  const base = {
    id: "e1",
    campId: "c1",
    amount: 42.5,
    label: "Bread and milk",
    updatedAt: 1,
  };

  it("accepts a well-formed expense", () => {
    expect(ExpenseSchema.parse(base)).toEqual(base);
  });

  it("requires a positive amount", () => {
    expect(() => ExpenseSchema.parse({ ...base, amount: 0 })).toThrow();
    expect(() => ExpenseSchema.parse({ ...base, amount: -5 })).toThrow();
  });

  it("requires a camp id and a non-empty label", () => {
    expect(() => ExpenseSchema.parse({ ...base, campId: "" })).toThrow();
    expect(() => ExpenseSchema.parse({ ...base, label: "" })).toThrow();
  });

  it("treats category and day as optional — unset means unassigned", () => {
    const parsed = ExpenseSchema.parse(base);
    expect(parsed.category).toBeUndefined();
    expect(parsed.day).toBeUndefined();
  });

  it("accepts an optional category and a well-formed day", () => {
    const parsed = ExpenseSchema.parse({ ...base, category: "Fuel", day: "2026-07-02" });
    expect(parsed.category).toBe("Fuel");
    expect(parsed.day).toBe("2026-07-02");
  });

  it("rejects a malformed day", () => {
    expect(() => ExpenseSchema.parse({ ...base, day: "2026/07/02" })).toThrow();
    expect(() => ExpenseSchema.parse({ ...base, day: "July 2" })).toThrow();
  });

  it("treats a receipt photo as optional", () => {
    expect(ExpenseSchema.parse(base).receiptPhoto).toBeUndefined();
  });

  it("accepts an image data URL as the receipt photo", () => {
    const dataUrl = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
    expect(ExpenseSchema.parse({ ...base, receiptPhoto: dataUrl }).receiptPhoto).toBe(dataUrl);
  });

  it("rejects a receipt photo that is not an image data URL", () => {
    expect(() => ExpenseSchema.parse({ ...base, receiptPhoto: "https://x/r.jpg" })).toThrow();
  });
});
