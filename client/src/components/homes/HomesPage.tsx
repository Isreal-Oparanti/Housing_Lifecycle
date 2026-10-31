"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { ArrowRight, Info, Sparkles } from "lucide-react";
import { formatGBPCompact, rankHomes } from "@truecost/core";
import { getRatesYear, lookup } from "@/lib/api";
import { displayTaxYear } from "@/lib/check";
import { comparableHome } from "@/lib/homeCosts";
import { getSavedHomes, setSavedHomes, useSavedHomes, withHomeUpdated, type SavedHome } from "@/lib/savedHomes";
import { CompareTable } from "./CompareTable";
import { HomeCard } from "./HomeCard";

const MAX_COMPARE = 3;
const noopSubscribe = () => () => {};

/** False during server rendering and hydration, so we don't flash "no homes" before storage is read. */
function useHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

/**
 * Saved homes carry a snapshot of their council's rates. When the API has a
 * newer tax year loaded, look each stale home up again, one at a time.
 */
function useRatesRefresh(homes: SavedHome[], enabled: boolean) {
  const [year, setYear] = useState<string | null>(null);
  const [yearFailed, setYearFailed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    getRatesYear(controller.signal)
      .then(setYear)
      .catch(() => {
        if (!controller.signal.aborted) setYearFailed(true);
      });
    return () => controller.abort();
  }, [enabled]);

  const stale = year ? homes.filter((home) => home.snapshot.taxYear !== year && !errors[home.id]) : [];
  const nextId = stale[0]?.id;

  useEffect(() => {
    if (!nextId || !year) return;
    const home = getSavedHomes().find((saved) => saved.id === nextId);
    if (!home) return;
    const fail = (message: string) => setErrors((current) => ({ ...current, [home.id]: message }));
    const controller = new AbortController();
    lookup(home.check.q, home.check.authority || undefined, controller.signal)
      .then((data) => {
        if (data.status !== "resolved" || data.taxYear !== year) {
          fail("We couldn't update this home to this year's rates. Open it to check the address.");
          return;
        }
        setSavedHomes(
          withHomeUpdated(getSavedHomes(), home.id, {
            check: { ...home.check, authority: data.authority.gssCode },
            snapshot: { place: data.place, authority: data.authority, bandD: data.bandD, taxYear: data.taxYear },
          }),
        );
      })
      .catch(() => {
        if (!controller.signal.aborted) fail("We couldn't update this home's rates right now.");
      });
    return () => controller.abort();
  }, [nextId, year]);

  return { year, yearFailed, errors, updating: stale.length };
}

