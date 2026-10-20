/**
 * Ordnance Survey data is positioned on the British National Grid (metres);
 * postcode APIs take latitude and longitude. This converts one to the other,
 * following OS's "A guide to coordinate systems in Great Britain": inverse
 * Transverse Mercator on the Airy 1830 ellipsoid, then a Helmert transform to
 * WGS84. Accurate to about 2 metres, which is plenty for "which postcodes are
 * next to this road".
 */
export interface LatLon {
  lat: number;
  lon: number;
}

// Airy 1830 ellipsoid and the National Grid's projection constants
const AIRY_A = 6377563.396;
const AIRY_B = 6356256.909;
const SCALE = 0.9996012717;
const ORIGIN_LAT = (49 * Math.PI) / 180;
const ORIGIN_LON = (-2 * Math.PI) / 180;
const ORIGIN_NORTHING = -100000;
const ORIGIN_EASTING = 400000;

// WGS84 ellipsoid
const WGS_A = 6378137;
const WGS_B = 6356752.3142;

// Helmert transform OSGB36 → WGS84
const TX = 446.448;
const TY = -125.157;
const TZ = 542.06;
const PPM = -20.4894e-6;
const ARCSEC = Math.PI / (180 * 3600);
const RX = 0.1502 * ARCSEC;
const RY = 0.247 * ARCSEC;
const RZ = 0.8421 * ARCSEC;

const eccentricitySquared = (a: number, b: number) => 1 - (b * b) / (a * a);

/** Latitude and longitude (WGS84, degrees) of a National Grid point. Valid inside Great Britain. */
export function gridToLatLon(easting: number, northing: number): LatLon {
  const e2 = eccentricitySquared(AIRY_A, AIRY_B);
  const n = (AIRY_A - AIRY_B) / (AIRY_A + AIRY_B);

  // Latitude on the central meridian that matches the northing
  let lat = ORIGIN_LAT;
  let meridianArc = 0;
  do {
    lat = (northing - ORIGIN_NORTHING - meridianArc) / (AIRY_A * SCALE) + lat;
    const dLat = lat - ORIGIN_LAT;
    const sLat = lat + ORIGIN_LAT;
    meridianArc =
      AIRY_B *
      SCALE *
      ((1 + n + (5 / 4) * n ** 2 + (5 / 4) * n ** 3) * dLat -
        (3 * n + 3 * n ** 2 + (21 / 8) * n ** 3) * Math.sin(dLat) * Math.cos(sLat) +
        ((15 / 8) * n ** 2 + (15 / 8) * n ** 3) * Math.sin(2 * dLat) * Math.cos(2 * sLat) -
        (35 / 24) * n ** 3 * Math.sin(3 * dLat) * Math.cos(3 * sLat));
  } while (Math.abs(northing - ORIGIN_NORTHING - meridianArc) >= 0.00001);

  const sin = Math.sin(lat);
  const tan = Math.tan(lat);
  const sec = 1 / Math.cos(lat);
  const nu = (AIRY_A * SCALE) / Math.sqrt(1 - e2 * sin ** 2);
  const rho = (AIRY_A * SCALE * (1 - e2)) / (1 - e2 * sin ** 2) ** 1.5;
  const eta2 = nu / rho - 1;

  const vii = tan / (2 * rho * nu);
  const viii = (tan / (24 * rho * nu ** 3)) * (5 + 3 * tan ** 2 + eta2 - 9 * tan ** 2 * eta2);
  const ix = (tan / (720 * rho * nu ** 5)) * (61 + 90 * tan ** 2 + 45 * tan ** 4);
  const x = sec / nu;
  const xi = (sec / (6 * nu ** 3)) * (nu / rho + 2 * tan ** 2);
  const xii = (sec / (120 * nu ** 5)) * (5 + 28 * tan ** 2 + 24 * tan ** 4);
  const xiia = (sec / (5040 * nu ** 7)) * (61 + 662 * tan ** 2 + 1320 * tan ** 4 + 720 * tan ** 6);

  const dE = easting - ORIGIN_EASTING;
  const phi = lat - vii * dE ** 2 + viii * dE ** 4 - ix * dE ** 6;
  const lambda = ORIGIN_LON + x * dE - xi * dE ** 3 + xii * dE ** 5 - xiia * dE ** 7;

  // OSGB36 (Airy) → cartesian → Helmert → WGS84 cartesian → WGS84 latitude and longitude
  const nuAiry = AIRY_A / Math.sqrt(1 - e2 * Math.sin(phi) ** 2);
  const x1 = nuAiry * Math.cos(phi) * Math.cos(lambda);
  const y1 = nuAiry * Math.cos(phi) * Math.sin(lambda);
  const z1 = nuAiry * (1 - e2) * Math.sin(phi);

  const x2 = TX + x1 * (1 + PPM) - y1 * RZ + z1 * RY;
  const y2 = TY + x1 * RZ + y1 * (1 + PPM) - z1 * RX;
  const z2 = TZ - x1 * RY + y1 * RX + z1 * (1 + PPM);

  const wgsE2 = eccentricitySquared(WGS_A, WGS_B);
  const p = Math.hypot(x2, y2);
  let latitude = Math.atan2(z2, p * (1 - wgsE2));
  for (let i = 0; i < 10; i++) {
    const v = WGS_A / Math.sqrt(1 - wgsE2 * Math.sin(latitude) ** 2);
    latitude = Math.atan2(z2 + wgsE2 * v * Math.sin(latitude), p);
  }
  return { lat: (latitude * 180) / Math.PI, lon: (Math.atan2(y2, x2) * 180) / Math.PI };
}
