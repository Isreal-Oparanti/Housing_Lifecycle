/**
 * Money is held as integer pence everywhere in TrueCost. Floating-point pounds
 * drift (1549.79 * 100 === 154978.99999999997), and a cost tool that is off by a
 * penny looks broken. Convert at the edges only: when reading source data and
 * when formatting for display.
 */
export type Pence = number;

export function poundsToPence(pounds: number): Pence {
  if (!Number.isFinite(pounds)) {
    throw new RangeError(`Cannot convert ${pounds} to pence`);
  }
  return Math.round(pounds * 100);
}

export function penceToPounds(pence: Pence): number {
  return pence / 100;
}

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});

const gbpWhole = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

/** £1,234.56 */
export function formatGBP(pence: Pence): string {
  return gbp.format(pence / 100);
}

/** £1,235 (rounded to the nearest pound, for headline figures) */
export function formatGBPWhole(pence: Pence): string {
  return gbpWhole.format(Math.round(pence / 100));
}

/** £50 for whole pounds, £24.88 otherwise. For amounts inside sentences. */
export function formatGBPCompact(pence: Pence): string {
  return pence % 100 === 0 ? gbpWhole.format(pence / 100) : gbp.format(pence / 100);
}
