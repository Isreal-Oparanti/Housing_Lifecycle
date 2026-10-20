"use client";

import { useEffect, useState } from "react";
import { formatGBP, formatGBPWhole, type Pence } from "@truecost/core";
import { getAuthority } from "@/lib/api";
import { displayTaxYear } from "@/lib/check";

// Fitzrovia is split between these two councils along Cleveland Street.
const PAIR = [
  { code: "E09000033", side: "West of Cleveland Street" },
  { code: "E09000007", side: "East of Cleveland Street" },
] as const;

interface Side {
  name: string;
  side: string;
  monthly: Pence;
}

/**
 * Live figures from the API rather than hard-coded numbers, so the example
 * can't go stale when the tax year changes. Renders nothing if the API is down.
 */
export function BoundaryExample() {
  const [sides, setSides] = useState<Side[] | null>(null);
  const [taxYear, setTaxYear] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    Promise.all(PAIR.map((p) => getAuthority(p.code, controller.signal)))
      .then((details) => {
        setTaxYear(details[0].taxYear);
        setSides(
          details.map((d, i) => ({
            name: d.authority.name,
            side: PAIR[i].side,
            monthly: Math.round(d.bandD.value / 12),
          })),
        );
      })
      .catch(() => setSides(null));
    return () => controller.abort();
  }, []);

  if (!sides) return null;

  const [low, high] = [...sides].sort((a, b) => a.monthly - b.monthly);
  const yearlyGap = (high.monthly - low.monthly) * 12;

  return (
    <section className="border-y border-line bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:py-20">
        <div className="space-y-4">
          <p className="text-sm font-semibold text-brand">Why it matters</p>
          <h2 className="font-display text-3xl leading-tight tracking-tight sm:text-4xl">
            Cross one street and the bill changes by {formatGBPWhole(yearlyGap)} a year.
          </h2>
          <p className="max-w-[48ch] text-ink-soft">
            Fitzrovia in central London is split between two councils. Two identical flats a few doors apart, at the
            same rent, pay very different council tax. Listings don&apos;t tell you this. TrueCost does.
          </p>
        </div>

        <div className="rounded-3xl bg-canvas p-5 ring-1 ring-line sm:p-7">
          <div className="flex items-baseline justify-between text-xs font-semibold uppercase tracking-wider text-muted">
            <span>Average Band D council tax</span>
            <span>{displayTaxYear(taxYear)}</span>
          </div>
          <div className="mt-5 space-y-5">
            {sides.map((s) => (
              <div key={s.name}>
                <div className="flex items-baseline justify-between gap-4">
                  <div>
                    <p className="font-semibold">{s.name}</p>
                    <p className="text-sm text-muted">{s.side}</p>
                  </div>
                  <p className="text-xl font-bold tabular-nums">
                    {formatGBP(s.monthly)}
                    <span className="text-sm font-medium text-muted"> /mo</span>
                  </p>
                </div>
                <div className="mt-2 h-2.5 rounded-full bg-line">
                  <div
                    className={`h-2.5 rounded-full ${s === high ? "bg-brand" : "bg-brand/40"}`}
                    style={{ width: `${(s.monthly / high.monthly) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 rounded-2xl bg-brand-soft px-4 py-3 text-sm text-brand-strong">
            Same rent, same band: <strong className="tabular-nums">{formatGBP(high.monthly - low.monthly)}</strong> a
            month more in {high.name}.
          </p>
        </div>
      </div>
    </section>
  );
}
