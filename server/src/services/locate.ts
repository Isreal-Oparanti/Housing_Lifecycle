import {
  gridToLatLon,
  normaliseStreetName,
  parseAddress,
  type AuthorityRate,
  type CouncilOption,
  type LookupResult,
  type Place,
} from "@truecost/core";
import { PostcodeDirectoryUnavailable, type PostcodeDirectory } from "../adapters/postcodesIo.js";
import { StreetDirectoryUnavailable, type MapBox, type RoadMatch, type StreetDirectory } from "../adapters/osNames.js";
import { findAuthority, findAuthorityByName } from "../data/rates/index.js";
import { authoritySummary, bandDFigure } from "./figures.js";

const SUPPORTED_COUNTRIES = new Set(["England", "Wales"]);

/** Half-width of the map box searched around an outward code's centre, in metres. */
const OUTCODE_RADIUS = 6000;
/**
 * Around a town, look for the road close in first, then wider. Big towns have
 * the same street names in neighbouring councils ("Queens Road" in Bristol and
 * in Bath), and the nearest match is the one the renter means.
 */
const TOWN_RADII = [2500, 5000, 7000];
const TOWN_SEARCH_BOX = TOWN_RADII[TOWN_RADII.length - 1];

/**
 * How close a postcode must be to a road to count as "next to it". Close enough
 * to catch both sides of a boundary road, far enough not to flag a street that
 * is merely near a boundary.
 */
const BOUNDARY_RADIUS = 75;
/** Road sections checked for boundary neighbours; keeps a lookup to a handful of requests. */
const MAX_BOUNDARY_POINTS = 6;

/** Bigger places first: "Oxford" the city, not the hamlets that share its name. */
const SETTLEMENT_RANK: Record<string, number> = {
  city: 0,
  town: 1,
  "suburban area": 2,
  village: 3,
  "other settlement": 3,
  hamlet: 4,
};

function unsupportedMessage(country: string): string {
  if (country === "Scotland") return "TrueCost covers England and Wales so far. Scotland is coming next.";
  if (country === "Northern Ireland") return "Northern Ireland has domestic rates instead of council tax, which TrueCost doesn't cover yet.";
  return "TrueCost covers England and Wales so far.";
}

function boxAround(easting: number, northing: number, radius: number): MapBox {
  return {
    minEasting: Math.round(easting - radius),
    maxEasting: Math.round(easting + radius),
    minNorthing: Math.round(northing - radius),
    maxNorthing: Math.round(northing + radius),
  };
}

function option(authority: AuthorityRate): CouncilOption {
  return { authority: authoritySummary(authority), bandD: bandDFigure(authority) };
}

interface StreetCouncils {
  options: CouncilOption[];
  /** Councils the road is in that we have no rates for, e.g. in Scotland. */
  otherAreas: string[];
  /** How OS spells the road. */
  streetName: string;
  outcodes: string[];
  /** Where OS places the matching road sections, in grid metres. */
  points: { easting: number; northing: number }[];
}

/** True when either the road's own name or its other-language name is the one asked for. */
function hasName(named: { name: string; altName: string | null }, wanted: string): boolean {
  return normaliseStreetName(named.name) === wanted || (named.altName !== null && normaliseStreetName(named.altName) === wanted);
}

/** The name the renter used, in OS's spelling, so Welsh roads show the name from the listing. */
function nameMatching(named: { name: string; altName: string | null }, wanted: string): string {
  return normaliseStreetName(named.name) === wanted || !named.altName ? named.name : named.altName;
}

/** The councils a road passes through, from the OS road sections that matched. */
function councilsOf(roads: RoadMatch[], street: string, keep: (road: RoadMatch) => boolean): StreetCouncils | null {
  const wanted = normaliseStreetName(street);
  const matches = roads.filter((road) => hasName(road, wanted) && keep(road));
  if (matches.length === 0) return null;

  const byCode = new Map<string, CouncilOption>();
  const otherAreas = new Set<string>();
  for (const road of matches) {
    const authority = road.council ? findAuthorityByName(road.council) : undefined;
    if (authority) byCode.set(authority.gssCode, option(authority));
    // A road in England or Wales with no recognisable district (OS sometimes gives only the
    // county) tells us nothing useful, so it is ignored rather than shown as a council we lack.
    else if (road.country && !SUPPORTED_COUNTRIES.has(road.country)) otherAreas.add(road.country);
  }
  if (byCode.size === 0 && otherAreas.size === 0) return null;
  return {
    options: [...byCode.values()],
    otherAreas: [...otherAreas],
    streetName: nameMatching(matches[0], wanted),
    outcodes: [...new Set(matches.flatMap((road) => (road.outcode ? [road.outcode] : [])))],
    points: matches.flatMap((road) =>
      road.easting !== null && road.northing !== null ? [{ easting: road.easting, northing: road.northing }] : [],
    ),
  };
}

