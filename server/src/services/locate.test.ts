import { describe, expect, it } from "vitest";
import type { OutcodeRecord, PostcodeDirectory, PostcodeRecord } from "../adapters/postcodesIo.js";
import { findAuthorityByName } from "../data/rates/index.js";
import { createLocator } from "./locate.js";

// Shapes copied from real postcodes.io responses.
const postcodes: Record<string, PostcodeRecord> = {
  "E8 3PN": { postcode: "E8 3PN", country: "England", adminDistrict: "Hackney", adminDistrictCode: "E09000012", parish: "Hackney, unparished area" },
  "W1J 9LL": { postcode: "W1J 9LL", country: "England", adminDistrict: "Westminster", adminDistrictCode: "E09000033", parish: "Westminster, unparished area" },
  "LS1 6BA": { postcode: "LS1 6BA", country: "England", adminDistrict: "Leeds", adminDistrictCode: "E08000035", parish: "Leeds, unparished area" },
  "OX16 5EF": { postcode: "OX16 5EF", country: "England", adminDistrict: "Cherwell", adminDistrictCode: "E07000177", parish: "Banbury" },
  "CF10 1EP": { postcode: "CF10 1EP", country: "Wales", adminDistrict: "Cardiff", adminDistrictCode: "W06000015", parish: "Castle" },
  "EH1 1YZ": { postcode: "EH1 1YZ", country: "Scotland", adminDistrict: "City of Edinburgh", adminDistrictCode: "S12000036", parish: null },
};

const outcodes: Record<string, OutcodeRecord> = {
  E8: { outcode: "E8", countries: ["England"], adminDistricts: ["Hackney", "Islington", "Tower Hamlets"], easting: 534201, northing: 184538 },
  BS1: { outcode: "BS1", countries: ["England"], adminDistricts: ["Bristol, City of"], easting: 358000, northing: 173000 },
  TD15: { outcode: "TD15", countries: ["England", "Scotland"], adminDistricts: ["Northumberland", "Scottish Borders"], easting: 400000, northing: 650000 },
  EH1: { outcode: "EH1", countries: ["Scotland"], adminDistricts: ["City of Edinburgh"], easting: 325000, northing: 673000 },
};

const directory: PostcodeDirectory = {
  near: async () => [],
  postcode: async (postcode) => postcodes[postcode] ?? null,
  outcode: async (outcode) => outcodes[outcode] ?? null,
};

const locate = createLocator(directory);

describe("locate: full postcodes", () => {
  it("resolves an unparished Hackney postcode to the official Band D", async () => {
    const result = await locate("e8 3pn");
    expect(result).toMatchObject({
      status: "resolved",
      place: { postcode: "E8 3PN", precision: "postcode" },
      authority: { gssCode: "E09000012", name: "Hackney" },
      bandD: { value: 206030, confidence: "official" },
    });
  });

  it("drops the parish average for an unparished address in a parished council", async () => {
    const result = await locate("LS1 6BA");
    expect(result).toMatchObject({ status: "resolved", bandD: { value: 227151, confidence: "official" } });
  });

  it("keeps the average where special expenses apply, even outside a parish", async () => {
    const result = await locate("W1J 9LL");
    expect(result).toMatchObject({ status: "resolved", bandD: { value: 104955, confidence: "estimated" } });
  });

  it("labels the Band D an estimate inside a parish and names the parish", async () => {
    const result = await locate("OX16 5EF");
    expect(result).toMatchObject({
      status: "resolved",
      place: { parish: "Banbury" },
      bandD: { value: 258296, confidence: "estimated" },
    });
  });

  it("treats Welsh communities as varying", async () => {
    const result = await locate("CF10 1EP");
    expect(result).toMatchObject({ status: "resolved", bandD: { confidence: "estimated" } });
  });

  it("says Scotland isn't covered yet", async () => {
    expect(await locate("EH1 1YZ")).toMatchObject({ status: "unsupported" });
  });

  it("reports postcodes that don't exist", async () => {
    expect(await locate("ZZ1 1ZZ")).toMatchObject({ status: "not_found" });
  });
});

describe("locate: outward codes", () => {
  it("lists every council an outward code covers", async () => {
    const result = await locate("Middleton Road, London, E8");
    expect(result.status).toBe("multiple_councils");
    if (result.status !== "multiple_councils") return;
    expect(result.options.map((o) => o.authority.name)).toEqual(["Hackney", "Islington", "Tower Hamlets"]);
  });

  it("resolves once the renter picks one of those councils", async () => {
    const result = await locate("E8", "E09000019");
    expect(result).toMatchObject({ status: "resolved", authority: { name: "Islington" }, place: { precision: "outcode" } });
  });

  it("ignores a picked council that isn't in the outward code", async () => {
    expect((await locate("E8", "E09000033")).status).toBe("multiple_councils");
  });

  it("resolves an outward code with a single council, matching ONS spellings", async () => {
    expect(await locate("BS1")).toMatchObject({ status: "resolved", authority: { name: "Bristol" } });
  });

  it("keeps cross-border areas it can't price as otherAreas", async () => {
    const result = await locate("TD15");
    expect(result).toMatchObject({ status: "multiple_councils", otherAreas: ["Scottish Borders"] });
  });

  it("says Scottish-only outward codes aren't covered", async () => {
    expect(await locate("EH1")).toMatchObject({ status: "unsupported" });
  });
});

describe("findAuthorityByName", () => {
  it.each([
    ["Bristol, City of", "Bristol"],
    ["Herefordshire, County of", "Herefordshire"],
    ["Kingston upon Hull, City of", "Kingston upon Hull"],
    ["County Durham", "Durham"],
    ["St. Helens", "St Helens"],
    ["King's Lynn and West Norfolk", "Kings Lynn and West Norfolk"],
    ["Bournemouth, Christchurch and Poole", "Bournemouth, Christchurch and Poole"],
    ["City of London", "City of London"],
    ["Rhondda Cynon Taf", "Rhondda Cynon Taf"],
    // Ordnance Survey spellings
    ["City of Bristol", "Bristol"],
    ["Caerdydd - Cardiff", "Cardiff"],
    ["Royal Borough of Kingston upon Thames", "Kingston upon Thames"],
    ["Bro Morgannwg - the Vale of Glamorgan", "Vale of Glamorgan"],
    ["City and County of the City of London", "City of London"],
  ])("matches ONS name %j", (onsName, ourName) => {
    expect(findAuthorityByName(onsName)?.name).toBe(ourName);
  });
});
