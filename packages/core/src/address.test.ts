import { describe, expect, it } from "vitest";
import { normaliseStreetName, parseAddress } from "./address.ts";

describe("parseAddress", () => {
  it("uses a full postcode when there is one", () => {
    expect(parseAddress("85 Kingsland Road, E8 2PB")).toEqual({ kind: "postcode", postcode: "E8 2PB", outcode: "E8" });
    expect(parseAddress("e83pn")).toEqual({ kind: "postcode", postcode: "E8 3PN", outcode: "E8" });
  });

  it("keeps the street when only the outward code is given", () => {
    expect(parseAddress("Middleton Road, London, E8")).toEqual({ kind: "outcode", outcode: "E8", street: "Middleton Road" });
    expect(parseAddress("Mare Street E8")).toEqual({ kind: "outcode", outcode: "E8", street: "Mare Street" });
    expect(parseAddress("12 Mare Street, Hackney, E8")).toEqual({ kind: "outcode", outcode: "E8", street: "Mare Street" });
  });

  it("has no street for a bare outward code", () => {
    expect(parseAddress("E8")).toEqual({ kind: "outcode", outcode: "E8" });
    expect(parseAddress("  sw1a ")).toEqual({ kind: "outcode", outcode: "SW1A" });
  });

  it("reads street and town when there is no postcode at all", () => {
    expect(parseAddress("Navarino Road, Hackney, London")).toEqual({
      kind: "street",
      street: "Navarino Road",
      hints: ["Hackney", "London"],
    });
  });

  it("strips flat and house numbers", () => {
    expect(parseAddress("Flat 2, 85 Kingsland Road, Hackney")).toEqual({
      kind: "street",
      street: "Kingsland Road",
      hints: ["Hackney"],
    });
    expect(parseAddress("Flat 4B\nOak Lane\nBanbury")).toEqual({ kind: "street", street: "Oak Lane", hints: ["Banbury"] });
    expect(parseAddress("14A-16 High Street, Oxford")).toEqual({ kind: "street", street: "High Street", hints: ["Oxford"] });
  });

  it("drops country names from the area hints", () => {
    expect(parseAddress("Park Road, Leeds, England")).toEqual({ kind: "street", street: "Park Road", hints: ["Leeds"] });
  });

  it.each(["", "Hackney", "Navarino Road", "12345", "Flat 2", "Mare Street, UK"])("cannot place %j", (input) => {
    expect(parseAddress(input)).toEqual({ kind: "invalid" });
  });
});

describe("normaliseStreetName", () => {
  it.each([
    ["Navarino Road", "navarino road"],
    ["Navarino Rd", "navarino road"],
    ["Kings Rd.", "kings road"],
    ["King's Road", "kings road"],
    ["St John's Road", "st johns road"],
    ["Queen St", "queen street"],
    ["Oak Ave", "oak avenue"],
  ])("%j → %j", (input, expected) => {
    expect(normaliseStreetName(input)).toBe(expected);
  });
});
