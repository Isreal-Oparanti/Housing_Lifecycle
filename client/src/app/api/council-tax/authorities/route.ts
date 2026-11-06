import { rateTable } from "@/server/data/rates";
import { authoritySummary } from "@/server/services/figures";

export function GET() {
  const { taxYear, isCurrentYear, authorities } = rateTable();
  return Response.json({
    taxYear,
    isCurrentYear,
    count: authorities.length,
    authorities: authorities.map(authoritySummary).sort((a, b) => a.name.localeCompare(b.name)),
  });
}
