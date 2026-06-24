import { z } from "zod";

/**
 * The pure `units` module (PRD "Deep modules"). It owns the relationship between an
 * ingredient's **dimension** (what is being measured) and its **base unit** (how the app
 * stores every quantity), plus the conversion and human-display math around them.
 *
 * Three dimensions, each with exactly one canonical base unit that all stored quantities
 * use:
 *   - MASS   → grams  (g),     displayed as g below 1 kg, kg at/above.
 *   - VOLUME → millilitres (ml), displayed as ml below 1 L, L at/above.
 *   - COUNT  → pieces,          always shown as pieces (no threshold).
 *
 * No I/O, no framework — plain numbers in, plain numbers/strings out, isolation-tested.
 */

/** What an ingredient measures. Stored as a string column server-side (SQLite has no enums). */
export const DimensionSchema = z.enum(["MASS", "VOLUME", "COUNT"]);
export type Dimension = z.infer<typeof DimensionSchema>;
export const DIMENSIONS = DimensionSchema.options;

/** The canonical unit every stored quantity of a given dimension is expressed in. */
export const BaseUnitSchema = z.enum(["g", "ml", "piece"]);
export type BaseUnit = z.infer<typeof BaseUnitSchema>;
export const BASE_UNITS = BaseUnitSchema.options;

/** The base unit for a dimension (1:1). Catalog code derives `baseUnit` from `dimension`. */
export function baseUnitForDimension(dimension: Dimension): BaseUnit {
  switch (dimension) {
    case "MASS":
      return "g";
    case "VOLUME":
      return "ml";
    case "COUNT":
      return "piece";
  }
}

/**
 * The units a user may *enter* a quantity in for a given dimension, smallest first. The UI
 * offers these in a unit picker (e.g. adjusting stock in g or kg); each is a valid `toBase`
 * input, and `fromBase`'s chosen unit is always a member, so an edited value round-trips.
 */
export function inputUnitsForDimension(
  dimension: Dimension,
): readonly [DisplayQuantity["unit"], ...DisplayQuantity["unit"][]] {
  switch (dimension) {
    case "MASS":
      return ["g", "kg"];
    case "VOLUME":
      return ["ml", "L"];
    case "COUNT":
      return ["piece"];
  }
}

/**
 * The units a user may *enter* a quantity in for an ingredient, Piece-Weight-aware. Same as
 * `inputUnitsForDimension`, except a COUNT ingredient that carries a **Piece Weight** may also
 * be entered in mass (`g`/`kg`), which `toBaseFor` reduces back to pieces (issue 0002/0003,
 * ADR-0001). Without a Piece Weight, a COUNT ingredient stays pieces-only.
 */
export function inputUnitsFor(
  dimension: Dimension,
  pieceWeight?: number,
): readonly [DisplayQuantity["unit"], ...DisplayQuantity["unit"][]] {
  if (dimension === "COUNT" && pieceWeight !== undefined && pieceWeight > 0) {
    return ["piece", "g", "kg"];
  }
  return inputUnitsForDimension(dimension);
}

/** How many base units one of each accepted input unit represents. */
const UNIT_TO_BASE_FACTOR: Record<string, number> = {
  g: 1,
  kg: 1000,
  ml: 1,
  l: 1000,
  L: 1000,
  piece: 1,
  pieces: 1,
};

/**
 * Convert a quantity given in `unit` to its dimension's base unit, e.g.
 * `toBase(1.5, "kg")` → `1500` (g), `toBase(2, "L")` → `2000` (ml).
 * Throws on an unrecognised unit so bad input fails loudly at the boundary.
 */
export function toBase(value: number, unit: string): number {
  const factor = UNIT_TO_BASE_FACTOR[unit];
  if (factor === undefined) throw new Error(`Unknown unit: ${unit}`);
  return value * factor;
}

