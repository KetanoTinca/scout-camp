import { describe, it, expect } from "vitest";
import {
  baseUnitForDimension,
  fromBase,
  format,
  inputUnitsFor,
  inputUnitsForDimension,
  massToPieces,
  piecesToMass,
  toBase,
  toBaseFor,
} from "./units.js";

describe("baseUnitForDimension", () => {
  it("maps each dimension to its canonical base unit", () => {
    expect(baseUnitForDimension("MASS")).toBe("g");
    expect(baseUnitForDimension("VOLUME")).toBe("ml");
    expect(baseUnitForDimension("COUNT")).toBe("piece");
  });
});

describe("inputUnitsForDimension", () => {
  it("offers base + stepped-up unit for mass and volume, base only for count", () => {
    expect(inputUnitsForDimension("MASS")).toEqual(["g", "kg"]);
    expect(inputUnitsForDimension("VOLUME")).toEqual(["ml", "L"]);
    expect(inputUnitsForDimension("COUNT")).toEqual(["piece"]);
  });

  it("only offers units that toBase accepts, so entered values round-trip", () => {
    for (const dimension of ["MASS", "VOLUME", "COUNT"] as const) {
      for (const unit of inputUnitsForDimension(dimension)) {
        expect(() => toBase(1, unit)).not.toThrow();
      }
    }
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

describe("inputUnitsFor (Piece-Weight-aware)", () => {
  it("offers mass units for a COUNT ingredient that has a Piece Weight", () => {
    expect(inputUnitsFor("COUNT", 100)).toEqual(["piece", "g", "kg"]);
  });

  it("stays pieces-only for a COUNT ingredient with no (or non-positive) Piece Weight", () => {
    expect(inputUnitsFor("COUNT", undefined)).toEqual(["piece"]);
    expect(inputUnitsFor("COUNT", 0)).toEqual(["piece"]);
  });

  it("ignores a Piece Weight for non-COUNT dimensions", () => {
    expect(inputUnitsFor("MASS", 100)).toEqual(["g", "kg"]);
    expect(inputUnitsFor("VOLUME", 100)).toEqual(["ml", "L"]);
  });
});

describe("toBaseFor (Piece-Weight-aware)", () => {
  it("reduces a mass entry to pieces for a COUNT ingredient with a Piece Weight", () => {
    expect(toBaseFor(2, "kg", "COUNT", 100)).toBe(20);
    expect(toBaseFor(500, "g", "COUNT", 100)).toBe(5);
  });

  it("passes pieces straight through for COUNT", () => {
    expect(toBaseFor(3, "piece", "COUNT", 100)).toBe(3);
    expect(toBaseFor(3, "piece", "COUNT", undefined)).toBe(3);
  });

  it("is plain toBase for non-COUNT dimensions", () => {
    expect(toBaseFor(1.5, "kg", "MASS", undefined)).toBe(1500);
    expect(toBaseFor(2, "L", "VOLUME", undefined)).toBe(2000);
  });

  it("throws on a mass unit for a COUNT ingredient with no Piece Weight", () => {
    expect(() => toBaseFor(1, "kg", "COUNT", undefined)).toThrow();
  });
});

describe("massToPieces / piecesToMass (Piece Weight)", () => {
  it("converts a mass in grams to a piece count via the Piece Weight", () => {
    expect(massToPieces(2000, 100)).toBe(20);
    expect(massToPieces(1500, 100)).toBe(15);
  });

  it("composes with toBase so a kg entry becomes pieces", () => {
    expect(massToPieces(toBase(1.5, "kg"), 100)).toBe(15);
  });

  it("does not round — fractional pieces are tolerated", () => {
    expect(massToPieces(1050, 100)).toBe(10.5);
  });

  it("converts a piece count back to its approximate mass in grams", () => {
    expect(piecesToMass(20, 100)).toBe(2000);
    expect(format(piecesToMass(20, 100), "MASS")).toBe("2 kg");
  });

  it("round-trips mass -> pieces -> mass", () => {
    expect(piecesToMass(massToPieces(1700, 100), 100)).toBe(1700);
  });

  it("throws on a non-positive Piece Weight", () => {
    expect(() => massToPieces(1000, 0)).toThrow();
    expect(() => massToPieces(1000, -50)).toThrow();
    expect(() => piecesToMass(10, 0)).toThrow();
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
