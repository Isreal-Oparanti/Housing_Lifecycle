"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { formatGBP, formatGBPWhole, type Pence, type Sourced } from "@truecost/core";
import { displayTaxYear } from "@/lib/check";
import { monthlyCouncilTax, type CouncilTaxOutcome } from "./model";
import { ConfidenceBadge } from "./ui";

export interface SummaryProps {
  authorityName: string;
  taxYear: string;
  isCurrentYear: boolean;
  bandD: Sourced<Pence>;
  outcome: CouncilTaxOutcome;
  rent: Pence | null;
}

/** The headline figure, shared with the mobile bar so both always agree. */
export function headline({ outcome, rent }: Pick<SummaryProps, "outcome" | "rent">): {
  figure: string;
  caption: string;
  isRange?: boolean;
} {
  const councilTax = monthlyCouncilTax(outcome);
  if (councilTax === null && outcome.kind === "needs_band") {
    const base = rent ?? 0;
    return {
      isRange: true,
      figure: `${formatGBPWhole(base + outcome.min)}–${formatGBPWhole(base + outcome.max)}`,
      caption: rent
        ? "a month, depending on the council tax band"
        : "a month in council tax, depending on the band",
    };
  }
  if (rent === null) {
    return {
      figure: formatGBP(councilTax ?? 0),
      caption:
        outcome.kind === "landlord"
          ? "council tax, as the landlord usually pays it. Add the rent for your total"
          : "a month in council tax. Add the rent for your total",
    };
  }
  return {
    figure: formatGBP(rent + (councilTax ?? 0)),
    caption: outcome.kind === "landlord" ? "a month in rent. Council tax is usually the landlord's" : "a month, rent plus council tax",
  };
}

function Line({ label, detail, value }: { label: string; detail?: ReactNode; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-6 py-4 sm:px-7">
      <div className="min-w-0">
        <dt className="font-semibold">{label}</dt>
        {detail && <dd className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">{detail}</dd>}
      </div>
      <dd className="shrink-0 text-right font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function councilTaxLine(outcome: CouncilTaxOutcome, authorityName: string, bandD: Sourced<Pence>) {
  switch (outcome.kind) {
    case "charged": {
      const { band, relief } = outcome.breakdown;
      return {
        value: formatGBP(outcome.breakdown.monthlyAverage),
        detail: (
          <>
            <span>
              {authorityName}, Band {band}
              {relief.kind === "single_person_discount" && ", 25% off"}
            </span>
            <ConfidenceBadge confidence={bandD.confidence} />
          </>
        ),
      };
    }
    case "exempt":
      return { value: formatGBP(0), detail: <span>Full-time students are exempt</span> };
    case "landlord":
      return { value: <span className="text-muted">Not included</span>, detail: <span>Usually paid by the landlord</span> };
    case "needs_band":
      return {
        value: `${formatGBPWhole(outcome.min)}–${formatGBPWhole(outcome.max)}`,
        detail: (
          <a href="#panel-1" className="font-semibold text-brand hover:underline">
            Choose the band
          </a>
        ),
      };
  }
}

export function Summary(props: SummaryProps) {
  const { authorityName, taxYear, isCurrentYear, bandD, outcome, rent } = props;
  const { figure, caption, isRange } = headline(props);
  const ct = councilTaxLine(outcome, authorityName, bandD);
  const councilTax = monthlyCouncilTax(outcome);

  return (
    <section id="summary" aria-label="Monthly cost" className="scroll-mt-24 overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-line">
      <div className="p-6 sm:p-7">
        <div className="flex items-baseline justify-between text-xs font-semibold uppercase tracking-wider text-muted">
          <span>Monthly cost</span>
          <span>{displayTaxYear(taxYear)} rates</span>
        </div>
        <p
          className={`mt-3 whitespace-nowrap font-bold leading-none tracking-tight tabular-nums ${
            isRange ? "text-[2rem] sm:text-4xl" : "text-[2.6rem] sm:text-5xl"
          }`}
          aria-live="polite"
        >
          {figure}
        </p>
        <p className="mt-2 text-sm text-muted">{caption}</p>
      </div>

      <dl className="divide-y divide-line border-t border-line">
        <Line
          label="Rent"
          detail={rent !== null ? <ConfidenceBadge confidence="user_provided" /> : undefined}
          value={
            rent !== null ? (
              formatGBP(rent)
            ) : (
              <a href="#panel-3" className="text-brand hover:underline">
                Add rent
              </a>
            )
          }
        />
        <Line label="Council tax" detail={ct.detail} value={ct.value} />
        {rent !== null && councilTax !== null && (
          <div className="flex items-center justify-between bg-canvas/60 px-6 py-4 sm:px-7">
            <dt className="font-semibold">Total a month</dt>
            <dd className="text-lg font-bold tabular-nums">{formatGBP(rent + councilTax)}</dd>
          </div>
        )}
      </dl>

      <div className="space-y-3 border-t border-line p-6 text-sm leading-relaxed text-ink-soft sm:p-7">
        {!isCurrentYear && (
          <p className="flex gap-2 text-estimate">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            These are {displayTaxYear(taxYear)} rates. This year&apos;s haven&apos;t been loaded yet, so the bill will
            likely be higher.
          </p>
        )}
        {outcome.kind === "charged" && outcome.breakdown.annualNet > 0 && (
          <p>
            Councils usually bill in 10 monthly payments, April to January, so expect about{" "}
            <strong className="tabular-nums">{formatGBP(outcome.breakdown.tenMonthInstalment)}</strong> a month. You
            can ask to spread it over 12.
          </p>
        )}
        {outcome.kind === "charged" && outcome.breakdown.relief.kind === "single_person_discount" && (
          <p>The single person discount isn&apos;t automatic. Claim it from {authorityName} council when you move in.</p>
        )}
        {outcome.kind === "exempt" && (
          <p>Tell {authorityName} council you&apos;re all students and send proof from your university to get the exemption.</p>
        )}
        {outcome.kind === "landlord" && (
          <p>
            If you rent a room on its own tenancy in a shared house, the landlord is normally responsible for council
            tax. Check your tenancy agreement to be sure.
          </p>
        )}
        {bandD.note && outcome.kind !== "landlord" && outcome.kind !== "exempt" && <p>{bandD.note}</p>}
        <p className="text-muted">Not included yet: energy, water and broadband.</p>
      </div>
    </section>
  );
}

/** Keeps the total in view on phones once the summary card has scrolled away. */
export function MobileTotalBar(props: Pick<SummaryProps, "outcome" | "rent">) {
  const { figure, caption } = headline(props);
  const [summaryVisible, setSummaryVisible] = useState(true);

  useEffect(() => {
    const summary = document.getElementById("summary");
    if (!summary) return;
    const observer = new IntersectionObserver(([entry]) => setSummaryVisible(entry.isIntersecting));
    observer.observe(summary);
    return () => observer.disconnect();
  }, []);

  if (summaryVisible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
      <a href="#summary" className="flex items-center justify-between gap-4">
        <span className="min-w-0">
          <span className="block text-xl font-bold tabular-nums leading-tight">{figure}</span>
          <span className="block truncate text-xs text-muted">{caption}</span>
        </span>
        <span className="shrink-0 rounded-xl bg-brand-soft px-3 py-2 text-sm font-semibold text-brand-strong">Breakdown</span>
      </a>
    </div>
  );
}
