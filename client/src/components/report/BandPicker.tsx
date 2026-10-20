"use client";

import { ExternalLink } from "lucide-react";
import { formatGBPWhole, type Band, type Pence } from "@truecost/core";

const GOV_UK_BAND_CHECK = "https://www.tax.service.gov.uk/check-council-tax-band/search";

export function BandPicker({
  bands,
  value,
  monthlyByBand,
  postcode,
  onChange,
}: {
  bands: Band[];
  value: Band | undefined;
  /** What each band would cost this household a month. */
  monthlyByBand: Record<string, Pence>;
  postcode?: string;
  onChange: (band: Band) => void;
}) {
  const columns = bands.length === 9 ? "grid-cols-3 sm:grid-cols-9" : "grid-cols-4 sm:grid-cols-8";

  return (
    <div className="space-y-4">
      <div role="radiogroup" aria-label="Council tax band" className={`grid gap-2 ${columns}`}>
        {bands.map((band) => (
          <label
            key={band}
            className="cursor-pointer rounded-2xl border border-line bg-canvas/50 px-2 py-3 text-center transition-colors hover:border-brand-line has-checked:border-brand has-checked:bg-brand-soft has-focus-visible:ring-4 has-focus-visible:ring-brand/20"
          >
            <input
              type="radio"
              name="band"
              value={band}
              checked={value === band}
              onChange={() => onChange(band)}
              className="sr-only"
            />
            <span className="block text-xl font-bold leading-none">{band}</span>
            <span className="mt-1.5 block text-xs tabular-nums text-muted">{formatGBPWhole(monthlyByBand[band])}</span>
          </label>
        ))}
      </div>
      <p className="text-sm text-muted">
        Not on the listing?{" "}
        <a
          href={GOV_UK_BAND_CHECK}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-semibold text-brand underline-offset-2 hover:underline"
        >
          Look it up on GOV.UK
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </a>
        . Search for {postcode ?? "the postcode"} and pick the address.
      </p>
    </div>
  );
}
