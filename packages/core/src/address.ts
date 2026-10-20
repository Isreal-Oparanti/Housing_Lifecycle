import { parsePostcodeQuery } from "./postcode.ts";

/**
 * A listing's address as the renter pastes it. Agents rarely show the full
 * postcode, so this understands the three shapes we actually see:
 *
 *   "85 Kingsland Road, E8 2PB"              full postcode
 *   "Middleton Road, London, E8"             street + outward code
 *   "Navarino Road, Hackney, London"         street + town, no postcode
 */
export type AddressQuery =
  | { kind: "postcode"; postcode: string; outcode: string }
  | { kind: "outcode"; outcode: string; street?: string }
  | { kind: "street"; street: string; hints: string[] }
  | { kind: "invalid" };

const GENERIC_AREAS = new Set(["uk", "united kingdom", "england", "wales", "great britain", "gb"]);

const UNIT_PREFIX = /^(?:flat|apartment|apt|unit|room|studio|suite)\b\s*[\w-]*\s*$/i;
const LEADING_UNIT = /^(?:flat|apartment|apt|unit|room|studio|suite)\s+[\w-]+\s*,?\s*/i;
const LEADING_NUMBER = /^\d+[a-z]?(?:\s*[-/–]\s*\d+[a-z]?)?\s+/i;

const ABBREVIATIONS: Record<string, string> = {
  rd: "road",
  st: "street",
  ave: "avenue",
  av: "avenue",
  ln: "lane",
  dr: "drive",
  ct: "court",
  cl: "close",
  gdns: "gardens",
  sq: "square",
  pl: "place",
  cres: "crescent",
  ter: "terrace",
  hwy: "highway",
};

/**
 * Comparable form of a street or place name: lower case, no punctuation, and
 * a trailing "Rd"/"St"/"Ave" spelled out. ("St John's Road" keeps its leading
 * "St": only the last word is expanded.)
 */
export function normaliseStreetName(name: string): string {
  const words = name
    .toLowerCase()
    .replace(/['’.]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
  const last = words.length - 1;
  if (last > 0 && ABBREVIATIONS[words[last]]) words[last] = ABBREVIATIONS[words[last]];
  return words.join(" ");
}

/** Strips "Flat 2," and house numbers: "Flat 2, 85 Kingsland Road" → "Kingsland Road". */
function streetFromSegments(segments: string[]): { street?: string; rest: string[] } {
  const remaining = [...segments];
  while (remaining.length > 0 && UNIT_PREFIX.test(remaining[0])) remaining.shift();
  if (remaining.length === 0) return { rest: [] };

  const first = remaining[0].replace(LEADING_UNIT, "").replace(LEADING_NUMBER, "").trim();
  if (first.length < 3 || !/[a-z]{3}/i.test(first)) return { rest: remaining.slice(1) };
  return { street: first, rest: remaining.slice(1) };
}

function cleanHints(segments: string[]): string[] {
  return segments
    .map((segment) => segment.trim())
    .filter((segment) => segment.length >= 3 && /[a-z]{3}/i.test(segment))
    .filter((segment) => !GENERIC_AREAS.has(segment.toLowerCase()));
}

export function parseAddress(input: string): AddressQuery {
  const postcode = parsePostcodeQuery(input);
  if (postcode.kind === "postcode") return postcode;

  const segments = input
    .split(/[,\n;]/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (postcode.kind === "outcode") {
    // Drop the outward code from the last segment: "Mare Street E8" → "Mare Street".
    const last = segments.length - 1;
    segments[last] = segments[last].replace(new RegExp(`\\s*\\b${postcode.outcode}\\b[\\s.]*$`, "i"), "").trim();
    const { street } = streetFromSegments(segments.filter(Boolean));
    return street
      ? { kind: "outcode", outcode: postcode.outcode, street }
      : { kind: "outcode", outcode: postcode.outcode };
  }

  const { street, rest } = streetFromSegments(segments);
  const hints = cleanHints(rest);
  if (street && hints.length > 0) return { kind: "street", street, hints };
  return { kind: "invalid" };
}
