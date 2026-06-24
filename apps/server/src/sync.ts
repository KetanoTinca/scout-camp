import {
  CampSchema,
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
  ExpenseSchema,
  IngredientSchema,
  MenuEntrySchema,
  NoteSchema,
  RecipeIngredientSchema,
  RecipeSchema,
  ShopPriceSchema,
  ShopSchema,
  ShoppingItemSchema,
  shouldApply,
  type ServerChange,
  type SyncOp,
  type Timestamped,
} from "@orions-cookbook/core";
import type { ZodType } from "zod";
import { prisma } from "./db.js";

/**
 * Generic server-side sync engine. Each syncable entity registers a small handler that
 * knows how to read its timestamp and upsert/delete a row. `applyOps` walks an incoming
 * outbox batch, resolves each op last-write-wins against stored state, persists the
 * winners, and returns the changes to broadcast over WebSocket.
 *
 * The skeleton registers only `note`; later slices register their own entities here and
 * inherit the LWW + broadcast behaviour for free.
 */
interface EntityHandler {
  /** Validates the `put` payload before it is persisted. */
  schema: ZodType;
  /** Current stored record (for the LWW comparison), or undefined if absent. */
  get(id: string): Promise<Timestamped | undefined>;
  put(payload: unknown): Promise<void>;
  delete(id: string): Promise<void>;
}

const noteHandler: EntityHandler = {
  schema: NoteSchema,
  async get(id) {
    const row = await prisma.note.findUnique({ where: { id } });
    return row ? { updatedAt: Number(row.updatedAt) } : undefined;
  },
  async put(payload) {
    const note = NoteSchema.parse(payload);
    await prisma.note.upsert({
      where: { id: note.id },
      create: { id: note.id, text: note.text, updatedAt: BigInt(note.updatedAt) },
      update: { text: note.text, updatedAt: BigInt(note.updatedAt) },
    });
  },
  async delete(id) {
    await prisma.note.deleteMany({ where: { id } });
  },
};

const ingredientHandler: EntityHandler = {
  schema: IngredientSchema,
  async get(id) {
    const row = await prisma.ingredient.findUnique({ where: { id } });
    return row ? { updatedAt: Number(row.updatedAt) } : undefined;
  },
  async put(payload) {
    const ing = IngredientSchema.parse(payload);
    const fields = {
      name: ing.name,
      dimension: ing.dimension,
      baseUnit: ing.baseUnit,
      category: ing.category ?? null,
      stockQty: ing.stockQty,
      parLevel: ing.parLevel ?? null,
      pieceWeight: ing.pieceWeight ?? null,
      updatedAt: BigInt(ing.updatedAt),
    };
    await prisma.ingredient.upsert({
      where: { id: ing.id },
      create: { id: ing.id, ...fields },
      update: fields,
    });
  },
  async delete(id) {
    await prisma.ingredient.deleteMany({ where: { id } });
  },
};

const shopHandler: EntityHandler = {
  schema: ShopSchema,
  async get(id) {
    const row = await prisma.shop.findUnique({ where: { id } });
    return row ? { updatedAt: Number(row.updatedAt) } : undefined;
  },
  async put(payload) {
    const shop = ShopSchema.parse(payload);
    await prisma.shop.upsert({
      where: { id: shop.id },
      create: { id: shop.id, name: shop.name, updatedAt: BigInt(shop.updatedAt) },
      update: { name: shop.name, updatedAt: BigInt(shop.updatedAt) },
    });
  },
  async delete(id) {
    await prisma.shop.deleteMany({ where: { id } });
  },
};

const shopPriceHandler: EntityHandler = {
  schema: ShopPriceSchema,
  async get(id) {
    const row = await prisma.shopPrice.findUnique({ where: { id } });
    return row ? { updatedAt: Number(row.updatedAt) } : undefined;
  },
  async put(payload) {
    const price = ShopPriceSchema.parse(payload);
    const fields = {
      ingredientId: price.ingredientId,
      shopId: price.shopId,
      packageSize: price.packageSize,
      packagePrice: price.packagePrice,
      updatedAt: BigInt(price.updatedAt),
    };
    await prisma.shopPrice.upsert({
      where: { id: price.id },
      create: { id: price.id, ...fields },
      update: fields,
    });
  },
  async delete(id) {
    await prisma.shopPrice.deleteMany({ where: { id } });
  },
};

const recipeHandler: EntityHandler = {
  schema: RecipeSchema,
  async get(id) {
    const row = await prisma.recipe.findUnique({ where: { id } });
    return row ? { updatedAt: Number(row.updatedAt) } : undefined;
  },
  async put(payload) {
    const recipe = RecipeSchema.parse(payload);
    const fields = {
      name: recipe.name,
      baseServings: recipe.baseServings,
      category: recipe.category,
      // tags/steps are string[] — stored JSON-encoded, SQLite has no array columns.
      tags: JSON.stringify(recipe.tags),
      steps: JSON.stringify(recipe.steps),
      dishPhoto: recipe.dishPhoto ?? null,
      updatedAt: BigInt(recipe.updatedAt),
    };
    await prisma.recipe.upsert({
      where: { id: recipe.id },
      create: { id: recipe.id, ...fields },
      update: fields,
    });
  },
  async delete(id) {
    await prisma.recipe.deleteMany({ where: { id } });
  },
};

