import { describe, expect, it } from "vitest";
import { bandCharge, bandRatio, bandsFor, parseBand } from "./bands.ts";

describe("bandsFor", () => {
  it("gives England A–H, Wales A–I and Scotland A–H", () => {
    expect(bandsFor("england")).toEqual(["A", "B", "C", "D", "E", "F", "G", "H"]);
    expect(bandsFor("wales")).toEqual(["A", "B", "C", "D", "E", "F", "G", "H", "I"]);
    expect(bandsFor("scotland")).toEqual(["A", "B", "C", "D", "E", "F", "G", "H"]);
  });
});

describe("bandRatio", () => {
  it("uses the post-2017 Scottish proportions for bands E–H", () => {
    expect(bandRatio("scotland", "E")).toEqual({ numerator: 473, denominator: 360 });
    expect(bandRatio("scotland", "H")).toEqual({ numerator: 882, denominator: 360 });
    expect(bandRatio("england", "E")).toEqual({ numerator: 11, denominator: 9 });
  });

  it("rejects a band that does not exist in that nation", () => {
    expect(() => bandRatio("england", "I")).toThrow(RangeError);
  });
});

describe("parseBand", () => {
  it("accepts loose input", () => {
    expect(parseBand("england", " band c ")).toBe("C");
    expect(parseBand("wales", "i")).toBe("I");
  });

  it("returns undefined for bands outside the nation", () => {
    expect(parseBand("england", "I")).toBeUndefined();
    expect(parseBand("england", "Z")).toBeUndefined();
    expect(parseBand("england", "")).toBeUndefined();
  });
});

describe("bandCharge", () => {
  // Hackney 2026-27: council £1,549.79 + GLA £510.51 = £2,060.30 at Band D (MHCLG Table 10).
  const hackneyBandD = 206030;

  it("returns Band D unchanged", () => {
    expect(bandCharge("england", "D", hackneyBandD)).toBe(206030);
  });

  it("matches Hackney's 2026-27 Band C of £1,831.38", () => {
    expect(bandCharge("england", "C", hackneyBandD)).toBe(183138);
  });

  it("charges Band H at twice Band D in England", () => {
    expect(bandCharge("england", "H", hackneyBandD)).toBe(412060);
  });

  it("charges Welsh Band I at 21/9 of Band D", () => {
    // Cardiff 2026-27 average Band D £2,013.18
    expect(bandCharge("wales", "I", 201318)).toBe(469742);
  });

  it("charges Scottish Band E at 473/360 of Band D", () => {
    expect(bandCharge("scotland", "E", 150000)).toBe(197083);
  });
});
