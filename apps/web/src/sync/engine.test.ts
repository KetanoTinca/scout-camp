import { ENTITY_NOTE, type Note, type ServerChange, type SyncOp } from "@orions-cookbook/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppDB } from "./db.js";
import { DexieMirror } from "./mirror.js";
import { SyncEngine } from "./engine.js";
import type { SyncTransport } from "./transport.js";
import type { Record_ } from "./mirror.js";

/**
 * A fake transport that can be toggled offline. It records pushed ops and lets a test
 * inject server-originated changes — no real network or WebSocket involved.
 */
class FakeTransport implements SyncTransport {
  online = true;
  pushed: SyncOp[] = [];
  serverRecords: Record_[] = [];
  private handler?: (change: ServerChange) => void;

  async push(ops: SyncOp[]): Promise<ServerChange[]> {
    if (!this.online) throw new Error("offline");
    this.pushed.push(...ops);
    return ops;
  }

  async pull(): Promise<Record_[]> {
    if (!this.online) throw new Error("offline");
    return this.serverRecords;
  }

  subscribe(handler: (change: ServerChange) => void): () => void {
    this.handler = handler;
    return () => {
      this.handler = undefined;
    };
  }

  /** Simulate the server broadcasting a change to this client. */
  emit(change: ServerChange): void {
    this.handler?.(change);
  }
}

function noteOp(id: string, text: string, updatedAt: number): SyncOp {
  const payload: Note = { id, text, updatedAt };
  return { entity: ENTITY_NOTE, id, op: "put", updatedAt, payload };
}

let db: AppDB;
let mirror: DexieMirror;
let transport: FakeTransport;
let engine: SyncEngine;

beforeEach(() => {
  db = new AppDB(`test-${Math.random().toString(36).slice(2)}`);
  mirror = new DexieMirror(db);
  transport = new FakeTransport();
  engine = new SyncEngine({ mirror, transport });
});

afterEach(async () => {
  engine.stop();
  await db.delete();
});

describe("SyncEngine", () => {
  it("applies a write to the mirror optimistically and flushes it when online", async () => {
    await engine.enqueue(noteOp("n1", "buy rope", 100));

    const stored = await mirror.get(ENTITY_NOTE, "n1");
    expect(stored).toMatchObject({ id: "n1", text: "buy rope" });
    await engine.flush();
    expect(transport.pushed.map((o) => o.id)).toEqual(["n1"]);
    expect(await mirror.outbox()).toHaveLength(0);
  });

  it("queues writes while offline and replays them on reconnect", async () => {
    transport.online = false;
    await engine.enqueue(noteOp("n1", "offline note", 100));

    // Visible locally, but still queued and not yet pushed.
    expect(await mirror.get(ENTITY_NOTE, "n1")).toMatchObject({ text: "offline note" });
    expect(await mirror.outbox()).toHaveLength(1);
    expect(transport.pushed).toHaveLength(0);

    transport.online = true;
    await engine.flush();

    expect(transport.pushed.map((o) => o.id)).toEqual(["n1"]);
    expect(await mirror.outbox()).toHaveLength(0);
  });

  it("resolves conflicts last-write-wins on the client timestamp", async () => {
    await engine.enqueue(noteOp("n1", "older", 100));

    // A newer server change wins.
    await engine.applyServerChange(noteOp("n1", "newer", 200));
    expect(await mirror.get(ENTITY_NOTE, "n1")).toMatchObject({ text: "newer" });

    // A stale server change (older timestamp) is ignored.
    await engine.applyServerChange(noteOp("n1", "stale", 150));
    expect(await mirror.get(ENTITY_NOTE, "n1")).toMatchObject({ text: "newer" });
  });

  it("delivers live server changes to subscribers", async () => {
    const seen: string[] = [];
    engine.subscribe((entity, id) => seen.push(`${entity}:${id}`));
    engine.start();

    transport.emit(noteOp("n2", "from another client", 300));

    // applyServerChange runs async (IndexedDB writes); wait for it to land.
    await vi.waitFor(async () => {
      expect(await mirror.get(ENTITY_NOTE, "n2")).toMatchObject({ text: "from another client" });
    });
    expect(seen).toContain(`${ENTITY_NOTE}:n2`);
  });

  it("hydrates the mirror from a pull", async () => {
    transport.serverRecords = [{ id: "n3", text: "server note", updatedAt: 50 } as Record_];
    await engine.hydrate(ENTITY_NOTE);
    expect(await mirror.get(ENTITY_NOTE, "n3")).toMatchObject({ text: "server note" });
  });
});
