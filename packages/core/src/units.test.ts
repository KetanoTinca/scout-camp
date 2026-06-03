import { describe, it, expect } from "vitest";
import { baseUnitForDimension, fromBase, format, toBase } from "./units.js";

describe("baseUnitForDimension", () => {
  it("maps each dimension to its canonical base unit", () => {
    expect(baseUnitForDimension("MASS")).toBe("g");
    expect(baseUnitForDimension("VOLUME")).toBe("ml");
    expect(baseUnitForDimension("COUNT")).toBe("piece");
  });
});

describe("toBase", () => {
  it("keeps base units unchanged", () => {
    expect(toBase(250, "g")).toBe(250);
    expect(toBase(500, "ml")).toBe(500);
    expect(toBase(3, "piece")).toBe(3);
  });

  it("scales kg and litres up to base units", () => {
    expect(toBase(1.5, "kg")).toBe(1500);
    expect(toBase(2, "L")).toBe(2000);
    expect(toBase(2, "l")).toBe(2000);
  });

  it("accepts the plural 'pieces' alias", () => {
    expect(toBase(4, "pieces")).toBe(4);
  });

  it("throws on an unknown unit", () => {
    expect(() => toBase(1, "cup")).toThrow();
  });
});

describe("fromBase (display thresholds)", () => {
  it("shows mass in grams below 1 kg and kilograms at/above", () => {
    expect(fromBase(999, "MASS")).toEqual({ value: 999, unit: "g" });
    expect(fromBase(1000, "MASS")).toEqual({ value: 1, unit: "kg" });
    expect(fromBase(1500, "MASS")).toEqual({ value: 1.5, unit: "kg" });
  });

  it("shows volume in millilitres below 1 L and litres at/above", () => {
    expect(fromBase(999, "VOLUME")).toEqual({ value: 999, unit: "ml" });
    expect(fromBase(1000, "VOLUME")).toEqual({ value: 1, unit: "L" });
    expect(fromBase(2500, "VOLUME")).toEqual({ value: 2.5, unit: "L" });
  });

  it("keeps count in pieces with no threshold", () => {
    expect(fromBase(0, "COUNT")).toEqual({ value: 0, unit: "piece" });
    expect(fromBase(5000, "COUNT")).toEqual({ value: 5000, unit: "piece" });
  });
});

describe("format", () => {
  it("formats mass with the g/kg threshold and ro-RO decimals", () => {
    expect(format(500, "MASS")).toBe("500 g");
    expect(format(1500, "MASS")).toBe("1,5 kg");
  });

  it("formats volume with the ml/L threshold", () => {
    expect(format(750, "VOLUME")).toBe("750 ml");
    expect(format(2500, "VOLUME")).toBe("2,5 L");
  });

  it("pluralises pieces, keeping the singular for one", () => {
    expect(format(1, "COUNT")).toBe("1 piece");
    expect(format(3, "COUNT")).toBe("3 pieces");
  });
});
