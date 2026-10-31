import { formatGBP } from "@truecost/core";
import type { CouncilTaxOutcome } from "@/components/report/model";

/** How a saved home's council tax reads in the list and the comparison. */
export function councilTaxText(outcome: CouncilTaxOutcome): { value: string; note: string } {
  switch (outcome.kind) {
    case "charged":
      return {
        value: formatGBP(outcome.breakdown.monthlyAverage),
        note: `Band ${outcome.breakdown.band}${outcome.breakdown.relief.kind === "single_person_discount" ? ", 25% off" : ""}`,
      };
    case "exempt":
      return { value: formatGBP(0), note: "Students exempt" };
    case "landlord":
      return { value: "Not included", note: "Usually the landlord's" };
    case "needs_band":
      return { value: "Band needed", note: `${formatGBP(outcome.min)}–${formatGBP(outcome.max)}` };
  }
}
