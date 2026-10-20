/**
 * Who will live in the property. Council tax discounts depend on how many adults
 * "count", and full-time students are disregarded when counting.
 *
 * Other disregarded groups exist (apprentices, carers, people who are severely
 * mentally impaired, some care leavers) and councils run their own means-tested
 * Council Tax Reduction schemes. Neither is modelled yet; the UI should say so
 * rather than imply the figure accounts for them.
 */
export interface Household {
  /** Adults aged 18 or over who will live at the property, including the renter. */
  adults: number;
  /** How many of those adults are full-time students. */
  fullTimeStudents: number;
}

export type CouncilTaxRelief =
  | { kind: "none"; percent: 0 }
  | { kind: "single_person_discount"; percent: 25 }
  | { kind: "student_exemption"; percent: 100 };

export function validateHousehold(household: Household): void {
  const { adults, fullTimeStudents } = household;
  if (!Number.isInteger(adults) || adults < 1) {
    throw new RangeError("A household needs at least one adult");
  }
  if (!Number.isInteger(fullTimeStudents) || fullTimeStudents < 0 || fullTimeStudents > adults) {
    throw new RangeError("Full-time students must be between 0 and the number of adults");
  }
}

/**
 * - Everyone is a full-time student: the property is exempt (England/Wales Class N;
 *   Scotland equivalent).
 * - Exactly one adult counts after disregarding students: 25% single person discount.
 * - Otherwise: full charge.
 */
export function reliefFor(household: Household): CouncilTaxRelief {
  validateHousehold(household);
  const counted = household.adults - household.fullTimeStudents;
  if (counted === 0) return { kind: "student_exemption", percent: 100 };
  if (counted === 1) return { kind: "single_person_discount", percent: 25 };
  return { kind: "none", percent: 0 };
}
