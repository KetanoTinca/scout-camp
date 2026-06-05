import {
  ENTITY_CAMP,
  ENTITY_EXPENSE,
  ENTITY_INGREDIENT,
  ENTITY_MENU_ENTRY,
  ENTITY_RECIPE,
  ENTITY_RECIPE_INGREDIENT,
  ENTITY_SHOP,
  ENTITY_SHOP_PRICE,
  ENTITY_SHOPPING_ITEM,
} from "@orions-cookbook/core";
import { getToken } from "./auth.js";
import { AppDB } from "./sync/db.js";
import { DexieMirror } from "./sync/mirror.js";
import { HttpTransport } from "./sync/http-transport.js";
import { SyncEngine } from "./sync/engine.js";

/**
 * Process-wide singletons wiring the real Dexie mirror to the real HTTP/WebSocket
 * transport. Tests construct their own engine with a fake transport instead.
 */
export const db = new AppDB();
export const mirror = new DexieMirror(db);
export const transport = new HttpTransport(getToken);
export const engine = new SyncEngine({ mirror, transport });

/** Start live sync and pull a fresh copy of each entity into the mirror. */
export async function startSync(): Promise<void> {
  engine.start();
  // Replay anything left in the outbox from a previous offline session, then hydrate.
  await engine.flush();
  // Hydrate each entity independently so one offline/failed pull doesn't block the others;
  // the mirror already holds the last-known data when offline.
  await Promise.all(
    [
      ENTITY_INGREDIENT,
      ENTITY_SHOP,
      ENTITY_SHOP_PRICE,
      ENTITY_RECIPE,
      ENTITY_RECIPE_INGREDIENT,
      ENTITY_CAMP,
      ENTITY_MENU_ENTRY,
      ENTITY_SHOPPING_ITEM,
      ENTITY_EXPENSE,
    ].map((entity) =>
      engine.hydrate(entity).catch(() => {
        /* offline: keep the last-known data in the mirror */
      }),
    ),
  );
}
