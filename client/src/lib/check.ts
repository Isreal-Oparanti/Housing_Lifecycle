import { poundsToPence, type Household, type Pence } from "@truecost/core";

/** Who will live in the home. "room" is a room let on its own tenancy in a shared house. */
export type Occupancy = "adults" | "single" | "students" | "room";

/** Null for a room in a shared house: the landlord is normally liable for council tax there. */
export const HOUSEHOLDS: Record<Occupancy, Household | null> = {
  adults: { adults: 2, fullTimeStudents: 0 },
  single: { adults: 1, fullTimeStudents: 0 },
  students: { adults: 1, fullTimeStudents: 1 },
  room: null,
};

const OCCUPANCIES = Object.keys(HOUSEHOLDS) as Occupancy[];

export function isOccupancy(value: unknown): value is Occupancy {
  return typeof value === "string" && (OCCUPANCIES as string[]).includes(value);
}

export const OCCUPANCY_LABELS: Record<Occupancy, string> = {
  adults: "Two or more adults",
  single: "Just me",
  students: "All full-time students",
  room: "Room in a shared house",
};

const SAVED_ID = /^[a-z0-9-]{8,40}$/i;

/** Everything on the results page lives in the URL, so a check can be refreshed, bookmarked or shared. */
export interface CheckParams {
  q: string;
  rent: string;
  band: string;
  who: Occupancy;
  /** The council the renter picked when an outward code covers several. */
  authority: string;
  /** Set when this check is a saved home, so edits are saved to it. */
  saved: string;
}

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export function readCheckParams(search: SearchParams): CheckParams {
  const who = first(search.who) as Occupancy;
  return {
    q: first(search.q).slice(0, 200),
    rent: first(search.rent).slice(0, 12),
    band: first(search.band).toUpperCase().slice(0, 1),
    who: OCCUPANCIES.includes(who) ? who : "adults",
    authority: first(search.authority).slice(0, 12),
    saved: SAVED_ID.test(first(search.saved)) ? first(search.saved) : "",
  };
}

export function checkHref(params: Partial<CheckParams> & { q: string }): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && !(key === "who" && value === "adults")) search.set(key, value);
  }
  return `/check?${search}`;
}

/** "2026-27" → "2026/27", the way councils and bills write it. */
export function displayTaxYear(taxYear: string): string {
  return taxYear.replace("-", "/");
}

/** "1,500", "£1500.50" → pence. Null when empty or not a sensible monthly rent. */
export function parseRent(text: string): Pence | null {
  const cleaned = text.replace(/[£,\s]/g, "");
  if (cleaned === "") return null;
  const pounds = Number(cleaned);
  if (!Number.isFinite(pounds) || pounds <= 0 || pounds > 100000) return null;
  return poundsToPence(pounds);
}
