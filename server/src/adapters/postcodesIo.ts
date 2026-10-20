/**
 * postcodes.io: a free, open API over the ONS Postcode Directory.
 *
 * Attribution required by the underlying data (shown in the web app footer):
 * Contains OS data © Crown copyright and database right. Contains Royal Mail
 * data © Royal Mail copyright and database right. Source: Office for National
 * Statistics, licensed under the Open Government Licence v3.0.
 */
import { TtlCache } from "./cache.js";

export interface PostcodeRecord {
  postcode: string;
  country: string;
  adminDistrict: string;
  /** ONS GSS code of the billing authority, e.g. E09000012. */
  adminDistrictCode: string;
  /** Civil parish, Welsh community, or "<Council>, unparished area". */
  parish: string | null;
}

export interface OutcodeRecord {
  outcode: string;
  countries: string[];
  /** Council names only: postcodes.io does not return codes for outcodes. */
  adminDistricts: string[];
  /** British National Grid position of the middle of the outward code area, in metres. */
  easting: number | null;
  northing: number | null;
}

export interface NearbyPostcode {
  postcode: string;
  country: string;
  /** ONS GSS code of the billing authority. */
  adminDistrictCode: string;
}

/** Narrow interface so the location service can be tested without the network. */
export interface PostcodeDirectory {
  /** Postcodes within `radiusMetres` of a point, nearest first. Empty when there are none. */
  near(lat: number, lon: number, radiusMetres: number): Promise<NearbyPostcode[]>;
  /** Resolves to null when the postcode does not exist or is no longer in use. */
  postcode(postcode: string): Promise<PostcodeRecord | null>;
  outcode(outcode: string): Promise<OutcodeRecord | null>;
}

export class PostcodeDirectoryUnavailable extends Error {}

const BASE_URL = process.env.POSTCODES_IO_URL ?? "https://api.postcodes.io";
const TIMEOUT_MS = 5000;

interface PostcodesIoPostcode {
  postcode: string;
  country: string;
  admin_district: string;
  parish: string | null;
  codes: { admin_district: string };
}

interface PostcodesIoNearby {
  postcode: string;
  country: string;
  codes: { admin_district: string };
}

interface PostcodesIoOutcode {
  outcode: string;
  country: string[];
  admin_district: string[];
  eastings?: number | null;
  northings?: number | null;
}

export function createPostcodesIo(fetchImpl: typeof fetch = fetch): PostcodeDirectory {
  // Postcode data changes quarterly at most; caching spares the public API repeat lookups.
  const cache = new TtlCache<unknown>(24 * 60 * 60 * 1000, 5000);

  async function get<T>(path: string): Promise<T | null> {
    const hit = cache.get(path);
    if (hit) return hit.value as T | null;

    let response: Response;
    try {
      response = await fetchImpl(`${BASE_URL}${path}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch (error) {
      throw new PostcodeDirectoryUnavailable(`postcodes.io unreachable: ${String(error)}`);
    }
    if (response.status === 404) {
      cache.set(path, null);
      return null;
    }
    if (!response.ok) {
      throw new PostcodeDirectoryUnavailable(`postcodes.io returned ${response.status}`);
    }
    const body = (await response.json()) as { result: T };
    cache.set(path, body.result);
    return body.result;
  }

  return {
    async near(lat, lon, radiusMetres) {
      // About 1 metre of precision is plenty and lets nearby lookups share a cache entry.
      const result = await get<PostcodesIoNearby[]>(
        `/postcodes?lon=${lon.toFixed(5)}&lat=${lat.toFixed(5)}&radius=${radiusMetres}&limit=50`,
      );
      return (result ?? []).map((r) => ({
        postcode: r.postcode,
        country: r.country,
        adminDistrictCode: r.codes.admin_district,
      }));
    },
    async postcode(postcode) {
      const result = await get<PostcodesIoPostcode>(`/postcodes/${encodeURIComponent(postcode)}`);
      if (!result) return null;
      return {
        postcode: result.postcode,
        country: result.country,
        adminDistrict: result.admin_district,
        adminDistrictCode: result.codes.admin_district,
        parish: result.parish,
      };
    },
    async outcode(outcode) {
      const result = await get<PostcodesIoOutcode>(`/outcodes/${encodeURIComponent(outcode)}`);
      if (!result) return null;
      return {
        outcode: result.outcode,
        countries: result.country,
        adminDistricts: result.admin_district,
        easting: result.eastings ?? null,
        northing: result.northings ?? null,
      };
    },
  };
}
