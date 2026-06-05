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
  ServerMessageSchema,
  type ServerChange,
  type SyncOp,
} from "@orions-cookbook/core";
import type { Record_ } from "./mirror.js";
import type { SyncTransport } from "./transport.js";

/** Maps an entity to its REST pull endpoint and the response key holding the array. */
const PULL_ENDPOINTS: Record<string, { path: string; key: string }> = {
  [ENTITY_NOTE]: { path: "/api/notes", key: "notes" },
  [ENTITY_INGREDIENT]: { path: "/api/ingredients", key: "ingredients" },
  [ENTITY_SHOP]: { path: "/api/shops", key: "shops" },
  [ENTITY_SHOP_PRICE]: { path: "/api/shop-prices", key: "shopPrices" },
  [ENTITY_RECIPE]: { path: "/api/recipes", key: "recipes" },
  [ENTITY_RECIPE_INGREDIENT]: { path: "/api/recipe-ingredients", key: "recipeIngredients" },
  [ENTITY_CAMP]: { path: "/api/camps", key: "camps" },
  // Key is the mechanical `${entity}s` of `menuEntry`, matching the server response and the
  // Dexie table name — see http-transport's lockstep note in db.ts / routes/api.ts.
  [ENTITY_MENU_ENTRY]: { path: "/api/menu-entries", key: "menuEntrys" },
  [ENTITY_SHOPPING_ITEM]: { path: "/api/shopping-items", key: "shoppingItems" },
  [ENTITY_EXPENSE]: { path: "/api/expenses", key: "expenses" },
};

/**
 * Real network transport: REST for push/pull, a WebSocket for live changes. The token is
 * read lazily on every call so a fresh login (or offline-cached token) is always used.
 */
export class HttpTransport implements SyncTransport {
  private ws?: WebSocket;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private closed = false;

  constructor(private readonly getToken: () => string | null) {}

  async push(ops: SyncOp[]): Promise<ServerChange[]> {
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: this.jsonHeaders(),
      body: JSON.stringify({ ops }),
    });
    if (!res.ok) throw new Error(`push failed: ${res.status}`);
    const body = (await res.json()) as { applied: ServerChange[] };
    return body.applied;
  }

  async pull(entity: string): Promise<Record_[]> {
    const endpoint = PULL_ENDPOINTS[entity];
    if (!endpoint) throw new Error(`No pull endpoint for entity: ${entity}`);
    const res = await fetch(endpoint.path, { headers: this.jsonHeaders() });
    if (!res.ok) throw new Error(`pull failed: ${res.status}`);
    const body = (await res.json()) as Record<string, Record_[]>;
    return body[endpoint.key] ?? [];
  }

  subscribe(handler: (change: ServerChange) => void): () => void {
    this.closed = false;
    const connect = () => {
      const token = this.getToken();
      if (!token) return; // not logged in yet; caller re-subscribes after login
      const proto = location.protocol === "https:" ? "wss" : "ws";
      const ws = new WebSocket(`${proto}://${location.host}/ws?token=${encodeURIComponent(token)}`);
      this.ws = ws;
      ws.onmessage = (event) => {
        const parsed = ServerMessageSchema.safeParse(JSON.parse(event.data as string));
        if (parsed.success && parsed.data.type === "change") {
          handler(parsed.data.change);
        }
      };
      ws.onclose = () => {
        if (!this.closed) this.reconnectTimer = setTimeout(connect, 2000);
      };
    };
    connect();
    return () => {
      this.closed = true;
      if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
      this.ws?.close();
    };
  }

  private jsonHeaders(): HeadersInit {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const token = this.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }
}
