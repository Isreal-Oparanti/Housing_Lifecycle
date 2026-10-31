import { parseBand, type ComparableHome } from "@truecost/core";
import { councilTaxOutcome, monthlyCouncilTax, type CouncilTaxOutcome } from "@/components/report/model";
import { parseRent } from "./check";
import type { SavedHome } from "./savedHomes";

/** Council tax for a saved home, worked out from its snapshot with the same rules as the results page. */
export function savedHomeCouncilTax(home: SavedHome): CouncilTaxOutcome {
  const { authority, bandD } = home.snapshot;
  const band = parseBand(authority.nation, home.check.band);
  return councilTaxOutcome(authority.nation, bandD.value, band, home.check.who);
}

export function comparableHome(home: SavedHome): ComparableHome {
  return {
    id: home.id,
    rent: parseRent(home.check.rent),
    extras: monthlyCouncilTax(savedHomeCouncilTax(home)),
  };
}
