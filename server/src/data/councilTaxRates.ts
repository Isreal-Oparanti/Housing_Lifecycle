export interface CouncilTaxBandMultipliers {
  [band: string]: number; // Ratio relative to Band D (9/9 = 1)
}

// Statutory band proportions for England & Scotland
export const BAND_MULTIPLIERS: Record<string, number> = {
  A: 6 / 9,
  B: 7 / 9,
  C: 8 / 9,
  D: 9 / 9,
  E: 11 / 9,
  F: 13 / 9,
  G: 15 / 9,
  H: 18 / 9,
};

export interface LocalAuthorityTaxRate {
  code: string;
  name: string;
  region: string;
  taxYear: string;
  bandDRate: number; // Average annual Band D rate in GBP
}

// Representative sample of top UK Local Authorities for 2024/25
export const SAMPLE_COUNCIL_RATES: LocalAuthorityTaxRate[] = [
  { code: "E09000001", name: "City of London", region: "London", taxYear: "2024/25", bandDRate: 1073.08 },
  { code: "E09000033", name: "Westminster", region: "London", taxYear: "2024/25", bandDRate: 973.16 },
  { code: "E09000020", name: "Kensington and Chelsea", region: "London", taxYear: "2024/25", bandDRate: 1514.49 },
  { code: "E09000008", name: "Croydon", region: "London", taxYear: "2024/25", bandDRate: 2366.91 },
  { code: "E09000007", name: "Camden", region: "London", taxYear: "2024/25", bandDRate: 1988.35 },
  { code: "E09000019", name: "Islington", region: "London", taxYear: "2024/25", bandDRate: 1921.14 },
  { code: "E08000025", name: "Birmingham", region: "West Midlands", taxYear: "2024/25", bandDRate: 2043.43 },
  { code: "E08000003", name: "Manchester", region: "North West", taxYear: "2024/25", bandDRate: 2073.55 },
  { code: "E08000035", name: "Leeds", region: "Yorkshire", taxYear: "2024/25", bandDRate: 2064.28 },
  { code: "E06000023", name: "Bristol", region: "South West", taxYear: "2024/25", bandDRate: 2460.42 },
];
