import { describe, expect, it } from "vitest";
import {
  parseRoads,
  parseSettlements,
  StreetDirectoryUnavailable,
  type MapBox,
  type RoadMatch,
  type Settlement,
  type StreetDirectory,
} from "../adapters/osNames.js";
import {
  PostcodeDirectoryUnavailable,
  type NearbyPostcode,
  type OutcodeRecord,
  type PostcodeDirectory,
} from "../adapters/postcodesIo.js";
import kingslandFixture from "../adapters/__fixtures__/roads-kingsland-hackney.json" with { type: "json" };
import navarinoFixture from "../adapters/__fixtures__/roads-navarino-hackney.json" with { type: "json" };
import hackneyFixture from "../adapters/__fixtures__/settlements-hackney.json" with { type: "json" };
import { createLocator } from "./locate.js";

// Real OS Names responses for Hackney, trimmed to the fields we read.
const navarinoRoads = parseRoads(navarinoFixture);
const kingslandRoads = parseRoads(kingslandFixture);
const hackney = parseSettlements(hackneyFixture);

const e8: OutcodeRecord = {
  outcode: "E8",
  countries: ["England"],
  adminDistricts: ["Hackney", "Islington", "Tower Hamlets"],
  easting: 534201,
  northing: 184538,
};

function makeDirectory(near: PostcodeDirectory["near"] = async () => []): PostcodeDirectory {
  return {
    near,
    postcode: async () => null,
    outcode: async (outcode) => (outcode === "E8" ? e8 : null),
  };
}

const directory = makeDirectory();

/** Postcodes in one council, as postcodes.io reports them next to a road. */
function postcodesIn(gssCode: string, country = "England"): NearbyPostcode[] {
  return [{ postcode: "X1 1XX", country, adminDistrictCode: gssCode }];
}

interface FakeOptions {
  roads?: Record<string, RoadMatch[]>;
  settlements?: Record<string, Settlement[]>;
  failWith?: Error;
}

function fakeStreets({ roads = {}, settlements = {}, failWith }: FakeOptions = {}) {
  const roadBoxes: MapBox[] = [];
  const streets: StreetDirectory = {
    async roads(name, box) {
      if (failWith) throw failWith;
      roadBoxes.push(box);
      return roads[name] ?? [];
    },
    async settlements(name) {
      if (failWith) throw failWith;
      return settlements[name] ?? [];
    },
  };
  return { streets, roadBoxes };
}

const HACKNEY_CENTRE: [number, number] = [534945, 184665];

function road(
  name: string,
  council: string | null,
  outcode: string,
  country = "England",
  at: [number, number] = HACKNEY_CENTRE,
): RoadMatch {
  return { name, altName: null, outcode, council, place: null, country, easting: at[0], northing: at[1] };
}

function settlement(name: string, at: [number, number], type = "Town", country = "England"): Settlement {
  return { name, altName: null, type, country, easting: at[0], northing: at[1] };
}

describe("OS Names parsing (real responses)", () => {
  it("reads councils from road sections", () => {
    const navarino = navarinoRoads.filter((r) => r.name === "Navarino Road");
    expect(navarino.length).toBeGreaterThan(0);
    expect(navarino.every((r) => r.council === "Hackney" && r.outcode === "E8")).toBe(true);
  });

  it("reads settlement positions in grid metres", () => {
    expect(hackney[0]).toMatchObject({ name: "Hackney", easting: 534945, northing: 184665 });
  });
});

