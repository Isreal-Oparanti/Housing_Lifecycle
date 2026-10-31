import { useSyncExternalStore } from "react";
import type { AuthoritySummary, Pence, Place, Sourced } from "@truecost/core";
import { isOccupancy, type CheckParams } from "./check";

/**
 * Homes the renter has saved, kept in this browser only (no account, nothing
 * sent to our servers). Each home stores what the renter entered plus a
 * snapshot of the council and its Band D, so the "Your homes" page can show
 * every home instantly. The snapshot is refreshed when a new tax year's rates
 * are loaded.
 */
export interface SavedHome {
  id: string;
  name: string;
  /** Optional link to the listing, for the renter's reference. Never fetched. */
  listingUrl: string;
  check: Pick<CheckParams, "q" | "rent" | "band" | "who" | "authority">;
  snapshot: {
    place: Place;
    authority: AuthoritySummary;
    bandD: Sourced<Pence>;
    taxYear: string;
  };
  savedAt: string;
  updatedAt: string;
}

export const MAX_SAVED_HOMES = 20;
const STORAGE_KEY = "truecost.savedHomes.v1";

// ---------- pure helpers (tested) ----------

/** Keeps only http(s) links, so a saved "listing link" can never run script. */
export function cleanListingUrl(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

const isString = (value: unknown): value is string => typeof value === "string";
const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

/** Reads whatever is in storage defensively: anything malformed is dropped, not trusted. */
export function parseSavedHomes(raw: unknown): SavedHome[] {
  if (!Array.isArray(raw)) return [];
  const homes: SavedHome[] = [];
  for (const item of raw) {
    if (!isObject(item) || !isObject(item.check) || !isObject(item.snapshot)) continue;
    const { check, snapshot } = item;
    const authority = snapshot.authority;
    const bandD = snapshot.bandD;
    const place = snapshot.place;
    if (
      !isString(item.id) ||
      !isString(item.name) ||
      !isString(check.q) ||
      !isString(check.rent) ||
      !isString(check.band) ||
      !isOccupancy(check.who) ||
      !isString(check.authority) ||
      !isObject(authority) ||
      !isString(authority.gssCode) ||
      !isString(authority.name) ||
      !["england", "wales", "scotland"].includes(authority.nation as string) ||
      !isObject(bandD) ||
      !Number.isInteger(bandD.value) ||
      !isObject(place) ||
      !isString(place.precision) ||
      !isString(snapshot.taxYear)
    ) {
      continue;
    }
    homes.push({
      id: item.id,
      name: item.name.slice(0, 80),
      listingUrl: isString(item.listingUrl) ? cleanListingUrl(item.listingUrl) : "",
      check: { q: check.q, rent: check.rent, band: check.band, who: check.who, authority: check.authority },
      snapshot: snapshot as SavedHome["snapshot"],
      savedAt: isString(item.savedAt) ? item.savedAt : "",
      updatedAt: isString(item.updatedAt) ? item.updatedAt : "",
    });
  }
  return homes.slice(0, MAX_SAVED_HOMES);
}

export function withHomeAdded(homes: SavedHome[], home: SavedHome): SavedHome[] {
  if (homes.length >= MAX_SAVED_HOMES) {
    throw new RangeError(`You can save up to ${MAX_SAVED_HOMES} homes. Remove one to save another.`);
  }
  return [...homes, home];
}

export function withHomeUpdated(
  homes: SavedHome[],
  id: string,
  patch: Partial<Pick<SavedHome, "name" | "listingUrl" | "check" | "snapshot">>,
  now = new Date(),
): SavedHome[] {
  return homes.map((home) => (home.id === id ? { ...home, ...patch, updatedAt: now.toISOString() } : home));
}

export function withoutHome(homes: SavedHome[], id: string): SavedHome[] {
  return homes.filter((home) => home.id !== id);
}

/** A sensible default name: "Navarino Road, E8", "E8 3PN" or "E8, Hackney". */
export function defaultHomeName(place: Place, authority: AuthoritySummary): string {
  if (place.postcode) return place.postcode;
  if (place.street) return place.outcode ? `${place.street}, ${place.outcode}` : place.street;
  return place.outcode ? `${place.outcode}, ${authority.name}` : authority.name;
}

export function newHomeId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// ---------- browser storage ----------

const EMPTY: SavedHome[] = [];
const CHANGE_EVENT = "truecost:saved-homes";
let cached: SavedHome[] | null = null;

function readStorage(): SavedHome[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? parseSavedHomes(JSON.parse(raw)) : EMPTY;
  } catch {
    // Private browsing, blocked storage or corrupt data: behave as if nothing is saved.
    return EMPTY;
  }
}

export function getSavedHomes(): SavedHome[] {
  if (typeof window === "undefined") return EMPTY;
  if (cached === null) cached = readStorage();
  return cached;
}

/** Saves the new list. Returns false if the browser refused to store it. */
export function setSavedHomes(homes: SavedHome[]): boolean {
  cached = homes;
  let stored = true;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(homes));
  } catch {
    stored = false;
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
  return stored;
}

function subscribe(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    // Another tab changed the list.
    if (event.key === STORAGE_KEY) {
      cached = null;
      onChange();
    }
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** The saved homes, kept in step across components and browser tabs. */
export function useSavedHomes(): SavedHome[] {
  return useSyncExternalStore(subscribe, getSavedHomes, () => EMPTY);
}
