import type { ServerChange, SyncOp } from "@orions-cookbook/core";
import type { Record_ } from "./mirror.js";

/**
 * The seam between the sync engine and the network. The engine is written entirely
 * against this interface, so it can be unit-tested with a fake in-memory transport and
 * never needs a real server or WebSocket (see PRD "Testing Decisions").
 */
export interface SyncTransport {
  /** Push outbox ops to the server; resolves with the ops the server applied. Rejects when offline. */
  push(ops: SyncOp[]): Promise<ServerChange[]>;
  /** Pull the current records for an entity to hydrate the mirror. Rejects when offline. */
  pull(entity: string): Promise<Record_[]>;
  /** Subscribe to live server changes. Returns an unsubscribe function. */
  subscribe(handler: (change: ServerChange) => void): () => void;
}
