import { SyncPushSchema } from "@orions-cookbook/core";
import type { FastifyInstance } from "fastify";
import { bearerFromHeader, verifyToken } from "../auth.js";
import type { Env } from "../env.js";
import type { RealtimeHub } from "../realtime.js";
import {
  listCamps,
  listExpenses,
  listIngredients,
  listMenuEntries,
  listNotes,
  listRecipeIngredients,
  listRecipes,
  listShopPrices,
  listShoppingItems,
  listShops,
} from "../repository.js";
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

    api.get("/api/shops", async () => ({ shops: await listShops() }));

    api.get("/api/shop-prices", async () => ({ shopPrices: await listShopPrices() }));

    api.get("/api/recipes", async () => ({ recipes: await listRecipes() }));

    api.get("/api/recipe-ingredients", async () => ({
      recipeIngredients: await listRecipeIngredients(),
    }));

    api.get("/api/camps", async () => ({ camps: await listCamps() }));

    // Response key is the mechanical `${entity}s` of ENTITY_MENU_ENTRY (`menuEntry`) so it
    // stays in lockstep with the Dexie table name the client mirror derives.
    api.get("/api/menu-entries", async () => ({ menuEntrys: await listMenuEntries() }));

    api.get("/api/shopping-items", async () => ({ shoppingItems: await listShoppingItems() }));

    api.get("/api/expenses", async () => ({ expenses: await listExpenses() }));

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