export function HomesPage() {
  const hydrated = useHydrated();
  const homes = useSavedHomes();
  const { year, yearFailed, errors, updating } = useRatesRefresh(homes, hydrated);
  const [chosen, setChosen] = useState<string[] | null>(null);
  const [compareNote, setCompareNote] = useState<string | null>(null);

  const comparison = useMemo(() => rankHomes(homes.map(comparableHome)), [homes]);
  const byId = useMemo(() => new Map(homes.map((home) => [home.id, home])), [homes]);
  const rankedById = useMemo(() => new Map(comparison.ranked.map((ranked) => [ranked.id, ranked])), [comparison]);

  // Until the renter picks, compare the three cheapest complete homes.
  const defaultSelection = comparison.ranked.filter((r) => r.rank !== null).slice(0, MAX_COMPARE).map((r) => r.id);
  const selected = (chosen ?? defaultSelection).filter((id) => byId.has(id));
  const selectedHomes = comparison.ranked.filter((r) => selected.includes(r.id)).map((r) => byId.get(r.id)!);

  function toggleCompare(id: string) {
    const current = chosen ?? defaultSelection;
    if (current.includes(id)) {
      setChosen(current.filter((selectedId) => selectedId !== id));
      setCompareNote(null);
    } else if (current.length >= MAX_COMPARE) {
      setCompareNote(`You can compare up to ${MAX_COMPARE} homes at a time. Untick one first.`);
    } else {
      setChosen([...current, id]);
      setCompareNote(null);
    }
  }

  if (!hydrated) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6" aria-busy="true">
        <div className="h-10 w-56 animate-pulse rounded-lg bg-line" />
      </main>
    );
  }

  if (homes.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <h1 className="font-display text-4xl tracking-tight">Your homes</h1>
        <p className="mt-4 text-lg text-ink-soft">
          Save the homes on your shortlist and see them ranked by what they really cost each month, not just the rent.
        </p>
        <Link
          href="/#check"
          className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-strong"
        >
          Check a home <ArrowRight className="h-5 w-5" aria-hidden />
        </Link>
        <p className="mt-4 text-sm text-muted">On a home&apos;s results, press &ldquo;Save this home&rdquo;.</p>
      </main>
    );
  }

  const insight = comparison.insight;
  const cheaper = insight && byId.get(insight.cheaperId);
  const dearer = insight && byId.get(insight.dearerId);
  const savedYears = [...new Set(homes.map((home) => displayTaxYear(home.snapshot.taxYear)))].join(", ");

  return (
    <main className="mx-auto max-w-4xl px-4 pb-20 pt-8 sm:px-6 lg:pt-12">
      <header>
        <h1 className="font-display text-4xl tracking-tight sm:text-5xl">Your homes</h1>
        <p className="mt-3 text-ink-soft">
          Ranked by real monthly cost: rent plus council tax{year ? `, at ${displayTaxYear(year)} rates` : ""}.
        </p>
      </header>

      {updating > 0 && (
        <p className="mt-6 flex items-center gap-2 rounded-2xl bg-brand-soft p-4 text-sm text-brand-strong" role="status">
          <Info className="h-4 w-4 shrink-0" aria-hidden /> Updating {updating} {updating === 1 ? "home" : "homes"} to{" "}
          {year && displayTaxYear(year)} rates…
        </p>
      )}
      {yearFailed && (
        <p className="mt-6 flex items-center gap-2 rounded-2xl bg-estimate-soft p-4 text-sm text-estimate" role="status">
          <Info className="h-4 w-4 shrink-0" aria-hidden /> We couldn&apos;t check for newer council tax rates, so these use
          the rates saved with each home ({savedYears}).
        </p>
      )}

      {insight && cheaper && dearer && (
        <section className="mt-6 flex gap-3 rounded-3xl bg-brand-soft p-5 text-brand-strong" aria-label="What the rent hides">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <p>
            <strong>{cheaper.name}</strong> costs <strong className="tabular-nums">{formatGBPCompact(insight.monthlySaving)}</strong> a
            month less than <strong>{dearer.name}</strong>, even though its rent is{" "}
            <span className="tabular-nums">{formatGBPCompact(insight.extraRent)}</span> higher. That&apos;s{" "}
            <span className="tabular-nums">{formatGBPCompact(insight.monthlySaving * 12)}</span> a year.
          </p>
        </section>
      )}

      <ol className="mt-6 space-y-4" aria-label="Saved homes, cheapest first">
        {comparison.ranked.map((ranked) => {
          const home = byId.get(ranked.id)!;
          return (
            <HomeCard
              key={home.id}
              home={home}
              ranked={ranked}
              selected={selected.includes(home.id)}
              onToggleCompare={() => toggleCompare(home.id)}
              refreshError={errors[home.id]}
            />
          );
        })}
      </ol>
      {compareNote && (
        <p className="mt-3 text-sm text-estimate" role="status">
          {compareNote}
        </p>
      )}

      {selectedHomes.length >= 2 && (
        <section className="mt-12" aria-labelledby="compare-heading">
          <h2 id="compare-heading" className="font-display text-2xl tracking-tight">
            Side by side
          </h2>
          <p className="mb-4 mt-1 text-sm text-muted">
            Tick &ldquo;Compare&rdquo; on up to {MAX_COMPARE} homes.
            <span className="sm:hidden"> Swipe the table sideways to see them all.</span>
          </p>
          <CompareTable homes={selectedHomes} ranked={rankedById} />
        </section>
      )}

      <p className="mt-10 text-sm text-muted">
        Saved on this device only; clearing your browser data removes them. Not included yet: energy, water and broadband.
      </p>
    </main>
  );
}
