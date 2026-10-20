/**
 * Ordnance Survey Names API: roads and places in Great Britain, free on the OS
 * Data Hub OpenData plan with an API key. We use it to turn "Navarino Road,
 * Hackney" into a council when a listing doesn't show its postcode.
 *
 * Attribution: Contains OS data © Crown copyright and database right.
 *
 * The API cannot filter by council or outward code, only by map box
 * (British National Grid metres) and feature type, so callers search a box
 * around a known point and filter the results themselves.
 */
import { TtlCache } from "./cache.js";

export interface MapBox {
  minEasting: number;
  minNorthing: number;
  maxEasting: number;
  maxNorthing: number;
}

export interface RoadMatch {
  name: string;
  /** The same road in the other language, in Wales ("Queen Street" / "Heol y Frenhines"). */
  altName: string | null;
  outcode: string | null;
  /** District, borough or unitary authority name as OS spells it. */
  council: string | null;
  place: string | null;
  country: string | null;
  /** Where OS places this road section, in grid metres. */
  easting: number | null;
  northing: number | null;
}

export interface Settlement {
  name: string;
  /** English name when OS lists the place under its Welsh one ("Casnewydd" / "Newport"). */
  altName: string | null;
  /** "City", "Town", "Village", "Suburban Area", "Other Settlement" or "Hamlet". */
  type: string;
  country: string | null;
  easting: number;
  northing: number;
}

export interface StreetDirectory {
  /** Roads (and sections of roads) with this name inside the box. */
  roads(name: string, box: MapBox): Promise<RoadMatch[]>;
  /** Towns, villages and suburbs with this name, anywhere in Great Britain. */
  settlements(name: string): Promise<Settlement[]>;
}

export class StreetDirectoryUnavailable extends Error {}

const BASE_URL = "https://api.os.uk/search/names/v1/find";
const TIMEOUT_MS = 8000;
const MAX_RESULTS = 100;

const ROAD_TYPES = ["Named_Road", "Section_Of_Named_Road"];
const SETTLEMENT_TYPES = ["City", "Town", "Village", "Suburban_Area", "Other_Settlement", "Hamlet"];

interface OsEntry {
  NAME1?: string;
  NAME2?: string | null;
  LOCAL_TYPE?: string;
  POSTCODE_DISTRICT?: string | null;
  POPULATED_PLACE?: string | null;
  DISTRICT_BOROUGH?: string | null;
  COUNTY_UNITARY?: string | null;
  COUNTRY?: string | null;
  GEOMETRY_X?: number;
  GEOMETRY_Y?: number;
}

interface OsResponse {
  results?: { GAZETTEER_ENTRY: OsEntry }[];
}

/** OS accepts several values for one field as "FIELD:a FIELD:b" inside a single fq. */
function typeFilter(types: string[]): string {
  return types.map((type) => `LOCAL_TYPE:${type}`).join(" ");
}

export function parseRoads(body: OsResponse): RoadMatch[] {
  return (body.results ?? []).flatMap(({ GAZETTEER_ENTRY: entry }) =>
    entry.NAME1
      ? [
          {
            name: entry.NAME1,
            altName: entry.NAME2 ?? null,
            outcode: entry.POSTCODE_DISTRICT ?? null,
            // Unitary authorities have no district; two-tier areas name the district (the billing authority).
            council: entry.DISTRICT_BOROUGH ?? entry.COUNTY_UNITARY ?? null,
            place: entry.POPULATED_PLACE ?? null,
            country: entry.COUNTRY ?? null,
            easting: typeof entry.GEOMETRY_X === "number" ? entry.GEOMETRY_X : null,
            northing: typeof entry.GEOMETRY_Y === "number" ? entry.GEOMETRY_Y : null,
          },
        ]
      : [],
  );
}

export function parseSettlements(body: OsResponse): Settlement[] {
  return (body.results ?? []).flatMap(({ GAZETTEER_ENTRY: entry }) =>
    entry.NAME1 && typeof entry.GEOMETRY_X === "number" && typeof entry.GEOMETRY_Y === "number"
      ? [
          {
            name: entry.NAME1,
            altName: entry.NAME2 ?? null,
            type: entry.LOCAL_TYPE ?? "",
            country: entry.COUNTRY ?? null,
            easting: entry.GEOMETRY_X,
            northing: entry.GEOMETRY_Y,
          },
        ]
      : [],
  );
}

export function createOsNames(apiKey: string, fetchImpl: typeof fetch = fetch): StreetDirectory {
  const cache = new TtlCache<OsResponse>(24 * 60 * 60 * 1000, 5000);

  async function find(query: string, filters: string[]): Promise<OsResponse> {
    const params = new URLSearchParams({ query, maxresults: String(MAX_RESULTS) });
    for (const filter of filters) params.append("fq", filter);
    // The key stays out of the cache key and out of every error message.
    const cacheKey = params.toString();
    const hit = cache.get(cacheKey);
    if (hit) return hit.value;

    params.set("key", apiKey);
    let response: Response;
    try {
      response = await fetchImpl(`${BASE_URL}?${params}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch {
      throw new StreetDirectoryUnavailable("OS Names unreachable");
    }
    if (!response.ok) throw new StreetDirectoryUnavailable(`OS Names returned ${response.status}`);
    const body = (await response.json()) as OsResponse;
    cache.set(cacheKey, body);
    return body;
  }

  return {
    async roads(name, box) {
      const bbox = `BBOX:${box.minEasting},${box.minNorthing},${box.maxEasting},${box.maxNorthing}`;
      return parseRoads(await find(name, [bbox, typeFilter(ROAD_TYPES)]));
    },
    async settlements(name) {
      return parseSettlements(await find(name, [typeFilter(SETTLEMENT_TYPES)]));
    },
  };
}
