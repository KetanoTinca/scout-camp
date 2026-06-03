import { z } from "zod";

/**
 * `Note` is the throwaway sample entity for the architecture skeleton (issue 0002).
 * It exists only to prove the full stack round-trips — REST CRUD, WebSocket fan-out,
 * the Dexie mirror, and the offline outbox with last-write-wins. Real domain entities
 * (Ingredient, Recipe, Camp, …) arrive in later slices and follow this same shape.
 */
export const ENTITY_NOTE = "note" as const;

export const NoteSchema = z.object({
  id: z.string().min(1),
  text: z.string(),
  /** Client timestamp (epoch ms) — the last-write-wins ordering key. */
  updatedAt: z.number().int().nonnegative(),
});
export type Note = z.infer<typeof NoteSchema>;
