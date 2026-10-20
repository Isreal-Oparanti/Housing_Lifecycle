/**
 * Response shapes of the TrueCost API, shared so the web app and server can't
 * drift apart.
 */
import type { Nation } from "./bands.ts";
import type { Pence } from "./money.ts";
import type { Sourced } from "./provenance.ts";

export interface AuthoritySummary {
  gssCode: string;
  name: string;
  nation: Nation;
  /** Average Band D across the authority, all precepts included. */
  areaBandD: Pence;
  variesWithinArea: boolean;
}

export interface Place {
  /** What the renter typed. */
  query: string;
  /** Known for postcodes and outward codes, and for streets when the listing gave one. */
  outcode?: string;
  /** Present when a full postcode was given. */
  postcode?: string;
  /** Present when the place was found from a street name. */
  street?: string;
  /**
   * How exactly we know where this is: a full postcode, an outward code, or a
   * named street. Only a postcode pins down the parish.
   */
  precision: "postcode" | "outcode" | "street";
  /** Parish or Welsh community, when the postcode is inside one. */
  parish?: string;
}

/** The short name to show for a place: "E8 3PN", "Navarino Road" or "E8". */
export function placeLabel(place: Place): string {
  return place.postcode ?? place.street ?? place.outcode ?? place.query;
}

export interface CouncilOption {
  authority: AuthoritySummary;
  /** Band D for this place, exact or an average depending on what is known. */
  bandD: Sourced<Pence>;
}

export type LookupResult =
  | ({ status: "resolved"; place: Place } & CouncilOption)
  /** An outward code like "E8" can span several councils; the renter needs the full postcode. */
  | { status: "multiple_councils"; place: Place; options: CouncilOption[]; otherAreas: string[] }
  | { status: "unsupported"; place: Place; message: string }
  | { status: "not_found"; message: string }
  | { status: "invalid"; message: string };

export type LookupResponse = LookupResult & {
  taxYear: string;
  isCurrentYear: boolean;
};
