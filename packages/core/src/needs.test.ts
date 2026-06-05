import { describe, it, expect } from "vitest";
import { aggregateNeeds, netToBuy, shoppingNeeds, type NeedSource } from "./needs.js";

describe("aggregateNeeds", () => {
  it("scales each line to its placement's target servings", () => {
    // 200 g flour written for 4 servings, cooked for 12 → 600 g.
    const sources: NeedSource[] = [
      { baseServings: 4, targetServings: 12, lines: [{ ingredientId: "flour", quantity: 200 }] },
    ];
    expect(aggregateNeeds(sources).get("flour")).toBe(600);
  });

  it("sums the same ingredient across multiple recipes/slots", () => {
    const sources: NeedSource[] = [
      // Breakfast: 100 g sugar for 4 → cook 8 = 200 g
      { baseServings: 4, targetServings: 8, lines: [{ ingredientId: "sugar", quantity: 100 }] },
      // Dessert: 50 g sugar for 2 → cook 8 = 200 g
      { baseServings: 2, targetServings: 8, lines: [{ ingredientId: "sugar", quantity: 50 }] },
    ];
    expect(aggregateNeeds(sources).get("sugar")).toBe(400);
  });

  it("honours a per-placement serving override independently of other placements", () => {
    const sources: NeedSource[] = [
      // headcount placement: 300 ml milk for 6 → 12 = 600 ml
      { baseServings: 6, targetServings: 12, lines: [{ ingredientId: "milk", quantity: 300 }] },
      // hike-day override of 4: 300 ml milk for 6 → 4 = 200 ml
      { baseServings: 6, targetServings: 4, lines: [{ ingredientId: "milk", quantity: 300 }] },
    ];
    expect(aggregateNeeds(sources).get("milk")).toBe(800);
  });

  it("keeps ingredients of different dimensions separate", () => {
    const sources: NeedSource[] = [
      {
        baseServings: 4,
        targetServings: 4,
        lines: [
          { ingredientId: "flour", quantity: 500 }, // MASS, grams
          { ingredientId: "water", quantity: 1000 }, // VOLUME, ml
          { ingredientId: "egg", quantity: 6 }, // COUNT, pieces
        ],
      },
    ];
    const totals = aggregateNeeds(sources);
    expect(totals.get("flour")).toBe(500);
    expect(totals.get("water")).toBe(1000);
    expect(totals.get("egg")).toBe(6);
  });

  it("returns an empty map for no placements", () => {
    expect(aggregateNeeds([]).size).toBe(0);
  });
});

describe("netToBuy", () => {
  it("subtracts stock from need", () => {
    expect(netToBuy(600, 200)).toBe(400);
  });

  it("floors at zero when stock covers the need", () => {
    expect(netToBuy(300, 500)).toBe(0);
    expect(netToBuy(300, 300)).toBe(0);
  });
});

describe("shoppingNeeds", () => {
  const sources: NeedSource[] = [
    {
      baseServings: 4,
      targetServings: 8,
      lines: [
        { ingredientId: "flour", quantity: 200 }, // need 400
        { ingredientId: "salt", quantity: 10 }, // need 20
      ],
    },
  ];

  it("nets aggregated needs against inventory and floors each shortfall", () => {
    const stock = new Map([
      ["flour", 100], // 400 − 100 = 300 to buy
      ["salt", 50], // 20 − 50 → 0 to buy (over-stocked)
    ]);
    const needs = shoppingNeeds(sources, stock);

    const flour = needs.find((n) => n.ingredientId === "flour");
    expect(flour).toEqual({ ingredientId: "flour", needed: 400, stock: 100, toBuy: 300 });

    const salt = needs.find((n) => n.ingredientId === "salt");
    expect(salt).toEqual({ ingredientId: "salt", needed: 20, stock: 50, toBuy: 0 });
  });

  it("treats a missing stock entry as zero on hand", () => {
    const needs = shoppingNeeds(sources, new Map());
    expect(needs.find((n) => n.ingredientId === "flour")?.toBuy).toBe(400);
  });
});
