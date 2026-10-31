import { describe, expect, it } from "vitest";
import { rankHomes } from "./compare.ts";

// The example from the product discussion: 2026/27 rates, two adults, Band C.
const hackney = { id: "hackney", rent: 150000, extras: 15262 }; // £1,500 + £152.62
const westminster = { id: "westminster", rent: 155000, extras: 7774 }; // £1,550 + £77.74

describe("rankHomes", () => {
  it("ranks by real monthly cost, not rent", () => {
    const { ranked } = rankHomes([hackney, westminster]);
    expect(ranked.map((h) => h.id)).toEqual(["westminster", "hackney"]);
    expect(ranked[0]).toMatchObject({ rank: 1, rentRank: 2, total: 162774, aboveCheapest: 0 });
    expect(ranked[1]).toMatchObject({ rank: 2, rentRank: 1, total: 165262, aboveCheapest: 2488 });
  });

  it("says when the cheapest home isn't the one with the lowest rent", () => {
    expect(rankHomes([hackney, westminster]).insight).toEqual({
      cheaperId: "westminster",
      dearerId: "hackney",
      monthlySaving: 2488,
      extraRent: 5000,
    });
  });

  it("stays quiet when rent and real cost agree", () => {
    const cheapFlat = { id: "cheap", rent: 120000, extras: 10000 };
    expect(rankHomes([hackney, cheapFlat]).insight).toBeNull();
  });

  it("stays quiet when the lowest rent is shared", () => {
    const sameRent = { id: "same", rent: 150000, extras: 20000 };
    expect(rankHomes([hackney, sameRent]).insight).toBeNull();
  });

  it("puts incomplete homes last, unranked, in the order they were saved", () => {
    const noBand = { id: "no-band", rent: 140000, extras: null };
    const noRent = { id: "no-rent", rent: null, extras: 9000 };
    const { ranked } = rankHomes([noBand, hackney, noRent, westminster]);
    expect(ranked.map((h) => h.id)).toEqual(["westminster", "hackney", "no-band", "no-rent"]);
    expect(ranked[2]).toEqual({ id: "no-band", total: null, rank: null, rentRank: null, aboveCheapest: null });
  });

  it("keeps the saved order for exact ties", () => {
    const a = { id: "a", rent: 100000, extras: 5000 };
    const b = { id: "b", rent: 100000, extras: 5000 };
    expect(rankHomes([b, a]).ranked.map((h) => h.id)).toEqual(["b", "a"]);
  });

  it("handles no homes and a single home", () => {
    expect(rankHomes([])).toEqual({ ranked: [], insight: null });
    expect(rankHomes([hackney]).ranked[0]).toMatchObject({ rank: 1, rentRank: 1, aboveCheapest: 0 });
  });

  it("counts council tax of zero as known", () => {
    const students = { id: "students", rent: 90000, extras: 0 };
    expect(rankHomes([students]).ranked[0]).toMatchObject({ total: 90000, rank: 1 });
  });
});
