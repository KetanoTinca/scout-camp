/**
 * App-wide locale configuration. Orion's Cookbook is a single-deployment app for
 * one scout group: currency is RON and units are metric everywhere. These are fixed
 * constants rather than per-user settings (see PRD "Out of Scope": no multi-currency,
 * no imperial units).
 */

export const CURRENCY = "RON" as const;
export type Currency = typeof CURRENCY;

export const UNIT_SYSTEM = "metric" as const;
export type UnitSystem = typeof UNIT_SYSTEM;

/** BCP-47 locale used for number/currency formatting. */
export const LOCALE = "ro-RO" as const;

/**
 * Upper bound (in characters) on an inline photo's base64 data URL — the Receipt Photo and
 * Dish Photo stored on records (ADR-0002). The web client downscales/compresses well under
 * this; it bounds the synced payload so one record can't bloat a sync batch. The server's
 * `bodyLimit` is set comfortably above it to allow several photos in a single batch.
 */
export const MAX_PHOTO_DATA_URL_LENGTH = 1_500_000;

/**
 * Format an amount of RON for display, e.g. `12.5` -> "12,50 RON".
 * Kept in core so server and client render money identically.
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: CURRENCY,
  }).format(amount);
}