export function createLocator(directory: PostcodeDirectory, streets?: StreetDirectory) {
  /**
   * OS gives a road to one council, but a road that marks a boundary has homes in
   * both ("Cleveland Street": Westminster on one side, Camden on the other). So
   * look at the postcodes right next to the road: if they belong to more
   * councils than OS named, the renter has to say which side they're on.
   */
  async function withBoundaryNeighbours(found: StreetCouncils): Promise<StreetCouncils> {
    const byCode = new Map(found.options.map((o) => [o.authority.gssCode, o]));
    const otherAreas = new Set(found.otherAreas);
    try {
      const nearby = await Promise.all(
        found.points.slice(0, MAX_BOUNDARY_POINTS).map(({ easting, northing }) => {
          const { lat, lon } = gridToLatLon(easting, northing);
          return directory.near(lat, lon, BOUNDARY_RADIUS);
        }),
      );
      for (const postcode of nearby.flat()) {
        const authority = findAuthority(postcode.adminDistrictCode);
        if (authority) byCode.set(authority.gssCode, option(authority));
        else if (!SUPPORTED_COUNTRIES.has(postcode.country)) otherAreas.add(postcode.country);
      }
    } catch (error) {
      // An upgrade, not a requirement: keep what OS told us if postcodes.io is unavailable.
      if (!(error instanceof PostcodeDirectoryUnavailable)) throw error;
      console.error(error.message);
    }
    return { ...found, options: [...byCode.values()], otherAreas: [...otherAreas] };
  }

  /** Turns the councils found for a street into a result the renter can act on. */
  async function fromStreet(rawFound: StreetCouncils, place: Place, chosenAuthority?: string): Promise<LookupResult> {
    const found = await withBoundaryNeighbours(rawFound);
    const streetPlace: Place = {
      ...place,
      precision: "street",
      street: found.streetName,
      outcode: found.outcodes.length === 1 ? found.outcodes[0] : place.outcode,
    };

    if (found.options.length === 0) {
      return { status: "unsupported", place: streetPlace, message: unsupportedMessage(found.otherAreas[0] ?? "") };
    }
    const chosen = chosenAuthority && found.options.find((o) => o.authority.gssCode === chosenAuthority);
    if (chosen) return { status: "resolved", place: streetPlace, ...chosen };
    if (found.options.length === 1 && found.otherAreas.length === 0) {
      return { status: "resolved", place: streetPlace, ...found.options[0] };
    }
    return { status: "multiple_councils", place: streetPlace, options: found.options, otherAreas: found.otherAreas };
  }

  /** "Navarino Road, Hackney": find each hint on the map, then look for the road nearby. */
  async function streetFromHints(street: string, hints: string[]): Promise<{ found: StreetCouncils | null; countries: string[] }> {
    const countries = new Set<string>();
    if (!streets) return { found: null, countries: [] };
    for (const hint of hints) {
      const wanted = normaliseStreetName(hint);
      const named = (await streets.settlements(hint)).filter((settlement) => hasName(settlement, wanted));
      const bestRank = Math.min(...named.map((settlement) => SETTLEMENT_RANK[settlement.type.toLowerCase()] ?? 5));
      // Several towns can share a name ("Newport"); keep them all, but only the biggest kind.
      const places = named.filter((settlement) => (SETTLEMENT_RANK[settlement.type.toLowerCase()] ?? 5) === bestRank).slice(0, 3);
      for (const place of places) if (place.country) countries.add(place.country);

      const roadsByPlace = await Promise.all(
        places.map(async (place) => ({ place, roads: await streets.roads(street, boxAround(place.easting, place.northing, TOWN_SEARCH_BOX)) })),
      );
      for (const radius of TOWN_RADII) {
        const near = roadsByPlace.flatMap(({ place, roads }) =>
          roads.filter(
            (road) =>
              road.easting !== null &&
              road.northing !== null &&
              Math.hypot(road.easting - place.easting, road.northing - place.northing) <= radius,
          ),
        );
        // The first hint that leads to the road wins: listings put the most specific area first.
        const found = councilsOf(near, street, () => true);
        if (found) return { found, countries: [...countries] };
      }
    }
    return { found: null, countries: [...countries] };
  }

  return async function locate(query: string, chosenAuthority?: string): Promise<LookupResult> {
    const parsed = parseAddress(query);

    if (parsed.kind === "invalid") {
      return {
        status: "invalid",
        message: streets
          ? "Enter a postcode, like E8 3PN, or the listing's address with its town, like “Navarino Road, Hackney”."
          : "Enter a postcode, like E8 3PN, or the end of the listing's address, like “Mare Street, E8”.",
      };
    }

    if (parsed.kind === "street") {
      if (!streets) {
        return { status: "invalid", message: "Street search isn't switched on yet. Enter a postcode, like E8 3PN." };
      }
      const { found, countries } = await streetFromHints(parsed.street, parsed.hints);
      if (!found) {
        const outside = countries.filter((country) => !SUPPORTED_COUNTRIES.has(country));
        if (countries.length > 0 && outside.length === countries.length) {
          return { status: "unsupported", place: { query, precision: "street" }, message: unsupportedMessage(outside[0]) };
        }
        return {
          status: "not_found",
          message: `We couldn't find ${parsed.street} near ${parsed.hints[0]}. Check the spelling, or use the postcode.`,
        };
      }
      return await fromStreet(found, { query, precision: "street" }, chosenAuthority);
    }

    if (parsed.kind === "postcode") {
      const record = await directory.postcode(parsed.postcode);
      if (!record) {
        return { status: "not_found", message: `We couldn't find ${parsed.postcode}. Check it, or try just the first part (${parsed.outcode}).` };
      }
      const place: Place = { query, outcode: parsed.outcode, postcode: record.postcode, precision: "postcode" };
      if (!SUPPORTED_COUNTRIES.has(record.country)) {
        return { status: "unsupported", place, message: unsupportedMessage(record.country) };
      }
      const authority = findAuthority(record.adminDistrictCode);
      if (!authority) {
        return { status: "not_found", message: `We don't have council tax rates for ${record.adminDistrict} yet.` };
      }
      const knownUnparished = record.parish?.endsWith("unparished area") ?? false;
      if (record.parish && !knownUnparished) place.parish = record.parish;
      return { status: "resolved", place, authority: authoritySummary(authority), bandD: bandDFigure(authority, knownUnparished) };
    }

    const record = await directory.outcode(parsed.outcode);
    if (!record) {
      return { status: "not_found", message: `We couldn't find the postcode area ${parsed.outcode}. Try the full postcode.` };
    }
    const place: Place = { query, outcode: record.outcode, precision: "outcode" };
    if (!record.countries.some((country) => SUPPORTED_COUNTRIES.has(country))) {
      return { status: "unsupported", place, message: unsupportedMessage(record.countries[0] ?? "") };
    }

    // A street name narrows an outward code that spans several councils down to the ones the road is in.
    if (parsed.street && streets && record.easting !== null && record.northing !== null) {
      try {
        const roads = await streets.roads(parsed.street, boxAround(record.easting, record.northing, OUTCODE_RADIUS));
        const found = councilsOf(roads, parsed.street, (road) => road.outcode?.toUpperCase() === record.outcode.toUpperCase());
        if (found) return await fromStreet(found, place, chosenAuthority);
      } catch (error) {
        // Street search is an upgrade, not a requirement: fall back to listing every council in the outward code.
        if (!(error instanceof StreetDirectoryUnavailable)) throw error;
        console.error(error.message);
      }
    }

    const options: CouncilOption[] = [];
    const otherAreas: string[] = [];
    for (const name of record.adminDistricts) {
      const authority = findAuthorityByName(name);
      if (authority) options.push(option(authority));
      else otherAreas.push(name);
    }

    const chosen = chosenAuthority && options.find((o) => o.authority.gssCode === chosenAuthority);
    if (chosen) return { status: "resolved", place, ...chosen };
    if (options.length === 1 && otherAreas.length === 0) return { status: "resolved", place, ...options[0] };
    if (options.length === 0) {
      return { status: "not_found", message: `We couldn't match ${parsed.outcode} to a council. Try the full postcode.` };
    }
    return { status: "multiple_councils", place, options, otherAreas };
  };
}