describe("locate: street and town (no postcode)", () => {
  it("finds the council from the street and town", async () => {
    const { streets } = fakeStreets({ settlements: { Hackney: hackney }, roads: { "Navarino Road": navarinoRoads } });
    const locate = createLocator(directory, streets);

    const result = await locate("Navarino Road, Hackney, London");
    expect(result).toMatchObject({
      status: "resolved",
      place: { precision: "street", street: "Navarino Road", outcode: "E8" },
      authority: { gssCode: "E09000012", name: "Hackney" },
      // Parish can't be known from a street, and Hackney has none, so this is exact.
      bandD: { value: 206030, confidence: "official" },
    });
  });

  it("searches a map box around the town, not the whole country", async () => {
    const { streets, roadBoxes } = fakeStreets({ settlements: { Hackney: hackney }, roads: { "Navarino Road": navarinoRoads } });
    await createLocator(directory, streets)("Navarino Road, Hackney");
    expect(roadBoxes).toHaveLength(1);
    expect(roadBoxes[0]).toEqual({ minEasting: 527945, maxEasting: 541945, minNorthing: 177665, maxNorthing: 191665 });
  });

  it("tries the next hint when the first leads nowhere", async () => {
    const { streets } = fakeStreets({
      settlements: { Shoreditch: [], Hackney: hackney },
      roads: { "Navarino Road": navarinoRoads },
    });
    const result = await createLocator(directory, streets)("Navarino Road, Shoreditch, Hackney");
    expect(result).toMatchObject({ status: "resolved", authority: { name: "Hackney" } });
  });

  it("matches abbreviations and flat numbers", async () => {
    const { streets } = fakeStreets({ settlements: { Hackney: hackney }, roads: { "Navarino Rd": navarinoRoads } });
    const result = await createLocator(directory, streets)("Flat 3, 12 Navarino Rd, Hackney");
    expect(result).toMatchObject({ status: "resolved", authority: { name: "Hackney" } });
  });

  it("asks the renter to choose when a road runs through two councils", async () => {
    const roads = [road("Border Road", "Hackney", "E8"), road("Border Road", "Islington", "N1")];
    const { streets } = fakeStreets({ settlements: { Hackney: hackney }, roads: { "Border Road": roads } });
    const result = await createLocator(directory, streets)("Border Road, Hackney");
    expect(result.status).toBe("multiple_councils");
    if (result.status !== "multiple_councils") return;
    expect(result.options.map((o) => o.authority.name).sort()).toEqual(["Hackney", "Islington"]);
  });

  it("resolves once the renter picks one of those councils", async () => {
    const roads = [road("Border Road", "Hackney", "E8"), road("Border Road", "Islington", "N1")];
    const { streets } = fakeStreets({ settlements: { Hackney: hackney }, roads: { "Border Road": roads } });
    const result = await createLocator(directory, streets)("Border Road, Hackney", "E09000019");
    expect(result).toMatchObject({ status: "resolved", authority: { name: "Islington" } });
  });

  it("matches OS spellings of councils", async () => {
    const cardiff = [settlement("Cardiff", [318000, 176000], "City", "Wales")];
    const roads2 = [road("Station Road", "Caerdydd - Cardiff", "CF14", "Wales", [318500, 176500])];
    const { streets } = fakeStreets({ settlements: { Cardiff: cardiff }, roads: { "Station Road": roads2 } });
    const result = await createLocator(directory, streets)("Station Road, Cardiff");
    expect(result).toMatchObject({ status: "resolved", authority: { gssCode: "W06000015" } });
  });

  it("says Scotland isn't covered when the road is there", async () => {
    const roads = [road("Royal Mile", "City of Edinburgh", "EH1", "Scotland", [325000, 673000])];
    const edinburgh = [settlement("Edinburgh", [325000, 673000], "City", "Scotland")];
    const { streets } = fakeStreets({ settlements: { Edinburgh: edinburgh }, roads: { "Royal Mile": roads } });
    expect(await createLocator(directory, streets)("Royal Mile, Edinburgh")).toMatchObject({ status: "unsupported" });
  });

  it("still says Scotland when the road itself isn't in OS's list", async () => {
    const edinburgh = [settlement("Edinburgh", [325000, 673000], "City", "Scotland")];
    const { streets } = fakeStreets({ settlements: { Edinburgh: edinburgh } });
    const result = await createLocator(directory, streets)("Some Street, Edinburgh");
    expect(result).toMatchObject({ status: "unsupported", message: expect.stringContaining("Scotland") });
  });

  it("prefers the nearest road when a neighbouring council has one with the same name", async () => {
    // Kingsland Road in Hackney is ~1.5km from the centre; the Newham one is ~4km away.
    const roads = [
      road("Kingsland Road", "Hackney", "E8", "England", [533600, 185300]),
      road("Kingsland Road", "Newham", "E13", "England", [538900, 183000]),
    ];
    const { streets } = fakeStreets({ settlements: { Hackney: hackney }, roads: { "Kingsland Road": roads } });
    const result = await createLocator(directory, streets)("Kingsland Road, Hackney");
    expect(result).toMatchObject({ status: "resolved", authority: { name: "Hackney" } });
  });

  it("widens the search when nothing is close", async () => {
    const roads = [road("Far Lane", "Hackney", "E8", "England", [534945, 190000])];
    const { streets } = fakeStreets({ settlements: { Hackney: hackney }, roads: { "Far Lane": roads } });
    expect(await createLocator(directory, streets)("Far Lane, Hackney")).toMatchObject({ status: "resolved" });
  });

  it("ignores roads too far away to be the one meant", async () => {
    const roads = [road("Far Lane", "Newham", "E13", "England", [534945, 195000])];
    const { streets } = fakeStreets({ settlements: { Hackney: hackney }, roads: { "Far Lane": roads } });
    expect(await createLocator(directory, streets)("Far Lane, Hackney")).toMatchObject({ status: "not_found" });
  });

  it("searches around the city, not hamlets that share its name", async () => {
    const oxford = [
      settlement("Oxford", [451500, 206500], "City"),
      settlement("Oxford", [391000, 358000], "Hamlet"),
    ];
    const roads = [
      road("High Street", "Oxford", "OX1", "England", [451600, 206300]),
      road("High Street", "Cheshire East", "ST7", "England", [391100, 358100]),
    ];
    const { streets, roadBoxes } = fakeStreets({ settlements: { Oxford: oxford }, roads: { "High Street": roads } });
    const result = await createLocator(directory, streets)("High Street, Oxford");
    expect(roadBoxes).toHaveLength(1);
    expect(result).toMatchObject({ status: "resolved", authority: { name: "Oxford" } });
  });

  it("finds Welsh places and streets by their English names", async () => {
    // OS lists Newport under "Casnewydd", with "Newport" as the second name.
    const casnewydd: Settlement[] = [{ ...settlement("Casnewydd", [331000, 187000], "City", "Wales"), altName: "Newport" }];
    const queenStreet: RoadMatch[] = [
      { ...road("Heol y Frenhines", "Casnewydd - Newport", "NP20", "Wales", [331200, 187100]), altName: "Queen Street" },
    ];
    const { streets } = fakeStreets({ settlements: { Newport: casnewydd }, roads: { "Queen Street": queenStreet } });
    const result = await createLocator(directory, streets)("Queen Street, Newport");
    expect(result).toMatchObject({
      status: "resolved",
      authority: { name: "Newport", nation: "wales" },
      place: { street: "Queen Street" },
    });
  });

  it("prefers a city over a smaller place of the same name", async () => {
    const newport = [
      settlement("Newport", [331000, 187000], "City", "Wales"),
      settlement("Newport", [352000, 319000], "Town"),
    ];
    const roads = [
      road("High Street", "Casnewydd - Newport", "NP20", "Wales", [331100, 187100]),
      road("High Street", "Telford and Wrekin", "TF10", "England", [352100, 319100]),
    ];
    const { streets } = fakeStreets({ settlements: { Newport: newport }, roads: { "High Street": roads } });
    const result = await createLocator(directory, streets)("High Street, Newport");
    expect(result).toMatchObject({ status: "resolved", authority: { name: "Newport" } });
  });

  it("ignores road sections where OS names only a county", async () => {
    const roads = [road("Foo Road", "Oxfordshire", "OX1"), road("Foo Road", "Hackney", "E8")];
    const { streets } = fakeStreets({ settlements: { Hackney: hackney }, roads: { "Foo Road": roads } });
    const result = await createLocator(directory, streets)("Foo Road, Hackney");
    expect(result).toMatchObject({ status: "resolved", authority: { name: "Hackney" } });
  });

  it("treats a road with only county-level data as not found", async () => {
    const roads = [road("Foo Road", "Oxfordshire", "OX1")];
    const { streets } = fakeStreets({ settlements: { Hackney: hackney }, roads: { "Foo Road": roads } });
    expect(await createLocator(directory, streets)("Foo Road, Hackney")).toMatchObject({ status: "not_found" });
  });

  it("reports a street it can't find", async () => {
    const { streets } = fakeStreets({ settlements: { Hackney: hackney } });
    const result = await createLocator(directory, streets)("Nowhere Lane, Hackney");
    expect(result).toMatchObject({ status: "not_found" });
  });

  it("explains that street search is off when there is no key", async () => {
    const result = await createLocator(directory)("Navarino Road, Hackney");
    expect(result).toMatchObject({ status: "invalid" });
  });

  it("surfaces an outage as an error, because there is nothing to fall back to", async () => {
    const { streets } = fakeStreets({ failWith: new StreetDirectoryUnavailable("down") });
    await expect(createLocator(directory, streets)("Navarino Road, Hackney")).rejects.toBeInstanceOf(StreetDirectoryUnavailable);
  });
});

