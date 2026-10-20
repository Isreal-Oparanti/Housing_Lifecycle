import { bandDForPlace, type AuthorityRate, type AuthoritySummary, type Pence, type Sourced } from "@truecost/core";

export function authoritySummary(authority: AuthorityRate): AuthoritySummary {
  return {
    gssCode: authority.gssCode,
    name: authority.name,
    nation: authority.nation,
    areaBandD: authority.areaBandD,
    variesWithinArea: authority.variesWithinArea,
  };
}

/**
 * The Band D charge for a place, with its provenance. Where parish or community
 * precepts make the charge vary and we can't pin the address down, the figure
 * is the published average, labelled as an estimate rather than presented as
 * the bill.
 */
export function bandDFigure(authority: AuthorityRate, knownUnparished = false): Sourced<Pence> {
  const { bandD, exact } = bandDForPlace(authority, { knownUnparished });
  if (exact) {
    return {
      value: bandD,
      confidence: "official",
      source: authority.source,
      note:
        authority.variesWithinArea && knownUnparished
          ? `This postcode isn't in a parish, so no parish council charge is added.`
          : undefined,
    };
  }
  const local = authority.nation === "wales" ? "community council" : "parish or town council";
  return {
    value: bandD,
    confidence: "estimated",
    source: authority.source,
    note: `Average for ${authority.name}. The exact charge depends on the ${local} the home is in.`,
  };
}
