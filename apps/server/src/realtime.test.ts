import type { WebSocket } from "@fastify/websocket";
import type { ServerChange, ServerMessage } from "@orions-cookbook/core";
import { describe, it, expect } from "vitest";
import { RealtimeHub } from "./realtime.js";

/**
 * A minimal stand-in for a `@fastify/websocket` socket: it records what was sent and lets a
 * test fire lifecycle events ("close"/"error") and flip `readyState`. Only the surface the
 * hub touches (`readyState`, `OPEN`, `send`, `on`) is implemented.
 */
class FakeSocket {
  readonly OPEN = 1;
  readonly CLOSED = 3;
  readyState = 1;
  sent: string[] = [];
  private handlers: Record<string, () => void> = {};

  send(data: string): void {
    this.sent.push(data);
  }

  on(event: string, cb: () => void): void {
    this.handlers[event] = cb;
  }

  /** Fire a registered lifecycle handler, as fastify's socket would on disconnect/error. */
  fire(event: "close" | "error"): void {
    this.handlers[event]?.();
  }

  /** Parsed messages this socket received. */
  messages(): ServerMessage[] {
    return this.sent.map((s) => JSON.parse(s) as ServerMessage);
  }
}

/** Adds a fake socket to the hub and returns it typed as the hub expects. */
function connect(hub: RealtimeHub): FakeSocket {
  const socket = new FakeSocket();
  hub.add(socket as unknown as WebSocket);
  return socket;
}

const change: ServerChange = {
  entity: "note",
  id: "n1",
  op: "put",
  updatedAt: 100,
  payload: { id: "n1", text: "hello", updatedAt: 100 },
};

describe("RealtimeHub", () => {
  it("greets a new client with a hello message and counts it", () => {
    const hub = new RealtimeHub();
    const socket = connect(hub);
    expect(hub.size).toBe(1);
    expect(socket.messages()).toEqual([{ type: "hello" }]);
  });

  it("fans an applied change out to every connected client", () => {
    const hub = new RealtimeHub();
    const a = connect(hub);
    const b = connect(hub);

    hub.broadcast(change);

    // Each client saw hello, then the change envelope.
    expect(a.messages()).toEqual([{ type: "hello" }, { type: "change", change }]);
    expect(b.messages()).toEqual([{ type: "hello" }, { type: "change", change }]);
  });

  it("skips a socket that is not open", () => {
    const hub = new RealtimeHub();
    const socket = connect(hub);
    socket.sent.length = 0; // drop the hello so we only observe the broadcast
    socket.readyState = socket.CLOSED;

    hub.broadcast(change);

    expect(socket.sent).toHaveLength(0);
  });

  it("drops a client on close so it stops receiving and is uncounted", () => {
    const hub = new RealtimeHub();
    const a = connect(hub);
    const b = connect(hub);
    a.sent.length = 0;
    b.sent.length = 0;

    a.fire("close");
    expect(hub.size).toBe(1);

    hub.broadcast(change);
    expect(a.sent).toHaveLength(0);
    expect(b.messages()).toEqual([{ type: "change", change }]);
  });

  it("drops a client on error too", () => {
    const hub = new RealtimeHub();
    const socket = connect(hub);

    socket.fire("error");

    expect(hub.size).toBe(0);
  });
});
