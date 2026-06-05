import { describe, it, expect } from "vitest";
import { CampSchema, campDays } from "./camp.js";

describe("CampSchema", () => {
  const base = {
    id: "c1",
    name: "Summer Camp",
    startDate: "2026-07-01",
    endDate: "2026-07-05",
    headcount: 12,
    updatedAt: 1,
  };

  it("accepts a well-formed camp", () => {
    expect(CampSchema.parse(base)).toEqual(base);
  });

  it("requires a positive integer headcount", () => {
    expect(() => CampSchema.parse({ ...base, headcount: 0 })).toThrow();
    expect(() => CampSchema.parse({ ...base, headcount: -3 })).toThrow();
    expect(() => CampSchema.parse({ ...base, headcount: 2.5 })).toThrow();
  });

  it("rejects malformed dates", () => {
    expect(() => CampSchema.parse({ ...base, startDate: "2026/07/01" })).toThrow();
    expect(() => CampSchema.parse({ ...base, endDate: "July 5" })).toThrow();
  });

  it("rejects an end date before the start date", () => {
    expect(() => CampSchema.parse({ ...base, endDate: "2026-06-30" })).toThrow();
  });

  it("allows a single-day camp (start equals end)", () => {
    expect(CampSchema.parse({ ...base, endDate: "2026-07-01" }).endDate).toBe("2026-07-01");
  });
});

describe("campDays", () => {
  it("lists every day in an inclusive range", () => {
    expect(campDays("2026-07-01", "2026-07-05")).toEqual([
      "2026-07-01",
      "2026-07-02",
      "2026-07-03",
      "2026-07-04",
      "2026-07-05",
    ]);
  });

  it("returns the single day when start equals end", () => {
    expect(campDays("2026-07-01", "2026-07-01")).toEqual(["2026-07-01"]);
  });

  it("crosses month boundaries", () => {
    expect(campDays("2026-07-30", "2026-08-02")).toEqual([
      "2026-07-30",
      "2026-07-31",
      "2026-08-01",
      "2026-08-02",
    ]);
  });

  it("returns empty when the end precedes the start or a date is malformed", () => {
    expect(campDays("2026-07-05", "2026-07-01")).toEqual([]);
    expect(campDays("nope", "2026-07-01")).toEqual([]);
  });
});
