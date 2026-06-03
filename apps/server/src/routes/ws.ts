import type { FastifyInstance } from "fastify";
import { verifyToken } from "../auth.js";
import type { Env } from "../env.js";
import type { RealtimeHub } from "../realtime.js";

/**
 * WebSocket endpoint for live updates. Browsers can't set an Authorization header on a
 * WebSocket, so the token is passed as a `?token=` query param and validated during the
 * upgrade. An invalid/missing token is rejected before the socket is accepted.
 */
export function registerWsRoute(app: FastifyInstance, env: Env, hub: RealtimeHub): void {
  app.register(async (ws) => {
    ws.addHook("onRequest", async (req, reply) => {
      const token = new URL(req.url, "http://localhost").searchParams.get("token") ?? undefined;
      if (!verifyToken(token, env.APP_SECRET)) {
        return reply.code(401).send({ error: "unauthorized" });
      }
    });

    ws.get("/ws", { websocket: true }, (socket) => {
      hub.add(socket);
    });
  });
}
