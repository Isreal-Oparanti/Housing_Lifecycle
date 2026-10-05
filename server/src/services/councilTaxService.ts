import { BAND_MULTIPLIERS, SAMPLE_COUNCIL_RATES, LocalAuthorityTaxRate } from "../data/councilTaxRates.js";

export interface CouncilTaxCalculationResult {
  localAuthority: LocalAuthorityTaxRate;
  band: string;
  annualBaseRate: number;
  monthlyBaseRate: number;
  discountType: "none" | "single_person" | "student_exemption";
  discountPercentage: number;
  annualAdjustedRate: number;
  monthlyAdjustedRate: number;
}

export function calculateCouncilTax(
  laCode: string,
  band: string,
  discountType: "none" | "single_person" | "student_exemption" = "none"
): CouncilTaxCalculationResult {
  const normalizedBand = band.toUpperCase();
  const multiplier = BAND_MULTIPLIERS[normalizedBand];

  if (!multiplier) {
    throw new Error(`Invalid Council Tax band: ${band}. Valid bands are A to H.`);
  }

  const la = SAMPLE_COUNCIL_RATES.find((item) => item.code === laCode || item.name.toLowerCase() === laCode.toLowerCase());

  if (!la) {
    throw new Error(`Local authority not found for: ${laCode}`);
  }

  const annualBaseRate = Math.round(la.bandDRate * multiplier * 100) / 100;
  const monthlyBaseRate = Math.round((annualBaseRate / 12) * 100) / 100;

  let discountPercentage = 0;
  if (discountType === "single_person") {
    discountPercentage = 25;
  } else if (discountType === "student_exemption") {
    discountPercentage = 100;
  }

  const annualAdjustedRate = Math.round(annualBaseRate * (1 - discountPercentage / 100) * 100) / 100;
  const monthlyAdjustedRate = Math.round((annualAdjustedRate / 12) * 100) / 100;

  return {
    localAuthority: la,
    band: normalizedBand,
    annualBaseRate,
    monthlyBaseRate,
    discountType,
    discountPercentage,
    annualAdjustedRate,
    monthlyAdjustedRate,
  };
}