describe("locate: street and outward code", () => {
  it("narrows an outward code spanning three councils to the road's council", async () => {
    const { streets } = fakeStreets({ roads: { "Navarino Road": navarinoRoads } });
    const result = await createLocator(directory, streets)("Navarino Road, London, E8");
    expect(result).toMatchObject({
      status: "resolved",
      authority: { name: "Hackney" },
      place: { precision: "street", street: "Navarino Road", outcode: "E8" },
    });
  });

  it("ignores roads of the same name in other outward codes", async () => {
    const roads = [road("Middleton Road", "Cherwell", "OX16"), road("Middleton Road", "Hackney", "E8")];
    const { streets } = fakeStreets({ roads: { "Middleton Road": roads } });
    const result = await createLocator(directory, streets)("Middleton Road, London, E8");
    expect(result).toMatchObject({ status: "resolved", authority: { name: "Hackney" } });
  });

  it("searches around the outward code's centre", async () => {
    const { streets, roadBoxes } = fakeStreets({ roads: { "Navarino Road": navarinoRoads } });
    await createLocator(directory, streets)("Navarino Road, E8");
    expect(roadBoxes[0]).toEqual({ minEasting: 528201, maxEasting: 540201, minNorthing: 178538, maxNorthing: 190538 });
  });

  it("falls back to every council in the outward code when the road isn't found", async () => {
    const { streets } = fakeStreets();
    const result = await createLocator(directory, streets)("Nowhere Lane, London, E8");
    expect(result.status).toBe("multiple_councils");
  });

  it("falls back the same way when street search is down", async () => {
    const { streets } = fakeStreets({ failWith: new StreetDirectoryUnavailable("down") });
    const result = await createLocator(directory, streets)("Navarino Road, London, E8");
    expect(result.status).toBe("multiple_councils");
  });

  it("lists councils when the road itself crosses a boundary", async () => {
    const { streets } = fakeStreets({ roads: { "Kingsland Road": [...kingslandRoads, road("Kingsland Road", "Islington", "E8")] } });
    const result = await createLocator(directory, streets)("Kingsland Road, E8");
    expect(result.status).toBe("multiple_councils");
    if (result.status !== "multiple_councils") return;
    expect(result.options.map((o) => o.authority.name).sort()).toEqual(["Hackney", "Islington"]);
  });
});

