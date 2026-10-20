import { bandCharge, bandRatio, type Band, type Nation, type Ratio } from "./bands.ts";
import { reliefFor, type CouncilTaxRelief, type Household } from "./household.ts";
import type { Pence } from "./money.ts";

export interface CouncilTaxInput {
  nation: Nation;
  band: Band;
  /** Annual Band D charge for the area with every precept included, before discounts. */
  bandD: Pence;
  household: Household;
}

export interface CouncilTaxBreakdown {
  nation: Nation;
  band: Band;
  bandD: Pence;
  ratio: Ratio;
  /** Full annual charge for this band before any discount. */
  annualGross: Pence;
  relief: CouncilTaxRelief;
  annualReduction: Pence;
  /** What the household pays over the year. */
  annualNet: Pence;
  /** annualNet spread over 12 months. The figure to budget with. */
  monthlyAverage: Pence;
  /**
   * Councils bill in 10 monthly instalments (April to January) unless the
   * resident asks for 12, so the bill that arrives is larger than the
   * monthly average. Approximate: councils round instalments differently.
   */
  tenMonthInstalment: Pence;
}

export function calculateCouncilTax(input: CouncilTaxInput): CouncilTaxBreakdown {
  const { nation, band, bandD, household } = input;
  if (!Number.isInteger(bandD) || bandD <= 0) {
    throw new RangeError("Band D charge must be a positive whole number of pence");
  }

  const annualGross = bandCharge(nation, band, bandD);
  const relief = reliefFor(household);
  const annualReduction = Math.round((annualGross * relief.percent) / 100);
  const annualNet = annualGross - annualReduction;

  return {
    nation,
    band,
    bandD,
    ratio: bandRatio(nation, band),
    annualGross,
    relief,
    annualReduction,
    annualNet,
    monthlyAverage: Math.round(annualNet / 12),
    tenMonthInstalment: Math.round(annualNet / 10),
  };
}
