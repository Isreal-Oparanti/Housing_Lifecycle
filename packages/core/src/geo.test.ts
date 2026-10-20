import { describe, expect, it } from "vitest";
import { gridToLatLon } from "./geo.ts";

// Grid and latitude/longitude pairs published together by postcodes.io (ONS Postcode Directory).
const POSTCODES = [
  { name: "E8 3PN (Hackney)", easting: 534810, northing: 184199, lat: 51.540599, lon: -0.057461 },
  { name: "LS1 6BA (Leeds)", easting: 430374, northing: 433619, lat: 53.798012, lon: -1.540353 },
  { name: "EH1 1YZ (Edinburgh)", easting: 325597, northing: 673676, lat: 55.950328, lon: -3.193018 },
  { name: "TR1 1UT (Truro)", easting: 183004, northing: 44605, lat: 50.261456, lon: -5.045945 },
  { name: "CF10 1EP (Cardiff)", easting: 318200, northing: 175860, lat: 51.475764, lon: -3.179217 },
];

/** Straight-line distance between two latitude/longitude points, in metres. */
function metresBetween(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const dLat = (a.lat - b.lat) * 111_200;
  const dLon = (a.lon - b.lon) * 111_200 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dLat, dLon);
}

describe("gridToLatLon", () => {
  it.each(POSTCODES)("places $name within 5 metres", ({ easting, northing, lat, lon }) => {
    expect(metresBetween(gridToLatLon(easting, northing), { lat, lon })).toBeLessThan(5);
  });

  it("puts the grid origin's neighbourhood in the right hemisphere", () => {
    const { lat, lon } = gridToLatLon(400000, 300000);
    expect(lat).toBeGreaterThan(52);
    expect(lat).toBeLessThan(53);
    expect(lon).toBeCloseTo(-2, 0);
  });
});
