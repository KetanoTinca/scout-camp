import { z } from "zod";
import { MAX_PHOTO_DATA_URL_LENGTH } from "../config.js";

/**
 * `Expense` is one line of a camp's manual spending ledger (issue 0010): an `amount` in RON
 * actually spent, a free-text `label`, an optional `category` for grouping, and an optional
 * `day` (one of the camp's days) it was spent on. One flat record hung off a camp — like
 * `ShoppingItem` and `MenuEntry`, no identity/details split — synced last-write-wins.
 *
 * The ledger is deliberately standalone: it records money that left the wallet and is
 * *independent* of the shopping list's estimated cost (issue 0008). Marking a shopping line
 * bought does not post an expense here; the camp's logged total is simply the sum of these
 * amounts, shown separately from the shopping estimate.
 */
export const ENTITY_EXPENSE = "expense" as const;

export const ExpenseSchema = z.object({
  id: z.string().min(1),
  /** The camp this expense belongs to. */
  campId: z.string().min(1),
  /** Amount spent, in RON. Positive — a zero or negative expense is meaningless. */
  amount: z.number().positive(),
  /** What the money was spent on (free text). */
  label: z.string().min(1),
  /** Optional grouping label, e.g. "Food", "Fuel", "Equipment". */
  category: z.string().optional(),
  /** Optional camp day the spend happened on, `YYYY-MM-DD` (one of `campDays`). */
  day: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD")
    .optional(),
  /**
   * Optional inline photo of the receipt, a base64 image data URL (issue 0004, ADR-0002). Pure
   * documentation: it never links the expense to a shopping line or changes the amount. The web
   * client downscales/compresses before storing; bounded so it can't bloat a sync batch.
   */
  receiptPhoto: z
    .string()
    .startsWith("data:image/")
    .max(MAX_PHOTO_DATA_URL_LENGTH)
    .optional(),
  /** Client timestamp (epoch ms) — the last-write-wins ordering key. */
  updatedAt: z.number().int().nonnegative(),
});
export type Expense = z.infer<typeof ExpenseSchema>;
