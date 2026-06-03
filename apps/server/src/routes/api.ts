import { SyncPushSchema } from "@orions-cookbook/core";
import type { FastifyInstance } from "fastify";
import { bearerFromHeader, verifyToken } from "../auth.js";
import type { Env } from "../env.js";
import type { RealtimeHub } from "../realtime.js";
import { listIngredients, listNotes } from "../repository.js";
import { applyOps } from "../sync.js";

/**
 * Authenticated REST API. Every route requires a valid bearer token. Reads (`GET
 * /api/notes`) hydrate the client mirror; writes (`POST /api/sync`) apply an outbox
 * batch last-write-wins and broadcast the winners over WebSocket.
 */
export function registerApiRoutes(app: FastifyInstance, env: Env, hub: RealtimeHub): void {
  app.register(async (api) => {
    api.addHook("onRequest", async (req, reply) => {
      const token = bearerFromHeader(req.headers.authorization);
      if (!verifyToken(token, env.APP_SECRET)) {
        return reply.code(401).send({ error: "unauthorized" });
      }
    });

    api.get("/api/notes", async () => ({ notes: await listNotes() }));

    api.get("/api/ingredients", async () => ({ ingredients: await listIngredients() }));

    api.post("/api/sync", async (req, reply) => {
      const parsed = SyncPushSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "bad_request" });
      }
      const applied = await applyOps(parsed.data.ops);
      for (const change of applied) hub.broadcast(change);
      return { applied };
    });
  });
}
