import { describe, expect, it } from "vitest";
import { bandDForPlace, taxYearFor, type AuthorityRate } from "./rates.ts";

describe("taxYearFor", () => {
  it.each([
    ["2026-10-11", "2026-27"],
    ["2027-03-31", "2026-27"],
    ["2027-04-01", "2027-28"],
    ["2099-12-01", "2099-00"],
  ])("%s is in tax year %s", (date, year) => {
    expect(taxYearFor(new Date(`${date}T12:00:00Z`))).toBe(year);
  });
});

// Leeds 2026-27: parishes on the outskirts (averaged in at £12.22), none in the city centre.
const leeds: AuthorityRate = {
  gssCode: "E08000035",
  name: "Leeds",
  nation: "england",
  taxYear: "2026-27",
  areaBandD: 228373,
  components: {
    billingAuthority: 190374,
    localPrecepts: 1222,
    countyOrGla: 0,
    police: 27828,
    fire: 8949,
    combinedAuthority: 0,
  },
  variesWithinArea: true,
  hasSpecialExpenses: false,
  source: { name: "test", publisher: "test" },
};

describe("bandDForPlace", () => {
  it("is exact outside any parish when there are no special expenses", () => {
    expect(bandDForPlace(leeds, { knownUnparished: true })).toEqual({ bandD: 227151, exact: true });
  });

  it("falls back to the area average when the parish is unknown or charges a precept", () => {
    expect(bandDForPlace(leeds, { knownUnparished: false })).toEqual({ bandD: 228373, exact: false });
  });

  it("stays an average where special expenses apply", () => {
    const withSpecialExpenses = { ...leeds, hasSpecialExpenses: true };
    expect(bandDForPlace(withSpecialExpenses, { knownUnparished: true }).exact).toBe(false);
  });

  it("is exact everywhere when nothing varies within the area", () => {
    const uniform = { ...leeds, variesWithinArea: false };
    expect(bandDForPlace(uniform, { knownUnparished: false })).toEqual({ bandD: 228373, exact: true });
  });
});
