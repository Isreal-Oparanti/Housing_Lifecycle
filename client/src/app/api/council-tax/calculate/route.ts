import {
  bandsFor,
  calculateCouncilTax,
  parseBand,
  validateHousehold,
  type Band,
  type Household,
  type Sourced,
} from "@truecost/core";
import { findAuthority, rateTable } from "@/server/data/rates";
import { authoritySummary, bandDFigure } from "@/server/services/figures";

// GET /api/council-tax/calculate?authority=E09000012&band=C&adults=1&students=0
export function GET(request: Request) {
  const query = new URL(request.url).searchParams;

  const authority = findAuthority(query.get("authority") ?? "");
  if (!authority) {
    return Response.json({ error: "Unknown billing authority. Pass its GSS code, e.g. authority=E09000012" }, { status: 404 });
  }

  const band = parseBand(authority.nation, query.get("band") ?? "");
  if (!band) {
    return Response.json({ error: `Band must be one of ${bandsFor(authority.nation).join(", ")}` }, { status: 400 });
  }

  const household: Household = {
    adults: Number(query.get("adults") ?? 2),
    fullTimeStudents: Number(query.get("students") ?? 0),
  };
  try {
    validateHousehold(household);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid household" }, { status: 400 });
  }

  const { taxYear, isCurrentYear } = rateTable();
  const bandFigure: Sourced<Band> = { value: band, confidence: "user_provided" };
  return Response.json({
    taxYear,
    isCurrentYear,
    authority: authoritySummary(authority),
    band: bandFigure,
    bandD: bandDFigure(authority),
    household,
    breakdown: calculateCouncilTax({ nation: authority.nation, band, bandD: authority.areaBandD, household }),
  });
}