const recipeIngredientHandler: EntityHandler = {
  schema: RecipeIngredientSchema,
  async get(id) {
    const row = await prisma.recipeIngredient.findUnique({ where: { id } });
    return row ? { updatedAt: Number(row.updatedAt) } : undefined;
  },
  async put(payload) {
    const line = RecipeIngredientSchema.parse(payload);
    const fields = {
      recipeId: line.recipeId,
      ingredientId: line.ingredientId,
      quantity: line.quantity,
      updatedAt: BigInt(line.updatedAt),
    };
    await prisma.recipeIngredient.upsert({
      where: { id: line.id },
      create: { id: line.id, ...fields },
      update: fields,
    });
  },
  async delete(id) {
    await prisma.recipeIngredient.deleteMany({ where: { id } });
  },
};

const campHandler: EntityHandler = {
  schema: CampSchema,
  async get(id) {
    const row = await prisma.camp.findUnique({ where: { id } });
    return row ? { updatedAt: Number(row.updatedAt) } : undefined;
  },
  async put(payload) {
    const camp = CampSchema.parse(payload);
    const fields = {
      name: camp.name,
      startDate: camp.startDate,
      endDate: camp.endDate,
      headcount: camp.headcount,
      updatedAt: BigInt(camp.updatedAt),
    };
    await prisma.camp.upsert({
      where: { id: camp.id },
      create: { id: camp.id, ...fields },
      update: fields,
    });
  },
  async delete(id) {
    await prisma.camp.deleteMany({ where: { id } });
  },
};

const menuEntryHandler: EntityHandler = {
  schema: MenuEntrySchema,
  async get(id) {
    const row = await prisma.menuEntry.findUnique({ where: { id } });
    return row ? { updatedAt: Number(row.updatedAt) } : undefined;
  },
  async put(payload) {
    const entry = MenuEntrySchema.parse(payload);
    const fields = {
      campId: entry.campId,
      date: entry.date,
      slot: entry.slot,
      recipeId: entry.recipeId,
      servingsOverride: entry.servingsOverride ?? null,
      updatedAt: BigInt(entry.updatedAt),
    };
    await prisma.menuEntry.upsert({
      where: { id: entry.id },
      create: { id: entry.id, ...fields },
      update: fields,
    });
  },
  async delete(id) {
    await prisma.menuEntry.deleteMany({ where: { id } });
  },
};

const shoppingItemHandler: EntityHandler = {
  schema: ShoppingItemSchema,
  async get(id) {
    const row = await prisma.shoppingItem.findUnique({ where: { id } });
    return row ? { updatedAt: Number(row.updatedAt) } : undefined;
  },
  async put(payload) {
    const item = ShoppingItemSchema.parse(payload);
    const fields = {
      campId: item.campId,
      ingredientId: item.ingredientId,
      source: item.source,
      quantity: item.quantity,
      received: item.received ?? null,
      updatedAt: BigInt(item.updatedAt),
    };
    await prisma.shoppingItem.upsert({
      where: { id: item.id },
      create: { id: item.id, ...fields },
      update: fields,
    });
  },
  async delete(id) {
    await prisma.shoppingItem.deleteMany({ where: { id } });
  },
};

const expenseHandler: EntityHandler = {
  schema: ExpenseSchema,
  async get(id) {
    const row = await prisma.expense.findUnique({ where: { id } });
    return row ? { updatedAt: Number(row.updatedAt) } : undefined;
  },
  async put(payload) {
    const expense = ExpenseSchema.parse(payload);
    const fields = {
      campId: expense.campId,
      amount: expense.amount,
      label: expense.label,
      category: expense.category ?? null,
      day: expense.day ?? null,
      receiptPhoto: expense.receiptPhoto ?? null,
      updatedAt: BigInt(expense.updatedAt),
    };
    await prisma.expense.upsert({
      where: { id: expense.id },
      create: { id: expense.id, ...fields },
      update: fields,
    });
  },
  async delete(id) {
    await prisma.expense.deleteMany({ where: { id } });
  },
};

const registry: Record<string, EntityHandler> = {
  [ENTITY_NOTE]: noteHandler,
  [ENTITY_INGREDIENT]: ingredientHandler,
  [ENTITY_SHOP]: shopHandler,
  [ENTITY_SHOP_PRICE]: shopPriceHandler,
  [ENTITY_RECIPE]: recipeHandler,
  [ENTITY_RECIPE_INGREDIENT]: recipeIngredientHandler,
  [ENTITY_CAMP]: campHandler,
  [ENTITY_MENU_ENTRY]: menuEntryHandler,
  [ENTITY_SHOPPING_ITEM]: shoppingItemHandler,
  [ENTITY_EXPENSE]: expenseHandler,
};

/**
 * Apply a single op with last-write-wins semantics. Returns the change to broadcast,
 * or null if the op was a no-op (older than stored state, or an unknown entity).
 */
export async function applyOp(op: SyncOp): Promise<ServerChange | null> {
  const handler = registry[op.entity];
  if (!handler) return null;

  const existing = await handler.get(op.id);
  if (!shouldApply(existing, op)) return null;

  if (op.op === "put") {
    handler.schema.parse(op.payload);
    await handler.put(op.payload);
  } else {
    await handler.delete(op.id);
  }
  return op;
}

/** Apply an outbox batch in order; return the changes that actually took effect. */
export async function applyOps(ops: SyncOp[]): Promise<ServerChange[]> {
  const applied: ServerChange[] = [];
  for (const op of ops) {
    const change = await applyOp(op);
    if (change) applied.push(change);
  }
  return applied;
}
