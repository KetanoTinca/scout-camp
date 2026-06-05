import { z } from "zod";

/**
 * `Camp` is a planned outing (issue 0007): a `name`, the inclusive `startDate`/`endDate`
 * range it spans, and the `headcount` to cook for. It is the identity half of the menu
 * pair — the per-day, per-slot recipe placements live in `MenuEntry` (one row each), the
 * same identity/details split as `Shop`/`ShopPrice` and `Recipe`/`RecipeIngredient`.
 *
 * Recipes placed in the menu auto-scale to `headcount` via the `scaling` module; a single
 * placement may override its serving count (a hike-day meal feeding fewer people).
 */
export const ENTITY_CAMP = "camp" as const;

/** A calendar day as an ISO `YYYY-MM-DD` string — compares and sorts lexicographically. */
const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

export const CampSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    /** First day of the camp (inclusive), `YYYY-MM-DD`. */
    startDate: IsoDateSchema,
    /** Last day of the camp (inclusive), `YYYY-MM-DD`; never before `startDate`. */
    endDate: IsoDateSchema,
    /** People to cook for; the default serving target each menu recipe scales to. */
    headcount: z.number().int().positive(),
    /** Client timestamp (epoch ms) — the last-write-wins ordering key. */
    updatedAt: z.number().int().nonnegative(),
  })
  .refine((c) => c.endDate >= c.startDate, {
    message: "endDate must not be before startDate",
    path: ["endDate"],
  });
export type Camp = z.infer<typeof CampSchema>;

const DAY_MS = 86_400_000;

/**
 * The inclusive list of calendar days a camp spans, as `YYYY-MM-DD` strings. Computed in
 * UTC so it is timezone- and DST-independent (the dates are bare calendar days, not
 * instants). Returns `[]` if either date is malformed or `endDate` precedes `startDate`.
 * The menu grid renders one column/section per returned day.
 */
export function campDays(startDate: string, endDate: string): string[] {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return [];
  const days: string[] = [];
  for (let t = start; t <= end; t += DAY_MS) {
    days.push(new Date(t).toISOString().slice(0, 10));
  }
  return days;
}
