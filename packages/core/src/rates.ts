import type { Nation } from "./bands.ts";
import type { Pence } from "./money.ts";
import type { Source } from "./provenance.ts";

/** "2026-27": the council tax year runs 1 April to 31 March. */
export type TaxYear = `${number}-${number}`;

/** The council tax year that `date` falls in. */
export function taxYearFor(date: Date): TaxYear {
  const year = date.getUTCFullYear();
  const start = date.getUTCMonth() >= 3 ? year : year - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}` as TaxYear;
}

/**
 * One billing authority's council tax for a tax year. All amounts are annual
 * Band D charges for two adults, before discounts.
 */
export interface AuthorityRate {
  /** ONS GSS code, e.g. E09000012. The key postcodes.io returns as codes.admin_district. */
  gssCode: string;
  name: string;
  nation: Nation;
  taxYear: TaxYear;
  /**
   * Average Band D across the authority with every precept included: the
   * council, parish or community councils, county or GLA, police, fire and
   * combined authority.
   */
  areaBandD: Pence;
  components: {
    billingAuthority: Pence;
    /** Average across the area. The actual parish or community precept depends on where the property is. */
    localPrecepts: Pence;
    countyOrGla: Pence;
    police: Pence;
    fire: Pence;
    combinedAuthority: Pence;
  };
  /**
   * True when the Band D charge differs across the authority because of parish
   * or community council precepts or special expenses. Then areaBandD is an
   * average and the exact charge depends on the parish.
   */
  variesWithinArea: boolean;
  /** Charges "special expenses" in part of its area, so even unparished addresses can differ. */
  hasSpecialExpenses: boolean;
  source: Source;
}

/**
 * The Band D charge for a place inside an authority, and whether it is exact.
 *
 * The published figure is an average over the whole authority. It is exact when
 * nothing varies within the area, or when the address is known to sit outside
 * any parish (postcodes.io reports "<Council>, unparished area") and the
 * council charges no special expenses: then it is every component except the
 * averaged parish precepts.
 */
export function bandDForPlace(
  authority: AuthorityRate,
  place: { knownUnparished: boolean },
): { bandD: Pence; exact: boolean } {
  if (!authority.variesWithinArea) {
    return { bandD: authority.areaBandD, exact: true };
  }
  if (place.knownUnparished && !authority.hasSpecialExpenses) {
    const c = authority.components;
    return { bandD: c.billingAuthority + c.countyOrGla + c.police + c.fire + c.combinedAuthority, exact: true };
  }
  return { bandD: authority.areaBandD, exact: false };
}
