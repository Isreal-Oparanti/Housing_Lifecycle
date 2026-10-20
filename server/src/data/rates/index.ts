import { taxYearFor, type AuthorityRate, type TaxYear } from "@truecost/core";
import rates2026To27 from "./2026-27.json" with { type: "json" };

interface RatesFile {
  taxYear: TaxYear;
  authorities: AuthorityRate[];
}

// When a new year is imported, switch this to the new file. Keep old files for history.
const latest = rates2026To27 as RatesFile;
const byCode = new Map(latest.authorities.map((authority) => [authority.gssCode, authority]));

export interface RateTable {
  taxYear: TaxYear;
  /**
   * False once a new tax year has started and its rates have not been imported.
   * The API passes this through so the UI can warn instead of quietly showing
   * last year's bill (what happened with the old hard-coded 2024/25 data).
   */
  isCurrentYear: boolean;
  authorities: AuthorityRate[];
}

export function rateTable(now = new Date()): RateTable {
  return {
    taxYear: latest.taxYear,
    isCurrentYear: latest.taxYear === taxYearFor(now),
    authorities: latest.authorities,
  };
}

export function findAuthority(gssCode: string): AuthorityRate | undefined {
  return byCode.get(gssCode.trim().toUpperCase());
}

/**
 * ONS (postcodes.io), OS and MHCLG spell some councils differently:
 * "Bristol, City of" / "City of Bristol" / "Bristol", "County Durham" / "Durham",
 * "St. Helens" / "St Helens", "King's Lynn" / "Kings Lynn".
 */
export function normaliseAuthorityName(name: string): string {
  return name
    .toLowerCase()
    .replace(/,\s*(city|county) of$/, "")
    .replace(/^county\s+/, "")
    .replace(/&/g, " and ")
    .replace(/['’.]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const byName = new Map(latest.authorities.map((authority) => [normaliseAuthorityName(authority.name), authority]));

/** Variants of a name worth trying, most literal first. OS writes Welsh councils as "Caerdydd - Cardiff". */
function nameCandidates(name: string): string[] {
  const withoutThe = (text: string) => text.replace(/^the\s+/i, "");
  const withoutOf = (text: string) => text.replace(/^(?:city|county|borough|royal borough) of\s+/i, "");
  const candidates: string[] = [];
  for (const part of [name, ...name.split(/\s+-\s+/)]) {
    candidates.push(
      normaliseAuthorityName(part),
      normaliseAuthorityName(withoutThe(part)),
      // OS: "City and County of the City of London"
      normaliseAuthorityName(part.replace(/^city and county of the\s+/i, "")),
      normaliseAuthorityName(withoutOf(withoutThe(part))),
    );
  }
  return candidates;
}

export function findAuthorityByName(name: string): AuthorityRate | undefined {
  for (const candidate of nameCandidates(name)) {
    const authority = byName.get(candidate);
    if (authority) return authority;
  }
  return undefined;
}
