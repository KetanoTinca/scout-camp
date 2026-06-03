import {
  ENTITY_INGREDIENT,
  ENTITY_NOTE,
  IngredientSchema,
  NoteSchema,
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

const registry: Record<string, EntityHandler> = {
  [ENTITY_NOTE]: noteHandler,
  [ENTITY_INGREDIENT]: ingredientHandler,
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
