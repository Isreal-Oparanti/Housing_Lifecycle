import { ExternalLink } from "lucide-react";
import { formatGBP, type AuthoritySummary, type Pence, type Place, type Sourced } from "@truecost/core";
import { displayTaxYear } from "@/lib/check";
import type { CouncilTaxOutcome } from "./model";

/** PRD "Explain": the working behind the number, step by step, with sources. */
export function Explanation({
  place,
  authority,
  bandD,
  taxYear,
  outcome,
}: {
  place: Place;
  authority: AuthoritySummary;
  bandD: Sourced<Pence>;
  taxYear: string;
  outcome: CouncilTaxOutcome;
}) {
  const where = place.postcode ?? place.street ?? `The ${place.outcode} area you chose`;
  const locationSource =
    place.precision === "street" ? "Ordnance Survey road data" : "Office for National Statistics postcode directory";
  const local = authority.nation === "wales" ? "community" : "parish";

  return (
    <section className="mt-10 rounded-3xl bg-white p-6 ring-1 ring-line sm:p-8" aria-labelledby="explanation">
      <h2 id="explanation" className="text-lg font-semibold">
        How we worked this out
      </h2>
      <ol className="mt-5 space-y-4 text-ink-soft">
        <li>
          <strong className="text-ink">{where}</strong> is in {authority.name}
          {place.parish ? `, in ${place.parish} ${local}` : ""}. Source: {locationSource}.
        </li>
        <li>
          {authority.name}&apos;s {displayTaxYear(taxYear)} Band D charge is{" "}
          <strong className="tabular-nums text-ink">{formatGBP(bandD.value)}</strong> a year
          {bandD.confidence === "official" ? ", including every precept." : ", an average across the council."}{" "}
          {bandD.source?.url && (
            <a
              href={bandD.source.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-brand underline-offset-2 hover:underline"
            >
              {bandD.source.publisher}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          )}
        </li>
        {outcome.kind === "charged" && (
          <>
            <li>
              Band {outcome.breakdown.band} pays {outcome.breakdown.ratio.numerator}/{outcome.breakdown.ratio.denominator} of
              Band D: <strong className="tabular-nums text-ink">{formatGBP(outcome.breakdown.annualGross)}</strong> a year.
            </li>
            {outcome.breakdown.annualReduction > 0 && (
              <li>
                Single person discount of 25%:{" "}
                <strong className="tabular-nums text-ink">−{formatGBP(outcome.breakdown.annualReduction)}</strong>.
              </li>
            )}
            <li>
              That&apos;s <strong className="tabular-nums text-ink">{formatGBP(outcome.breakdown.annualNet)}</strong> a
              year, or {formatGBP(outcome.breakdown.monthlyAverage)} a month on average.
            </li>
          </>
        )}
      </ol>
      <p className="mt-5 text-sm text-muted">
        Your actual bill can differ by a few pence because councils round each part of the charge separately.
      </p>
    </section>
  );
}
