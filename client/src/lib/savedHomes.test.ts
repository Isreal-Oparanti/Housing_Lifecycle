import { describe, expect, it } from "vitest";
import type { AuthoritySummary, Place } from "@truecost/core";
import { readCheckParams } from "./check";
import { comparableHome } from "./homeCosts";
import {
  MAX_SAVED_HOMES,
  cleanListingUrl,
  defaultHomeName,
  parseSavedHomes,
  withHomeAdded,
  withHomeUpdated,
  withoutHome,
  type SavedHome,
} from "./savedHomes";

const hackney: AuthoritySummary = {
  gssCode: "E09000012",
  name: "Hackney",
  nation: "england",
  areaBandD: 206030,
  variesWithinArea: false,
};

function home(overrides: Partial<SavedHome> = {}, check: Partial<SavedHome["check"]> = {}): SavedHome {
  return {
    id: "home-0001",
    name: "Navarino Road, E8",
    listingUrl: "",
    check: { q: "Navarino Road, Hackney", rent: "1500", band: "C", who: "adults", authority: "E09000012", ...check },
    snapshot: {
      place: { query: "Navarino Road, Hackney", precision: "street", street: "Navarino Road", outcode: "E8" },
      authority: hackney,
      bandD: { value: 206030, confidence: "official" },
      taxYear: "2026-27",
    },
    savedAt: "2026-10-31T10:00:00.000Z",
    updatedAt: "2026-10-31T10:00:00.000Z",
    ...overrides,
  };
}

describe("cleanListingUrl", () => {
  it.each([
    ["https://www.rightmove.co.uk/properties/93005082", "https://www.rightmove.co.uk/properties/93005082"],
    ["www.zoopla.co.uk/to-rent/details/123", "https://www.zoopla.co.uk/to-rent/details/123"],
    ["  http://example.com/x  ", "http://example.com/x"],
  ])("keeps web links: %j", (input, expected) => {
    expect(cleanListingUrl(input)).toBe(expected);
  });

  it.each(["javascript:alert(1)", "data:text/html,hi", "not a link at all", ""])("rejects %j", (input) => {
    expect(cleanListingUrl(input)).toBe("");
  });
});

describe("parseSavedHomes", () => {
  it("reads back what was saved", () => {
    const saved = [home()];
    expect(parseSavedHomes(JSON.parse(JSON.stringify(saved)))).toEqual(saved);
  });

  it("drops anything malformed instead of trusting it", () => {
    const broken = [
      null,
      "text",
      { ...home(), id: 42 },
      { ...home(), check: { ...home().check, who: "everyone" } },
      { ...home(), snapshot: { ...home().snapshot, bandD: { value: 2060.3 } } },
      home({ id: "home-0002" }),
    ];
    expect(parseSavedHomes(broken).map((h) => h.id)).toEqual(["home-0002"]);
    expect(parseSavedHomes({ not: "an array" })).toEqual([]);
  });

  it("strips unsafe listing links from stored data", () => {
    const [parsed] = parseSavedHomes([{ ...home(), listingUrl: "javascript:alert(1)" }]);
    expect(parsed.listingUrl).toBe("");
  });

  it("never returns more than the limit", () => {
    const many = Array.from({ length: MAX_SAVED_HOMES + 5 }, (_, i) => home({ id: `home-${String(i).padStart(4, "0")}` }));
    expect(parseSavedHomes(many)).toHaveLength(MAX_SAVED_HOMES);
  });
});

describe("saved home changes", () => {
  it("adds, updates and removes", () => {
    const added = withHomeAdded([], home());
    const updated = withHomeUpdated(added, "home-0001", { name: "Top floor flat" }, new Date("2026-11-01T09:00:00Z"));
    expect(updated[0]).toMatchObject({ name: "Top floor flat", updatedAt: "2026-11-01T09:00:00.000Z" });
    expect(withoutHome(updated, "home-0001")).toEqual([]);
  });

  it("refuses to go past the limit", () => {
    const full = Array.from({ length: MAX_SAVED_HOMES }, (_, i) => home({ id: `home-${String(i).padStart(4, "0")}` }));
    expect(() => withHomeAdded(full, home({ id: "home-extra" }))).toThrow(RangeError);
  });
});

describe("defaultHomeName", () => {
  const base: Omit<Place, "precision"> = { query: "" };
  it.each([
    [{ ...base, precision: "postcode", postcode: "E8 3PN", outcode: "E8" } as Place, "E8 3PN"],
    [{ ...base, precision: "street", street: "Navarino Road", outcode: "E8" } as Place, "Navarino Road, E8"],
    [{ ...base, precision: "street", street: "Navarino Road" } as Place, "Navarino Road"],
    [{ ...base, precision: "outcode", outcode: "E8" } as Place, "E8, Hackney"],
  ])("%j → %j", (place, expected) => {
    expect(defaultHomeName(place, hackney)).toBe(expected);
  });
});

describe("comparableHome", () => {
  it("adds council tax for the band and household", () => {
    // Hackney Band C, two adults: £1,831.38 a year → £152.62 a month
    expect(comparableHome(home())).toEqual({ id: "home-0001", rent: 150000, extras: 15262 });
    // Living alone: 25% off → £114.46
    expect(comparableHome(home({}, { who: "single" })).extras).toBe(11446);
  });

  it("counts council tax as nothing for students and rooms in shared houses", () => {
    expect(comparableHome(home({}, { who: "students" })).extras).toBe(0);
    expect(comparableHome(home({}, { who: "room" })).extras).toBe(0);
  });

  it("can't rank a home without a band or a rent", () => {
    expect(comparableHome(home({}, { band: "" })).extras).toBeNull();
    expect(comparableHome(home({}, { rent: "" })).rent).toBeNull();
  });
});

describe("readCheckParams: saved", () => {
  it("accepts a saved-home id and ignores anything else", () => {
    expect(readCheckParams({ q: "E8 3PN", saved: "3f2a9c1e-7b4d-4e8a-9c2f-1a2b3c4d5e6f" }).saved).toBe(
      "3f2a9c1e-7b4d-4e8a-9c2f-1a2b3c4d5e6f",
    );
    expect(readCheckParams({ q: "E8 3PN", saved: "<script>" }).saved).toBe("");
  });
});
