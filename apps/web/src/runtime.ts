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
  await engine.hydrate("ingredient").catch(() => {
    /* offline: the mirror already has the last-known data */
  });
}
