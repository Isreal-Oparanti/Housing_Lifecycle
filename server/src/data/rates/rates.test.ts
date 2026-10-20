import { describe, expect, it } from "vitest";
import { findAuthority, rateTable } from "./index.js";

const { authorities, taxYear } = rateTable();

describe("2026-27 rates", () => {
  it("covers every billing authority in England and Wales", () => {
    expect(taxYear).toBe("2026-27");
    expect(authorities.filter((a) => a.nation === "england")).toHaveLength(296);
    expect(authorities.filter((a) => a.nation === "wales")).toHaveLength(22);
  });

  it("matches published Band D figures", () => {
    // MHCLG Table 10, line 17
    expect(findAuthority("E09000012")?.areaBandD).toBe(206030); // Hackney
    expect(findAuthority("E09000033")?.areaBandD).toBe(104955); // Westminster
    expect(findAuthority("E08000003")?.areaBandD).toBe(231204); // Manchester
    // Welsh Government Table 1
    expect(findAuthority("W06000015")?.areaBandD).toBe(201318); // Cardiff
  });

  it("includes authorities created by recent reorganisations", () => {
    expect(findAuthority("E06000063")?.name).toBe("Cumberland");
    expect(findAuthority("E06000065")?.name).toBe("North Yorkshire");
    expect(findAuthority("E06000066")?.name).toBe("Somerset");
  });

  it("flags areas where parish precepts make the charge vary", () => {
    expect(findAuthority("E09000012")?.variesWithinArea).toBe(false); // Hackney: unparished
    expect(findAuthority("E07000177")?.variesWithinArea).toBe(true); // Cherwell: 72 precepting parishes
  });

  it("has components that add up to the total for every authority", () => {
    for (const authority of authorities) {
      const sum = Object.values(authority.components).reduce((total, pence) => total + pence, 0);
      expect(Math.abs(sum - authority.areaBandD), authority.name).toBeLessThanOrEqual(2);
      expect(authority.areaBandD, authority.name).toBeGreaterThan(50000);
    }
  });

  it("looks up codes case-insensitively", () => {
    expect(findAuthority(" e09000012 ")?.name).toBe("Hackney");
  });
});
