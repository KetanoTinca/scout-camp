import type { Dimension, BaseUnit, Ingredient, Note } from "@orions-cookbook/core";
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
    updatedAt: Number(row.updatedAt),
  }));
}
