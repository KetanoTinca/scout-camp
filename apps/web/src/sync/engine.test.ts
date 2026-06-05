import {
  ENTITY_CAMP,
  ENTITY_EXPENSE,
  ENTITY_INGREDIENT,
  ENTITY_MENU_ENTRY,
  ENTITY_NOTE,
  ENTITY_RECIPE,
  ENTITY_RECIPE_INGREDIENT,
  ENTITY_SHOP,
  ENTITY_SHOP_PRICE,
  ENTITY_SHOPPING_ITEM,
  type Note,
  type ServerChange,
  type SyncOp,
} from "@orions-cookbook/core";
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

/**
 * A fake server hub shared by several `HubTransport`s — the in-memory stand-in for the
 * Fastify `RealtimeHub`. A client's push is fanned out to *every other* subscribed client,
 * exactly as the real WebSocket broadcast does, so two engines can be driven to convergence.
 */
class FakeHub {
  online = true;
  private readonly subscribers = new Set<(change: ServerChange) => void>();

  subscribe(handler: (change: ServerChange) => void): () => void {
    this.subscribers.add(handler);
    return () => this.subscribers.delete(handler);
  }

  /** Fan a change out to every subscriber except the one that originated it. */
  broadcast(change: ServerChange, from?: (change: ServerChange) => void): void {
    for (const handler of this.subscribers) {
      if (handler !== from) handler(change);
    }
  }
}

/** A transport wired to a shared `FakeHub`: pushes broadcast to the hub's other clients. */
class HubTransport implements SyncTransport {
  private handler?: (change: ServerChange) => void;

  constructor(private readonly hub: FakeHub) {}

  async push(ops: SyncOp[]): Promise<ServerChange[]> {
    if (!this.hub.online) throw new Error("offline");
    for (const op of ops) this.hub.broadcast(op, this.handler);
    return ops;
  }

  async pull(): Promise<Record_[]> {
    return [];
  }

  subscribe(handler: (change: ServerChange) => void): () => void {
    this.handler = handler;
    const off = this.hub.subscribe(handler);
    return () => {
      this.handler = undefined;
      off();
    };
  }
}

function noteOp(id: string, text: string, updatedAt: number): SyncOp {
  const payload: Note = { id, text, updatedAt };
  return { entity: ENTITY_NOTE, id, op: "put", updatedAt, payload };
}

/** A minimal put op for an arbitrary entity — the engine only needs `id` + `updatedAt`. */
function putOp(entity: string, id: string, updatedAt: number): SyncOp {
  return { entity, id, op: "put", updatedAt, payload: { id, updatedAt } };
}

/** Every syncable entity, to prove the generic outbox/mirror plumbing is wired for each. */
const ALL_ENTITIES = [
  ENTITY_NOTE,
  ENTITY_INGREDIENT,
  ENTITY_SHOP,
  ENTITY_SHOP_PRICE,
  ENTITY_RECIPE,
  ENTITY_RECIPE_INGREDIENT,
  ENTITY_CAMP,
  ENTITY_MENU_ENTRY,
  ENTITY_SHOPPING_ITEM,
  ENTITY_EXPENSE,
] as const;

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

  it("queues every entity's writes offline and replays them all on reconnect", async () => {
    transport.online = false;
    // One offline write per syncable entity — exercises each entity's mirror table + outbox.
    for (const entity of ALL_ENTITIES) {
      await engine.enqueue(putOp(entity, `${entity}-1`, 100));
    }

    // All are visible locally and queued, but nothing has reached the server yet.
    expect(await mirror.outbox()).toHaveLength(ALL_ENTITIES.length);
    expect(transport.pushed).toHaveLength(0);
    for (const entity of ALL_ENTITIES) {
      expect(await mirror.get(entity, `${entity}-1`)).toMatchObject({ id: `${entity}-1` });
    }

    transport.online = true;
    await engine.flush();

    // Every queued op replays exactly once and the outbox drains.
    expect(transport.pushed.map((o) => o.entity).sort()).toEqual([...ALL_ENTITIES].sort());
    expect(await mirror.outbox()).toHaveLength(0);
  });

  it("replays a mix of puts and deletes from the outbox in order", async () => {
    transport.online = false;
    await engine.enqueue(noteOp("n1", "first", 100));
    await engine.enqueue(noteOp("n2", "second", 110));
    // Delete n1 while still offline — the delete must queue and replay too.
    await engine.enqueue({ entity: ENTITY_NOTE, id: "n1", op: "delete", updatedAt: 120 });

    // Locally, the optimistic delete already removed n1; n2 remains.
    expect(await mirror.get(ENTITY_NOTE, "n1")).toBeUndefined();
    expect(await mirror.get(ENTITY_NOTE, "n2")).toMatchObject({ text: "second" });

    transport.online = true;
    await engine.flush();

    // Ops replay in enqueue order: put n1, put n2, delete n1.
    expect(transport.pushed.map((o) => `${o.op}:${o.id}`)).toEqual([
      "put:n1",
      "put:n2",
      "delete:n1",
    ]);
    expect(await mirror.outbox()).toHaveLength(0);
  });

  it("propagates a client's write to other clients and converges last-write-wins", async () => {
    // Two independent clients (own mirror + engine) sharing one fake server hub.
    const hub = new FakeHub();
    const dbA = new AppDB(`A-${Math.random().toString(36).slice(2)}`);
    const dbB = new AppDB(`B-${Math.random().toString(36).slice(2)}`);
    const mirrorA = new DexieMirror(dbA);
    const mirrorB = new DexieMirror(dbB);
    const engineA = new SyncEngine({ mirror: mirrorA, transport: new HubTransport(hub) });
    const engineB = new SyncEngine({ mirror: mirrorB, transport: new HubTransport(hub) });
    engineA.start();
    engineB.start();

    try {
      // A writes; the hub fans it out to B, which converges.
      await engineA.enqueue(noteOp("n1", "from A", 100));
      await vi.waitFor(async () => {
        expect(await mirrorB.get(ENTITY_NOTE, "n1")).toMatchObject({ text: "from A" });
      });

      // B overwrites with a newer timestamp; A converges to B's value.
      await engineB.enqueue(noteOp("n1", "from B", 200));
      await vi.waitFor(async () => {
        expect(await mirrorA.get(ENTITY_NOTE, "n1")).toMatchObject({ text: "from B" });
      });

      // A late, lower-timestamp change is ignored wherever it lands — last-write-wins on the
      // timestamp, independent of arrival order. Applied directly so the assertion is
      // deterministic; both clients stay on "from B".
      await engineB.applyServerChange(noteOp("n1", "stale", 150));
      await engineA.applyServerChange(noteOp("n1", "stale", 150));
      expect(await mirrorB.get(ENTITY_NOTE, "n1")).toMatchObject({ text: "from B" });
      expect(await mirrorA.get(ENTITY_NOTE, "n1")).toMatchObject({ text: "from B" });
    } finally {
      engineA.stop();
      engineB.stop();
      await dbA.delete();
      await dbB.delete();
    }
  });
});
