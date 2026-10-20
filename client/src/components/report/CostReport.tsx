"use client";

import { useEffect, useMemo, useState } from "react";
import { RotateCw } from "lucide-react";
import { bandsFor, parseBand, placeLabel, type LookupResponse } from "@truecost/core";
import { lookup } from "@/lib/api";
import { checkHref, parseRent, type CheckParams } from "@/lib/check";
import { BandPicker } from "./BandPicker";
import { CouncilChooser } from "./CouncilChooser";
import { Explanation } from "./Explanation";
import { HouseholdPicker } from "./HouseholdPicker";
import { councilTaxOutcome, monthlyByBand } from "./model";
import { SearchBar } from "./SearchBar";
import { MobileTotalBar, Summary } from "./Summary";
import { Notice, Panel } from "./ui";

type LookupState =
  | { kind: "empty" }
  | { kind: "loading" }
  | { kind: "ready"; data: LookupResponse }
  | { kind: "error"; message: string };

function useLookup(query: string, authority: string, attempt: number): LookupState {
  const [state, setState] = useState<LookupState>(query ? { kind: "loading" } : { kind: "empty" });

  useEffect(() => {
    if (!query) {
      setState({ kind: "empty" });
      return;
    }
    const controller = new AbortController();
    setState({ kind: "loading" });
    lookup(query, authority || undefined, controller.signal)
      .then((data) => setState({ kind: "ready", data }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ kind: "error", message: error instanceof Error ? error.message : String(error) });
      });
    return () => controller.abort();
  }, [query, authority, attempt]);

  return state;
}

export function CostReport({ initial }: { initial: CheckParams }) {
  const [params, setParams] = useState(initial);
  const [attempt, setAttempt] = useState(0);
  const state = useLookup(params.q, params.authority, attempt);
  const update = (patch: Partial<CheckParams>) => setParams((current) => ({ ...current, ...patch }));

  // Keep the URL in step so the check can be refreshed, bookmarked or shared.
  useEffect(() => {
    window.history.replaceState(null, "", checkHref(params));
  }, [params]);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-32 pt-6 sm:px-6 lg:pb-20 lg:pt-10">
      <div className="max-w-xl">
        <SearchBar key={params.q} value={params.q} onSearch={(q) => update({ q, authority: "" })} />
      </div>

      {state.kind === "empty" && (
        <div className="mt-8 max-w-xl">
          <Notice tone="info" title="Enter a postcode to start">
            <p>Use the postcode from the listing, or the end of its address, like &ldquo;Mare Street, E8&rdquo;.</p>
          </Notice>
        </div>
      )}

      {state.kind === "loading" && <LoadingReport />}

      {state.kind === "error" && (
        <div className="mt-8 max-w-xl">
          <Notice tone="warn" title="Something went wrong">
            <p>{state.message}</p>
            <button
              type="button"
              onClick={() => setAttempt((n) => n + 1)}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 font-semibold text-ink ring-1 ring-line"
            >
              <RotateCw className="h-4 w-4" aria-hidden /> Try again
            </button>
          </Notice>
        </div>
      )}

      {state.kind === "ready" && <Result data={state.data} params={params} update={update} />}
    </main>
  );
}

