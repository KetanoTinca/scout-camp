import type { WebSocket } from "@fastify/websocket";
import type { ServerChange, ServerMessage } from "@orions-cookbook/core";

/**
 * WebSocket hub. Holds every authenticated client socket and fans out entity changes
 * to all of them. The server is the single source of truth for live updates: after it
 * applies a sync op it calls `broadcast`, and the 2–3 connected leaders see it instantly.
 */
export class RealtimeHub {
  private readonly clients = new Set<WebSocket>();

  add(socket: WebSocket): void {
    this.clients.add(socket);
    this.send(socket, { type: "hello" });
    socket.on("close", () => this.clients.delete(socket));
    socket.on("error", () => this.clients.delete(socket));
  }

  /** Send an applied change to every connected client. */
  broadcast(change: ServerChange): void {
    const message: ServerMessage = { type: "change", change };
    for (const socket of this.clients) {
      this.send(socket, message);
    }
  }

  get size(): number {
    return this.clients.size;
  }

  private send(socket: WebSocket, message: ServerMessage): void {
    if (socket.readyState === socket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }
}
