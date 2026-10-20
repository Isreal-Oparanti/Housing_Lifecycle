import { describe, expect, it } from "vitest";
import { calculateCouncilTax } from "./councilTax.ts";

const hackney = { nation: "england" as const, bandD: 206030 };

describe("calculateCouncilTax", () => {
  it("charges the full band for two or more adults", () => {
    const result = calculateCouncilTax({ ...hackney, band: "C", household: { adults: 2, fullTimeStudents: 0 } });
    expect(result.annualGross).toBe(183138);
    expect(result.annualReduction).toBe(0);
    expect(result.annualNet).toBe(183138);
    expect(result.monthlyAverage).toBe(15262);
    expect(result.tenMonthInstalment).toBe(18314);
  });

  it("takes 25% off for a single adult", () => {
    const result = calculateCouncilTax({ ...hackney, band: "C", household: { adults: 1, fullTimeStudents: 0 } });
    expect(result.relief).toEqual({ kind: "single_person_discount", percent: 25 });
    expect(result.annualReduction).toBe(45785);
    expect(result.annualNet).toBe(137353);
    expect(result.monthlyAverage).toBe(11446);
  });

  it("charges nothing when every adult is a full-time student", () => {
    const result = calculateCouncilTax({ ...hackney, band: "C", household: { adults: 3, fullTimeStudents: 3 } });
    expect(result.annualNet).toBe(0);
    expect(result.monthlyAverage).toBe(0);
    expect(result.tenMonthInstalment).toBe(0);
  });

  it("keeps gross minus reduction equal to net to the penny", () => {
    for (const band of ["A", "B", "C", "D", "E", "F", "G", "H"] as const) {
      const r = calculateCouncilTax({ ...hackney, band, household: { adults: 1, fullTimeStudents: 0 } });
      expect(r.annualGross - r.annualReduction).toBe(r.annualNet);
    }
  });

  it("rejects a Band D that is not whole positive pence", () => {
    const household = { adults: 2, fullTimeStudents: 0 };
    expect(() => calculateCouncilTax({ ...hackney, bandD: 2060.3, band: "C", household })).toThrow(RangeError);
    expect(() => calculateCouncilTax({ ...hackney, bandD: 0, band: "C", household })).toThrow(RangeError);
  });
});