describe("locate: roads on a council boundary", () => {
  const HACKNEY = "E09000012";
  const CAMDEN = "E09000007";

  it("keeps a single council when the postcodes beside the road agree", async () => {
    const { streets } = fakeStreets({ settlements: { Hackney: hackney }, roads: { "Navarino Road": navarinoRoads } });
    const locate = createLocator(makeDirectory(async () => postcodesIn(HACKNEY)), streets);
    expect(await locate("Navarino Road, Hackney")).toMatchObject({ status: "resolved", authority: { name: "Hackney" } });
  });

  it("asks which side when the postcodes beside the road belong to another council too", async () => {
    // OS gives Cleveland Street wholly to Westminster, but homes on the far side are in Camden.
    const roads = [road("Cleveland Street", "City of Westminster", "W1T")];
    const { streets } = fakeStreets({ settlements: { Hackney: hackney }, roads: { "Cleveland Street": roads } });
    const locate = createLocator(makeDirectory(async () => [...postcodesIn("E09000033"), ...postcodesIn(CAMDEN)]), streets);

    const result = await locate("Cleveland Street, Hackney");
    expect(result.status).toBe("multiple_councils");
    if (result.status !== "multiple_councils") return;
    expect(result.options.map((o) => o.authority.name).sort()).toEqual(["Camden", "Westminster"]);
  });

  it("lets the renter pick a side", async () => {
    const roads = [road("Cleveland Street", "City of Westminster", "W1T")];
    const { streets } = fakeStreets({ settlements: { Hackney: hackney }, roads: { "Cleveland Street": roads } });
    const locate = createLocator(makeDirectory(async () => [...postcodesIn("E09000033"), ...postcodesIn(CAMDEN)]), streets);
    expect(await locate("Cleveland Street, Hackney", CAMDEN)).toMatchObject({ status: "resolved", authority: { name: "Camden" } });
  });

  it("checks the outward-code path for boundaries too", async () => {
    const { streets } = fakeStreets({ roads: { "Navarino Road": navarinoRoads } });
    const locate = createLocator(makeDirectory(async () => postcodesIn("E09000019")), streets);
    const result = await locate("Navarino Road, London, E8");
    expect(result.status).toBe("multiple_councils");
  });

  it("looks beside at most a handful of road sections", async () => {
    const many = Array.from({ length: 20 }, (_, i) => road("Long Road", "Hackney", "E8", "England", [534945 + i * 10, 184665]));
    const { streets } = fakeStreets({ settlements: { Hackney: hackney }, roads: { "Long Road": many } });
    let calls = 0;
    const locate = createLocator(
      makeDirectory(async () => {
        calls++;
        return postcodesIn(HACKNEY);
      }),
      streets,
    );
    await locate("Long Road, Hackney");
    expect(calls).toBeLessThanOrEqual(6);
  });

  it("falls back to the road's own council when the postcode service is down", async () => {
    const { streets } = fakeStreets({ settlements: { Hackney: hackney }, roads: { "Navarino Road": navarinoRoads } });
    const locate = createLocator(
      makeDirectory(async () => {
        throw new PostcodeDirectoryUnavailable("down");
      }),
      streets,
    );
    expect(await locate("Navarino Road, Hackney")).toMatchObject({ status: "resolved", authority: { name: "Hackney" } });
  });

  it("notes a boundary with a country we don't cover", async () => {
    const { streets } = fakeStreets({ settlements: { Hackney: hackney }, roads: { "Navarino Road": navarinoRoads } });
    const locate = createLocator(makeDirectory(async () => postcodesIn("S12000026", "Scotland")), streets);
    expect(await locate("Navarino Road, Hackney")).toMatchObject({ status: "multiple_councils", otherAreas: ["Scotland"] });
  });
});
