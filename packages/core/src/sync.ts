import { z } from "zod";

/**
 * The generic sync protocol shared by the client outbox and the server.
 *
 * Every syncable record carries a client-supplied `updatedAt` (epoch ms). Because the
 * app assumes a *single offline writer* (the camp device), conflict resolution is plain
 * last-write-wins on that timestamp — no CRDTs (see PRD "Sync & conflict model").
 *
 * Flow:
 *   - Client applies a write to its Dexie mirror optimistically and enqueues a `SyncOp`.
 *   - On connectivity, the outbox POSTs its ops to the server, which applies them LWW.
 *   - The server broadcasts each applied change over WebSocket to all other clients.
 */

/** A write operation: upsert (`put`) or remove (`delete`) a single record. */
export const SyncOpSchema = z.object({
  /** Logical entity/table name, e.g. "note". */
  entity: z.string().min(1),
  /** Record id (client-generated, stable across the put/delete lifecycle). */
  id: z.string().min(1),
  /** "put" upserts `payload`; "delete" removes the record. */
  op: z.enum(["put", "delete"]),
  /** Client timestamp (epoch ms) used for last-write-wins ordering. */
  updatedAt: z.number().int().nonnegative(),
  /** Full record body for `put`; omitted for `delete`. */
  payload: z.unknown().optional(),
});
export type SyncOp = z.infer<typeof SyncOpSchema>;

/** A batch of ops flushed from the client outbox. */
export const SyncPushSchema = z.object({
  ops: z.array(SyncOpSchema),
});
export type SyncPush = z.infer<typeof SyncPushSchema>;

/** A change the server fans out to connected clients after applying an op. */
export const ServerChangeSchema = SyncOpSchema;
export type ServerChange = z.infer<typeof ServerChangeSchema>;

/** WebSocket envelope: server -> client live updates. */
export const ServerMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("hello") }),
  z.object({ type: z.literal("change"), change: ServerChangeSchema }),
]);
export type ServerMessage = z.infer<typeof ServerMessageSchema>;

/** Minimal shape required for last-write-wins comparison. */
export interface Timestamped {
  updatedAt: number;
}

/**
 * Last-write-wins predicate. Returns true when an incoming write should replace the
 * stored record. Uses `>=` so an idempotent replay of the same op still converges.
 */
export function shouldApply(
  existing: Timestamped | undefined,
  incoming: Timestamped,
): boolean {
  if (!existing) return true;
  return incoming.updatedAt >= existing.updatedAt;
}
