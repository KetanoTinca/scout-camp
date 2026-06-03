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
 * Format an amount of RON for display, e.g. `12.5` -> "12,50 RON".
 * Kept in core so server and client render money identically.
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: CURRENCY,
  }).format(amount);
}
