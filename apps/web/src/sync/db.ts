import Dexie, { type Table } from "dexie";
import type {
  Camp,
  Expense,
  Ingredient,
  MenuEntry,
  Note,
  Recipe,
  RecipeIngredient,
  Shop,
  ShopPrice,
  ShoppingItem,
} from "@orions-cookbook/core";
import type { SyncOp } from "@orions-cookbook/core";

/** A queued outbox entry: a pending write op plus its local order key. */
export interface OutboxEntry extends SyncOp {
  seq?: number;
}

/**
 * The client-side IndexedDB mirror (via Dexie). It holds:
 *   - one table per syncable entity (just `notes` in the skeleton), the offline-readable
 *     copy of server data, and
 *   - the `outbox`, an ordered queue of pending write ops awaiting flush to the server.
 *
 * Later slices add a table per new entity here and register it in the mirror's table map.
 */
export class AppDB extends Dexie {
  notes!: Table<Note, string>;
  ingredients!: Table<Ingredient, string>;
  shops!: Table<Shop, string>;
  shopPrices!: Table<ShopPrice, string>;
  recipes!: Table<Recipe, string>;
  recipeIngredients!: Table<RecipeIngredient, string>;
  camps!: Table<Camp, string>;
  // Table name is the mechanical `${entity}s` of ENTITY_MENU_ENTRY (`menuEntry`); the
  // DexieMirror derives it that way, so it must stay `menuEntrys`, not `menuEntries`.
  menuEntrys!: Table<MenuEntry, string>;
  shoppingItems!: Table<ShoppingItem, string>;
  expenses!: Table<Expense, string>;
  outbox!: Table<OutboxEntry, number>;

  constructor(name = "orions-cookbook") {
    super(name);
    this.version(1).stores({
      notes: "id, updatedAt",
      outbox: "++seq, entity, id",
    });
    // v2 (issue 0003): the shared ingredient catalog. Dexie inherits the v1 stores and
    // adds this table; the `name` index backs the catalog's alphabetical listing.
    this.version(2).stores({
      ingredients: "id, name",
    });
    // v3 (issue 0005): shops and their per-ingredient package prices. `shopPrices` is
    // indexed by ingredientId/shopId for per-ingredient price lookups and cheapest-shop math.
    this.version(3).stores({
      shops: "id, name",
      shopPrices: "id, ingredientId, shopId",
    });
    // v4 (issue 0006): recipes and their ingredient lines. `recipes` is indexed by name/category
    // for the cookbook browse/filter; `recipeIngredients` by recipeId for per-recipe line lookups.
    this.version(4).stores({
      recipes: "id, name, category",
      recipeIngredients: "id, recipeId, ingredientId",
    });
    // v5 (issue 0007): camps and their menu placements. `camps` is indexed by startDate for a
    // chronological list; `menuEntrys` by campId for per-camp grid lookups (recipeId for joins).
    this.version(5).stores({
      camps: "id, name, startDate",
      menuEntrys: "id, campId, recipeId",
    });
    // v6 (issue 0008): per-camp shopping list lines. Indexed by campId for per-camp lists and
    // ingredientId so regeneration can reconcile auto items against the menu's needs.
    this.version(6).stores({
      shoppingItems: "id, campId, ingredientId",
    });
    // v7 (issue 0010): per-camp manual spending ledger. Indexed by campId for the per-camp list.
    this.version(7).stores({
      expenses: "id, campId",
    });
  }
}
