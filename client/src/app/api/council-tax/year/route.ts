import { rateTable } from "@/server/data/rates";

// Which tax year's rates are loaded. Saved homes keep a snapshot of their rates and
// only need looking up again when this changes.
export function GET() {
  const { taxYear, isCurrentYear } = rateTable();
  return Response.json({ taxYear, isCurrentYear });
}
