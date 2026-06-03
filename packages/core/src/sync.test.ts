import { describe, it, expect } from "vitest";
import { shouldApply, SyncOpSchema } from "./sync.js";

describe("shouldApply (last-write-wins)", () => {
  it("applies any write when nothing is stored yet", () => {
    expect(shouldApply(undefined, { updatedAt: 1 })).toBe(true);
  });

  it("applies a strictly newer write", () => {
    expect(shouldApply({ updatedAt: 10 }, { updatedAt: 11 })).toBe(true);
  });

  it("rejects an older write", () => {
    expect(shouldApply({ updatedAt: 10 }, { updatedAt: 9 })).toBe(false);
  });

  it("applies an equal-timestamp write so replays stay idempotent", () => {
    expect(shouldApply({ updatedAt: 10 }, { updatedAt: 10 })).toBe(true);
  });
});

describe("SyncOpSchema", () => {
  it("accepts a valid put op", () => {
    const parsed = SyncOpSchema.parse({
      entity: "note",
      id: "abc",
      op: "put",
      updatedAt: 123,
      payload: { id: "abc", text: "hi", updatedAt: 123 },
    });
    expect(parsed.op).toBe("put");
  });

  it("rejects an unknown op type", () => {
    expect(() =>
      SyncOpSchema.parse({ entity: "note", id: "abc", op: "patch", updatedAt: 1 }),
    ).toThrow();
  });
});
