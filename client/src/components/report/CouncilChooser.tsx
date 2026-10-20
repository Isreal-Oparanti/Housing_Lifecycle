"use client";

import { ArrowRight } from "lucide-react";
import { bandCharge, formatGBP, parseBand, placeLabel, type CouncilOption, type Place } from "@truecost/core";
import { ConfidenceBadge } from "./ui";

/**
 * An outward code like E8 can cover several councils with very different
 * council tax. This is the PRD's boundary problem made visible: show the
 * spread, then ask for the full postcode or the council.
 */
export function CouncilChooser({
  place,
  options,
  otherAreas,
  band,
  onChoose,
}: {
  place: Place;
  options: CouncilOption[];
  otherAreas: string[];
  band: string;
  onChoose: (gssCode: string) => void;
}) {
  const priced = options
    .map((option) => {
      const nation = option.authority.nation;
      const chosenBand = parseBand(nation, band) ?? "D";
      return { ...option, band: chosenBand, monthly: Math.round(bandCharge(nation, chosenBand, option.bandD.value) / 12) };
    })
    .sort((a, b) => a.monthly - b.monthly);
  const spread = priced.length > 1 ? priced[priced.length - 1].monthly - priced[0].monthly : 0;

  return (
    <section className="mt-8 space-y-5">
      <div className="space-y-2">
        <h1 className="font-display text-3xl tracking-tight sm:text-4xl">
          {place.precision === "street"
            ? `${placeLabel(place)} passes through ${options.length + otherAreas.length} councils`
            : `${placeLabel(place)} covers parts of ${options.length + otherAreas.length} councils`}
        </h1>
        <p className="max-w-[60ch] text-ink-soft">
          Council tax depends on which side of the boundary the home is
          {spread > 0 && (
            <>
              , and here that&apos;s a difference of up to <strong className="tabular-nums">{formatGBP(spread)}</strong> a
              month
            </>
          )}
          . Enter the full postcode above, or choose the council if you know it.
        </p>
      </div>

      <ul className="divide-y divide-line overflow-hidden rounded-3xl bg-white ring-1 ring-line">
        {priced.map((option) => (
          <li key={option.authority.gssCode}>
            <button
              type="button"
              onClick={() => onChoose(option.authority.gssCode)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-brand-soft/50 sm:px-6"
            >
              <span className="min-w-0">
                <span className="block font-semibold">{option.authority.name}</span>
                <span className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                  Band {option.band}, {formatGBP(option.monthly)} a month
                  <ConfidenceBadge confidence={option.bandD.confidence} />
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-brand">
                This one <ArrowRight className="h-4 w-4" aria-hidden />
              </span>
            </button>
          </li>
        ))}
      </ul>

      {otherAreas.length > 0 && (
        <p className="text-sm text-muted">
          {placeLabel(place)} also {place.precision === "street" ? "passes through" : "covers"} {otherAreas.join(", ")},
          which TrueCost doesn&apos;t cover yet.
        </p>
      )}
    </section>
  );
}
