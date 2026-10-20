import { describe, expect, it } from "vitest";
import { reliefFor } from "./household.ts";

describe("reliefFor", () => {
  it.each([
    { adults: 1, fullTimeStudents: 0, kind: "single_person_discount" },
    { adults: 2, fullTimeStudents: 0, kind: "none" },
    { adults: 4, fullTimeStudents: 0, kind: "none" },
    { adults: 1, fullTimeStudents: 1, kind: "student_exemption" },
    { adults: 3, fullTimeStudents: 3, kind: "student_exemption" },
    // The student is disregarded, leaving one counted adult.
    { adults: 2, fullTimeStudents: 1, kind: "single_person_discount" },
    { adults: 3, fullTimeStudents: 1, kind: "none" },
  ])("$adults adults with $fullTimeStudents students → $kind", ({ adults, fullTimeStudents, kind }) => {
    expect(reliefFor({ adults, fullTimeStudents }).kind).toBe(kind);
  });

  it.each([
    { adults: 0, fullTimeStudents: 0 },
    { adults: 2, fullTimeStudents: 3 },
    { adults: 1.5, fullTimeStudents: 0 },
    { adults: 2, fullTimeStudents: -1 },
  ])("rejects an impossible household %o", (household) => {
    expect(() => reliefFor(household)).toThrow(RangeError);
  });
});
