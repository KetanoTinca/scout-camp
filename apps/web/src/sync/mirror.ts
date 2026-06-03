import type { Table } from "dexie";
import type { SyncOp, Timestamped } from "@orions-cookbook/core";
import { AppDB, type OutboxEntry } from "./db.js";

/** A stored record always has a string id and an `updatedAt` ordering key. */
export type Record_ = Timestamped & { id: string };

/**
 * Abstraction over the local store the sync engine reads and writes. Backed by Dexie in
 * the app (`DexieMirror`); the interface keeps the engine testable and lets later slices
 * add entities by extending the table map in one place.
 */
export interface Mirror {
  get(entity: string, id: string): Promise<Record_ | undefined>;
  put(entity: string, record: Record_): Promise<void>;
  remove(entity: string, id: string): Promise<void>;
  all(entity: string): Promise<Record_[]>;

  enqueue(op: SyncOp): Promise<void>;
  outbox(): Promise<Required<OutboxEntry>[]>;
  clearOutbox(seqs: number[]): Promise<void>;
}

export class DexieMirror implements Mirror {
  constructor(private readonly db: AppDB) {}

  private table(entity: string): Table<Record_, string> {
    const t = (this.db as unknown as Record<string, Table<Record_, string>>)[`${entity}s`];
    if (!t) throw new Error(`Unknown sync entity: ${entity}`);
    return t;
  }

  get(entity: string, id: string): Promise<Record_ | undefined> {
    return this.table(entity).get(id);
  }

  async put(entity: string, record: Record_): Promise<void> {
    await this.table(entity).put(record);
  }

  async remove(entity: string, id: string): Promise<void> {
    await this.table(entity).delete(id);
  }

  all(entity: string): Promise<Record_[]> {
    return this.table(entity).toArray();
  }

  async enqueue(op: SyncOp): Promise<void> {
    await this.db.outbox.add(op as OutboxEntry);
  }

  async outbox(): Promise<Required<OutboxEntry>[]> {
    const entries = await this.db.outbox.orderBy("seq").toArray();
    return entries as Required<OutboxEntry>[];
  }

  async clearOutbox(seqs: number[]): Promise<void> {
    await this.db.outbox.bulkDelete(seqs);
  }
}
