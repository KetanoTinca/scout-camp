import { shouldApply, type ServerChange, type SyncOp } from "@orions-cookbook/core";
import type { Mirror, Record_ } from "./mirror.js";
import type { SyncTransport } from "./transport.js";

export type ChangeListener = (entity: string, id: string) => void;

/**
 * The generic offline-first sync engine (PRD "sync" module).
 *
 * Reads come from the local mirror, so the UI works fully offline. A write is applied to
 * the mirror optimistically and appended to the outbox; if online it flushes immediately,
 * otherwise it waits. On reconnect the outbox is replayed. The server resolves conflicts
 * last-write-wins on each op's client `updatedAt`, and the same `shouldApply` rule guards
 * every local apply so live WebSocket changes and replays converge identically.
 */
export class SyncEngine {
  private readonly mirror: Mirror;
  private readonly transport: SyncTransport;
  private readonly listeners = new Set<ChangeListener>();
  private flushing = false;
  private unsubscribe?: () => void;

  constructor(deps: { mirror: Mirror; transport: SyncTransport }) {
    this.mirror = deps.mirror;
    this.transport = deps.transport;
  }

  /** Begin receiving live changes from the transport. */
  start(): void {
    this.unsubscribe ??= this.transport.subscribe((change) => {
      void this.applyServerChange(change);
    });
  }

  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }

  subscribe(listener: ChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Optimistically apply a write to the mirror, append it to the outbox, and try to flush.
   * Safe to call offline — the op stays queued until the next successful flush.
   */
  async enqueue(op: SyncOp): Promise<void> {
    await this.applyLocal(op);
    await this.mirror.enqueue(op);
    this.notify(op.entity, op.id);
    void this.flush();
  }

  /** Replay the outbox to the server. No-op (and harmless) when offline — ops stay queued. */
  async flush(): Promise<void> {
    if (this.flushing) return;
    this.flushing = true;
    try {
      const entries = await this.mirror.outbox();
      if (entries.length === 0) return;
      const ops: SyncOp[] = entries.map(({ seq: _seq, ...op }) => op);
      await this.transport.push(ops);
      await this.mirror.clearOutbox(entries.map((e) => e.seq));
    } catch {
      // Offline or server unreachable: leave ops in the outbox for the next attempt.
    } finally {
      this.flushing = false;
    }
  }

  /** Pull an entity's records from the server and merge them into the mirror (LWW). */
  async hydrate(entity: string): Promise<void> {
    const records = await this.transport.pull(entity);
    for (const record of records) {
      await this.applyServerChange({
        entity,
        id: record.id,
        op: "put",
        updatedAt: record.updatedAt,
        payload: record,
      });
    }
  }

  /** Apply a server-originated change (live WS update or hydration) under LWW. */
  async applyServerChange(change: ServerChange): Promise<void> {
    const applied = await this.applyLocal(change);
    if (applied) this.notify(change.entity, change.id);
  }

  private async applyLocal(op: SyncOp): Promise<boolean> {
    const existing = await this.mirror.get(op.entity, op.id);
    if (!shouldApply(existing, op)) return false;
    if (op.op === "put") {
      await this.mirror.put(op.entity, op.payload as Record_);
    } else {
      await this.mirror.remove(op.entity, op.id);
    }
    return true;
  }

  private notify(entity: string, id: string): void {
    for (const listener of this.listeners) listener(entity, id);
  }
}
