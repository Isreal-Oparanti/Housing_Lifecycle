import { describe, expect, it } from "vitest";
import { formatGBP, formatGBPWhole, poundsToPence } from "./money.ts";

describe("poundsToPence", () => {
  it("absorbs floating-point drift", () => {
    expect(poundsToPence(1549.79)).toBe(154979);
    expect(poundsToPence(2260.7300022224313)).toBe(226073);
  });

  it("rejects non-finite input", () => {
    expect(() => poundsToPence(Number.NaN)).toThrow(RangeError);
  });
});

describe("formatGBP", () => {
  it("formats pence as pounds", () => {
    expect(formatGBP(183138)).toBe("£1,831.38");
    expect(formatGBPWhole(183150)).toBe("£1,832");
  });
});
