import { describe, expect, it } from "vitest";
import { parsePostcodeQuery } from "./postcode.ts";

describe("parsePostcodeQuery", () => {
  it.each([
    ["E8 3PN", "E8 3PN", "E8"],
    ["e83pn", "E8 3PN", "E8"],
    ["  sw1a 2aa ", "SW1A 2AA", "SW1A"],
    ["W1J9LL", "W1J 9LL", "W1J"],
    ["85 Kingsland Road, E8 2PB", "E8 2PB", "E8"],
    ["CF10 1EP", "CF10 1EP", "CF10"],
  ])("finds the full postcode in %j", (input, postcode, outcode) => {
    expect(parsePostcodeQuery(input)).toEqual({ kind: "postcode", postcode, outcode });
  });

  it.each([
    ["E8", "E8"],
    ["Middleton Road, London, E8", "E8"],
    ["Navarino Road, Hackney, London E8", "E8"],
    ["Flat B2, Mare Street, E8", "E8"],
    ["ec1a", "EC1A"],
    ["Kingsland Road, E8.", "E8"],
  ])("falls back to the outward code in %j", (input, outcode) => {
    expect(parsePostcodeQuery(input)).toEqual({ kind: "outcode", outcode });
  });

  it.each(["", "Hackney", "Mare Street, London", "12345", "Flat B2, Mare Street"])("rejects %j", (input) => {
    expect(parsePostcodeQuery(input)).toEqual({ kind: "invalid" });
  });
});
