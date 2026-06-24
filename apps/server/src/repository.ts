import type {
  Dimension,
  BaseUnit,
  Camp,
  Expense,
  Ingredient,
  MealSlot,
  MenuEntry,
  Note,
  Recipe,
  RecipeCategory,
  RecipeIngredient,
  Shop,
  ShopPrice,
  ShoppingItem,
  ShoppingSource,
} from "@orions-cookbook/core";
import { prisma } from "./db.js";

/**
 * Thin Prisma-backed read access used to hydrate a client's Dexie mirror on first load
 * and on reconnect. Writes flow through the sync engine (see `sync.ts`); this is the
 * pull side. BigInt `updatedAt` is narrowed to a plain number at the boundary.
 */
export async function listNotes(): Promise<Note[]> {
  const rows = await prisma.note.findMany();
  return rows.map((row) => ({
    id: row.id,
    text: row.text,
    updatedAt: Number(row.updatedAt),
  }));
}

export async function listIngredients(): Promise<Ingredient[]> {
  const rows = await prisma.ingredient.findMany();
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    // Stored as plain strings; the allowed values are guaranteed by the sync-write schema.
    dimension: row.dimension as Dimension,
    baseUnit: row.baseUnit as BaseUnit,
    category: row.category ?? undefined,
    stockQty: row.stockQty,
    parLevel: row.parLevel ?? undefined,
    pieceWeight: row.pieceWeight ?? undefined,
    updatedAt: Number(row.updatedAt),
  }));
}

export async function listShops(): Promise<Shop[]> {
  const rows = await prisma.shop.findMany();
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    updatedAt: Number(row.updatedAt),
  }));
}

export async function listShopPrices(): Promise<ShopPrice[]> {
  const rows = await prisma.shopPrice.findMany();
  return rows.map((row) => ({
    id: row.id,
    ingredientId: row.ingredientId,
    shopId: row.shopId,
    packageSize: row.packageSize,
    packagePrice: row.packagePrice,
    updatedAt: Number(row.updatedAt),
  }));
}

export async function listRecipes(): Promise<Recipe[]> {
  const rows = await prisma.recipe.findMany();
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    baseServings: row.baseServings,
    // Stored as a plain string; the allowed values are guaranteed by the sync-write schema.
    category: row.category as RecipeCategory,
    // tags/steps are persisted JSON-encoded (SQLite has no array columns).
    tags: JSON.parse(row.tags) as string[],
    steps: JSON.parse(row.steps) as string[],
    dishPhoto: row.dishPhoto ?? undefined,
    updatedAt: Number(row.updatedAt),
  }));
}

export async function listRecipeIngredients(): Promise<RecipeIngredient[]> {
  const rows = await prisma.recipeIngredient.findMany();
  return rows.map((row) => ({
    id: row.id,
    recipeId: row.recipeId,
    ingredientId: row.ingredientId,
    quantity: row.quantity,
    updatedAt: Number(row.updatedAt),
  }));
}

export async function listCamps(): Promise<Camp[]> {
  const rows = await prisma.camp.findMany();
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    startDate: row.startDate,
    endDate: row.endDate,
    headcount: row.headcount,
    updatedAt: Number(row.updatedAt),
  }));
}

export async function listMenuEntries(): Promise<MenuEntry[]> {
  const rows = await prisma.menuEntry.findMany();
  return rows.map((row) => ({
    id: row.id,
    campId: row.campId,
    date: row.date,
    // Stored as a plain string; the allowed values are guaranteed by the sync-write schema.
    slot: row.slot as MealSlot,
    recipeId: row.recipeId,
    // Null in the DB means "no override"; the wire shape omits the field entirely.
    servingsOverride: row.servingsOverride ?? undefined,
    updatedAt: Number(row.updatedAt),
  }));
}

export async function listShoppingItems(): Promise<ShoppingItem[]> {
  const rows = await prisma.shoppingItem.findMany();
  return rows.map((row) => ({
    id: row.id,
    campId: row.campId,
    ingredientId: row.ingredientId,
    // Stored as a plain string; the allowed values are guaranteed by the sync-write schema.
    source: row.source as ShoppingSource,
    quantity: row.quantity,
    // Null in the DB means "not yet bought"; the wire shape omits the field entirely.
    received: row.received ?? undefined,
    updatedAt: Number(row.updatedAt),
  }));
}

export async function listExpenses(): Promise<Expense[]> {
  const rows = await prisma.expense.findMany();
  return rows.map((row) => ({
    id: row.id,
    campId: row.campId,
    amount: row.amount,
    label: row.label,
    // Null in the DB means "unset"; the wire shape omits these fields entirely.
    category: row.category ?? undefined,
    day: row.day ?? undefined,
    receiptPhoto: row.receiptPhoto ?? undefined,
    updatedAt: Number(row.updatedAt),
  }));
}
