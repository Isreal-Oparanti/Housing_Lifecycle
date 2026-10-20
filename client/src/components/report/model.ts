import {
  bandsFor,
  calculateCouncilTax,
  type Band,
  type CouncilTaxBreakdown,
  type Nation,
  type Pence,
} from "@truecost/core";
import { HOUSEHOLDS, type Occupancy } from "@/lib/check";

/** What council tax means for this household, before we know everything. */
export type CouncilTaxOutcome =
  | { kind: "charged"; breakdown: CouncilTaxBreakdown }
  /** Every adult is a full-time student. */
  | { kind: "exempt" }
  /** A room on its own tenancy in a shared house: the landlord is normally liable. */
  | { kind: "landlord" }
  | { kind: "needs_band"; min: Pence; max: Pence };

const STANDARD_HOUSEHOLD = { adults: 2, fullTimeStudents: 0 };

/** Monthly cost of each band for this household (or the full charge when the household doesn't pay). */
export function monthlyByBand(nation: Nation, bandD: Pence, who: Occupancy): Record<string, Pence> {
  const household = who === "single" ? HOUSEHOLDS.single! : STANDARD_HOUSEHOLD;
  return Object.fromEntries(
    bandsFor(nation).map((band) => [band, calculateCouncilTax({ nation, band, bandD, household }).monthlyAverage]),
  );
}

export function councilTaxOutcome(nation: Nation, bandD: Pence, band: Band | undefined, who: Occupancy): CouncilTaxOutcome {
  const household = HOUSEHOLDS[who];
  if (!household) return { kind: "landlord" };
  if (household.adults === household.fullTimeStudents) return { kind: "exempt" };
  if (!band) {
    const costs = Object.values(monthlyByBand(nation, bandD, who));
    return { kind: "needs_band", min: Math.min(...costs), max: Math.max(...costs) };
  }
  return { kind: "charged", breakdown: calculateCouncilTax({ nation, band, bandD, household }) };
}

/** Null until the band is known. */
export function monthlyCouncilTax(outcome: CouncilTaxOutcome): Pence | null {
  switch (outcome.kind) {
    case "charged":
      return outcome.breakdown.monthlyAverage;
    case "exempt":
    case "landlord":
      return 0;
    case "needs_band":
      return null;
  }
}
