import type { Pence } from "./money.ts";

export type Nation = "england" | "wales" | "scotland";

export type Band = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I";

export interface Ratio {
  numerator: number;
  denominator: number;
}

const ninths = (n: number): Ratio => ({ numerator: n, denominator: 9 });
const sixtieths = (n: number): Ratio => ({ numerator: n, denominator: 360 });

/**
 * Statutory proportion of the Band D charge payable in each band.
 *
 * - England: Local Government Finance Act 1992, s.5(1). Bands A–H.
 * - Wales: s.5(1A), revalued 2005 with an extra Band I. Bands A–I.
 * - Scotland: Council Tax (Substitution of Proportion) (Scotland) Order 2016.
 *   Bands E–H were raised from 1 April 2017, so they are not the English ninths.
 *
 * Kept as exact fractions so band charges are computed with one rounding step.
 */
const BAND_RATIOS: Record<Nation, Partial<Record<Band, Ratio>>> = {
  england: {
    A: ninths(6),
    B: ninths(7),
    C: ninths(8),
    D: ninths(9),
    E: ninths(11),
    F: ninths(13),
    G: ninths(15),
    H: ninths(18),
  },
  wales: {
    A: ninths(6),
    B: ninths(7),
    C: ninths(8),
    D: ninths(9),
    E: ninths(11),
    F: ninths(13),
    G: ninths(15),
    H: ninths(18),
    I: ninths(21),
  },
  scotland: {
    A: sixtieths(240),
    B: sixtieths(280),
    C: sixtieths(320),
    D: sixtieths(360),
    E: sixtieths(473),
    F: sixtieths(585),
    G: sixtieths(705),
    H: sixtieths(882),
  },
};

export function bandsFor(nation: Nation): Band[] {
  return Object.keys(BAND_RATIOS[nation]) as Band[];
}

export function isBand(nation: Nation, value: string): value is Band {
  return value in BAND_RATIOS[nation];
}

/** Accepts "c", " C ", "Band C". Returns undefined if it is not a band in that nation. */
export function parseBand(nation: Nation, value: string): Band | undefined {
  const cleaned = value.trim().toUpperCase().replace(/^BAND\s+/, "");
  return isBand(nation, cleaned) ? cleaned : undefined;
}

export function bandRatio(nation: Nation, band: Band): Ratio {
  const ratio = BAND_RATIOS[nation][band];
  if (!ratio) {
    throw new RangeError(`Band ${band} does not exist in ${nation}`);
  }
  return ratio;
}

/** Annual charge for a band, before any discount, given the area's Band D charge. */
export function bandCharge(nation: Nation, band: Band, bandD: Pence): Pence {
  const { numerator, denominator } = bandRatio(nation, band);
  return Math.round((bandD * numerator) / denominator);
}
