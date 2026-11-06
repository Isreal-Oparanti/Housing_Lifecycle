import { bandCharge, bandsFor } from "@truecost/core";
import { findAuthority, rateTable } from "@/server/data/rates";
import { bandDFigure } from "@/server/services/figures";

export async function GET(_request: Request, { params }: { params: Promise<{ gssCode: string }> }) {
  const { gssCode } = await params;
  const authority = findAuthority(gssCode);
  if (!authority) {
    return Response.json({ error: `No billing authority with code ${gssCode}` }, { status: 404 });
  }
  const { taxYear, isCurrentYear } = rateTable();
  return Response.json({
    taxYear,
    isCurrentYear,
    authority,
    bandD: bandDFigure(authority),
    bands: bandsFor(authority.nation).map((band) => ({
      band,
      annual: bandCharge(authority.nation, band, authority.areaBandD),
    })),
  });
}