/**
 * Convert an entered `(value, unit)` to base units for an ingredient, **Piece-Weight-aware**: a
 * mass unit (`g`/`kg`) entered for a COUNT ingredient with a Piece Weight is reduced to a piece
 * count via `massToPieces`; everything else is the plain `toBase`. Stored quantities therefore
 * always stay in the dimension's Base Unit, so pricing/needs math is unchanged (issue 0002/0003,
 * ADR-0001). Throws if a mass unit is used for a COUNT ingredient with no Piece Weight.
 */
export function toBaseFor(
  value: number,
  unit: string,
  dimension: Dimension,
  pieceWeight?: number,
): number {
  if (dimension === "COUNT" && unit !== "piece" && unit !== "pieces") {
    if (pieceWeight === undefined) {
      throw new Error(`mass unit "${unit}" needs a Piece Weight for a COUNT ingredient`);
    }
    return massToPieces(toBase(value, unit), pieceWeight);
  }
  return toBase(value, unit);
}

/**
 * Convert a mass (in grams, the MASS base unit) to a piece count using a COUNT ingredient's
 * **Piece Weight** (grams per piece) — issue 0001 / ADR-0001. E.g. with a 100 g Piece Weight,
 * `massToPieces(1500, 100)` → 15 (a 1.5 kg bag is ~15 onions). Composes with `toBase` at the
 * UI edge: `massToPieces(toBase(value, "kg"), pieceWeight)`. The result is intentionally **not**
 * rounded — fractional pieces are tolerated. Throws on a non-positive Piece Weight.
 */
export function massToPieces(grams: number, pieceWeight: number): number {
  if (!(pieceWeight > 0)) throw new Error(`pieceWeight must be positive, got ${pieceWeight}`);
  return grams / pieceWeight;
}

/**
 * Convert a piece count to its approximate mass in grams via a **Piece Weight** (grams per
 * piece) — the inverse of `massToPieces`. E.g. `piecesToMass(20, 100)` → 2000 (g), which
 * `format(_, "MASS")` then renders as "2 kg". Throws on a non-positive Piece Weight.
 */
export function piecesToMass(pieces: number, pieceWeight: number): number {
  if (!(pieceWeight > 0)) throw new Error(`pieceWeight must be positive, got ${pieceWeight}`);
  return pieces * pieceWeight;
}

/** A quantity chosen for display: a magnitude and the unit it should be shown in. */
export interface DisplayQuantity {
  value: number;
  unit: "g" | "kg" | "ml" | "L" | "piece";
}

/**
 * Pick the most readable display unit for a base-unit quantity. Mass/volume step up to
 * kg/L at the 1000 threshold; count stays in pieces. Returns the magnitude in that unit
 * (e.g. `fromBase(1500, "MASS")` → `{ value: 1.5, unit: "kg" }`).
 */
export function fromBase(baseQty: number, dimension: Dimension): DisplayQuantity {
  switch (dimension) {
    case "MASS":
      return baseQty >= 1000 ? { value: baseQty / 1000, unit: "kg" } : { value: baseQty, unit: "g" };
    case "VOLUME":
      return baseQty >= 1000 ? { value: baseQty / 1000, unit: "L" } : { value: baseQty, unit: "ml" };
    case "COUNT":
      return { value: baseQty, unit: "piece" };
  }
}

/** Locale-aware number formatting (ro-RO: comma decimals), trimming trailing zeros. */
function formatNumber(value: number): string {
  return new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 3 }).format(value);
}

/**
 * Human-readable string for a base-unit quantity, e.g. `format(1500, "MASS")` → "1,5 kg",
 * `format(500, "VOLUME")` → "500 ml", `format(3, "COUNT")` → "3 pieces". This is the single
 * place the app turns a stored quantity into display text, so g/kg & ml/L thresholds and
 * locale formatting stay consistent everywhere.
 */
export function format(baseQty: number, dimension: Dimension): string {
  const { value, unit } = fromBase(baseQty, dimension);
  if (unit === "piece") {
    return `${formatNumber(value)} ${value === 1 ? "piece" : "pieces"}`;
  }
  return `${formatNumber(value)} ${unit}`;
}
