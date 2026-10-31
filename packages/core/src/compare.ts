import type { Pence } from "./money.ts";

/**
 * A saved home reduced to what comparison needs. Null means "not known yet":
 * no rent entered, or no band chosen so council tax can't be worked out.
 */
export interface ComparableHome {
  id: string;
  rent: Pence | null;
  /** Monthly costs on top of rent (council tax today, energy later). */
  extras: Pence | null;
}

export interface RankedHome {
  id: string;
  /** Rent plus extras; null while anything is missing. */
  total: Pence | null;
  /** 1 is the cheapest real monthly cost. Null for incomplete homes. */
  rank: number | null;
  /** Where the home would sit if you went by advertised rent alone. */
  rentRank: number | null;
  /** How much more a month than the cheapest complete home. */
  aboveCheapest: Pence | null;
}

/**
 * The point of comparing: the home with the lowest rent isn't always the
 * cheapest to live in. Present only when that happens.
 */
export interface HiddenCostInsight {
  /** Cheapest by real monthly cost, despite a higher rent. */
  cheaperId: string;
  /** Lowest rent, but more expensive once everything is added. */
  dearerId: string;
  /** How much less a month the cheaper home really costs. */
  monthlySaving: Pence;
  /** How much more rent the cheaper home asks. */
  extraRent: Pence;
}

export interface Comparison {
  /** Complete homes cheapest first, then incomplete homes in their original order. */
  ranked: RankedHome[];
  insight: HiddenCostInsight | null;
}

interface Complete {
  id: string;
  rent: Pence;
  total: Pence;
  index: number;
}

export function rankHomes(homes: ComparableHome[]): Comparison {
  const complete: Complete[] = homes.flatMap((home, index) =>
    home.rent !== null && home.extras !== null ? [{ id: home.id, rent: home.rent, total: home.rent + home.extras, index }] : [],
  );

  // Ties keep the renter's own order, so equal homes don't jump around.
  const byTotal = [...complete].sort((a, b) => a.total - b.total || a.rent - b.rent || a.index - b.index);
  const byRent = [...complete].sort((a, b) => a.rent - b.rent || a.total - b.total || a.index - b.index);
  const rentRank = new Map(byRent.map((home, i) => [home.id, i + 1]));
  const cheapest = byTotal[0]?.total ?? null;

  const ranked: RankedHome[] = [
    ...byTotal.map((home, i) => ({
      id: home.id,
      total: home.total,
      rank: i + 1,
      rentRank: rentRank.get(home.id) ?? null,
      aboveCheapest: cheapest === null ? null : home.total - cheapest,
    })),
    ...homes
      .filter((home) => home.rent === null || home.extras === null)
      .map((home) => ({ id: home.id, total: null, rank: null, rentRank: null, aboveCheapest: null })),
  ];

  const cheapestByTotal = byTotal[0];
  const cheapestByRent = byRent[0];
  const insight =
    cheapestByTotal && cheapestByRent && cheapestByTotal.id !== cheapestByRent.id && cheapestByTotal.rent > cheapestByRent.rent
      ? {
          cheaperId: cheapestByTotal.id,
          dearerId: cheapestByRent.id,
          monthlySaving: cheapestByRent.total - cheapestByTotal.total,
          extraRent: cheapestByTotal.rent - cheapestByRent.rent,
        }
      : null;

  return { ranked, insight };
}
