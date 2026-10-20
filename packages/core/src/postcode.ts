/**
 * What the renter typed, interpreted as a location. Listings rarely show the
 * full postcode; most end with the outward code ("Middleton Road, London, E8"),
 * so both are accepted and the result says which one was found.
 */
export type PostcodeQuery =
  | { kind: "postcode"; postcode: string; outcode: string }
  | { kind: "outcode"; outcode: string }
  | { kind: "invalid" };

const OUTCODE = "[A-Z]{1,2}[0-9][A-Z0-9]?";
const INCODE = "[0-9][A-Z]{2}";
const FULL_POSTCODE = new RegExp(`\\b(${OUTCODE})\\s*(${INCODE})\\b`);
// Only trusted at the end of the text, where addresses put it. Elsewhere "Flat B2"
// would read as Birmingham's B2.
const TRAILING_OUTCODE = new RegExp(`\\b(${OUTCODE})[\\s.,]*$`);

export function parsePostcodeQuery(input: string): PostcodeQuery {
  const text = input.toUpperCase();

  const full = text.match(FULL_POSTCODE);
  if (full) {
    return { kind: "postcode", postcode: `${full[1]} ${full[2]}`, outcode: full[1] };
  }

  const outcode = text.match(TRAILING_OUTCODE);
  if (outcode) {
    return { kind: "outcode", outcode: outcode[1] };
  }

  return { kind: "invalid" };
}
