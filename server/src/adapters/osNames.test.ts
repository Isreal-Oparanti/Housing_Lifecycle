import { describe, expect, it, vi } from "vitest";
import { createOsNames, StreetDirectoryUnavailable } from "./osNames.js";

const KEY = "test-key-123";

function okResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
}

const roadBody = {
  results: [
    { GAZETTEER_ENTRY: { NAME1: "Navarino Road", POSTCODE_DISTRICT: "E8", DISTRICT_BOROUGH: "Hackney", COUNTY_UNITARY: "Greater London", COUNTRY: "England" } },
    { GAZETTEER_ENTRY: { NAME1: "Kingsland Road", POSTCODE_DISTRICT: "HP21", DISTRICT_BOROUGH: null, COUNTY_UNITARY: "Buckinghamshire", COUNTRY: "England" } },
  ],
};

const box = { minEasting: 1, minNorthing: 2, maxEasting: 3, maxNorthing: 4 };

describe("createOsNames", () => {
  it("sends the key, the map box and the road-type filter", async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request) => okResponse(roadBody));
    await createOsNames(KEY, fetchMock as unknown as typeof fetch).roads("Navarino Road", box);

    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.searchParams.get("key")).toBe(KEY);
    expect(url.searchParams.get("query")).toBe("Navarino Road");
    expect(url.searchParams.getAll("fq")).toEqual([
      "BBOX:1,2,3,4",
      "LOCAL_TYPE:Named_Road LOCAL_TYPE:Section_Of_Named_Road",
    ]);
  });

  it("uses the county as the council for unitary authorities with no district", async () => {
    const roads = await createOsNames(KEY, (async () => okResponse(roadBody)) as unknown as typeof fetch).roads("x", box);
    expect(roads.map((r) => r.council)).toEqual(["Hackney", "Buckinghamshire"]);
  });

  it("caches repeat searches", async () => {
    const fetchMock = vi.fn(async () => okResponse(roadBody));
    const streets = createOsNames(KEY, fetchMock as unknown as typeof fetch);
    await streets.roads("Navarino Road", box);
    await streets.roads("Navarino Road", box);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("never puts the key in an error", async () => {
    const failing = (async () => new Response("denied", { status: 403 })) as unknown as typeof fetch;
    const error = await createOsNames(KEY, failing).roads("x", box).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(StreetDirectoryUnavailable);
    expect(String((error as Error).message)).not.toContain(KEY);

    const unreachable = (async () => {
      throw new Error(`fetch failed https://api.os.uk/?key=${KEY}`);
    }) as unknown as typeof fetch;
    const error2 = await createOsNames(KEY, unreachable).settlements("x").catch((e: unknown) => e);
    expect(error2).toBeInstanceOf(StreetDirectoryUnavailable);
    expect(String((error2 as Error).message)).not.toContain(KEY);
  });
});