function Result({
  data,
  params,
  update,
}: {
  data: LookupResponse;
  params: CheckParams;
  update: (patch: Partial<CheckParams>) => void;
}) {
  const resolved = data.status === "resolved" ? data : null;
  const nation = resolved?.authority.nation ?? "england";
  const bandD = resolved?.bandD.value ?? 0;
  const band = resolved ? parseBand(nation, params.band) : undefined;
  const rent = parseRent(params.rent);
  const bandCosts = useMemo(() => (resolved ? monthlyByBand(nation, bandD, params.who) : {}), [resolved, nation, bandD, params.who]);

  if (data.status === "invalid" || data.status === "not_found") {
    return (
      <div className="mt-8 max-w-xl">
        <Notice tone="warn" title="We couldn't find that place">
          <p>{data.message}</p>
        </Notice>
      </div>
    );
  }

  if (data.status === "unsupported") {
    return (
      <div className="mt-8 max-w-xl">
        <Notice tone="info" title={`${placeLabel(data.place)} isn't covered yet`}>
          <p>{data.message}</p>
        </Notice>
      </div>
    );
  }

  if (data.status === "multiple_councils") {
    return (
      <CouncilChooser
        place={data.place}
        options={data.options}
        otherAreas={data.otherAreas}
        band={params.band}
        onChoose={(authority) => update({ authority })}
      />
    );
  }

  const { place, authority } = data;
  const outcome = councilTaxOutcome(nation, bandD, band, params.who);
  const local = nation === "wales" ? "community" : "parish";

  return (
    <>
      <header className="mt-8">
        <p className="text-sm font-medium text-muted">
          {{ postcode: "Postcode", outcode: "Postcode area", street: "Street" }[place.precision]}
        </p>
        <h1 className="font-display text-4xl tracking-tight sm:text-5xl">{placeLabel(place)}</h1>
        <p className="mt-2 text-ink-soft">
          {authority.name} council
          {place.parish ? `, ${place.parish} ${local}` : ""} · {nation === "wales" ? "Wales" : "England"}
        </p>
        {place.precision === "outcode" && (
          <p className="mt-3 max-w-xl text-sm text-muted">
            Based on the {place.outcode} area and the council you chose. Add the full postcode for an exact match.
          </p>
        )}
        {place.precision === "street" && (
          <p className="mt-3 max-w-xl text-sm text-muted">
            Found from the street name{place.outcode ? ` (${place.outcode})` : ""}. Add the full postcode if you have it.
          </p>
        )}
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
        <div className="lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1">
          <Summary
            authorityName={authority.name}
            taxYear={data.taxYear}
            isCurrentYear={data.isCurrentYear}
            bandD={data.bandD}
            outcome={outcome}
            rent={rent}
          />
        </div>

        <div className="space-y-5 lg:col-start-1 lg:row-start-1">
          <Panel
            step={1}
            highlight={outcome.kind === "needs_band"}
            title="Council tax band"
            description="It's on the listing, usually under “Council tax”. Each band shows its monthly cost here."
          >
            <BandPicker
              bands={bandsFor(nation)}
              value={band}
              monthlyByBand={bandCosts}
              postcode={place.postcode}
              onChange={(value) => update({ band: value })}
            />
          </Panel>

          <Panel step={2} title="Who's living there?" description="Discounts depend on who counts as a resident.">
            <HouseholdPicker value={params.who} onChange={(who) => update({ who })} />
          </Panel>

          <Panel step={3} title="Monthly rent">
            <div className="relative max-w-xs">
              <label htmlFor="rent" className="sr-only">
                Monthly rent in pounds
              </label>
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-muted">£</span>
              <input
                id="rent"
                value={params.rent}
                onChange={(event) => update({ rent: event.target.value })}
                inputMode="decimal"
                placeholder="1,500"
                className="h-12 w-full rounded-2xl border border-line bg-canvas/50 pl-9 pr-24 text-lg font-semibold tabular-nums focus:border-brand focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand/10"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">per month</span>
            </div>
            {params.rent && rent === null && (
              <p className="mt-2 text-sm text-estimate">Enter the monthly rent as a number, like 1,500.</p>
            )}
          </Panel>
        </div>
      </div>

      <Explanation place={place} authority={authority} bandD={data.bandD} taxYear={data.taxYear} outcome={outcome} />
      <MobileTotalBar outcome={outcome} rent={rent} />
    </>
  );
}

function LoadingReport() {
  return (
    <div className="mt-8 animate-pulse" aria-busy="true" aria-label="Looking up the postcode">
      <div className="h-4 w-24 rounded bg-line" />
      <div className="mt-3 h-10 w-48 rounded-lg bg-line" />
      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="h-64 rounded-3xl bg-white ring-1 ring-line lg:col-start-2" />
        <div className="h-64 rounded-3xl bg-white ring-1 ring-line lg:col-start-1 lg:row-start-1" />
      </div>
    </div>
  );
}
