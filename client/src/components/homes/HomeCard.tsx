"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ExternalLink } from "lucide-react";
import { formatGBP, type RankedHome } from "@truecost/core";
import { ConfidenceBadge } from "@/components/report/ui";
import { OCCUPANCY_LABELS, checkHref, parseRent } from "@/lib/check";
import { savedHomeCouncilTax } from "@/lib/homeCosts";
import {
  cleanListingUrl,
  getSavedHomes,
  setSavedHomes,
  withHomeUpdated,
  withoutHome,
  type SavedHome,
} from "@/lib/savedHomes";
import { councilTaxText } from "./costLabels";

export function HomeCard({
  home,
  ranked,
  selected,
  onToggleCompare,
  refreshError,
}: {
  home: SavedHome;
  ranked: RankedHome;
  selected: boolean;
  onToggleCompare: () => void;
  refreshError?: string;
}) {
  const [mode, setMode] = useState<"view" | "edit" | "confirm-remove">("view");
  const [name, setName] = useState(home.name);
  const [listing, setListing] = useState(home.listingUrl);
  const [error, setError] = useState<string | null>(null);

  const rent = parseRent(home.check.rent);
  const councilTax = councilTaxText(savedHomeCouncilTax(home));
  const openHref = checkHref({ ...home.check, saved: home.id });
  const { authority, place, bandD } = home.snapshot;

  function saveEdit(event: FormEvent) {
    event.preventDefault();
    if (listing.trim() && !cleanListingUrl(listing)) {
      setError("That doesn't look like a web link.");
      return;
    }
    setSavedHomes(
      withHomeUpdated(getSavedHomes(), home.id, {
        name: name.trim() || home.name,
        listingUrl: cleanListingUrl(listing),
      }),
    );
    setMode("view");
  }

  return (
    <li className="rounded-3xl bg-white p-5 ring-1 ring-line sm:p-6">
      <div className="flex items-start gap-4">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
            ranked.rank === 1 ? "bg-official text-white" : ranked.rank ? "bg-ink text-white" : "bg-line text-muted"
          }`}
          aria-label={ranked.rank ? `Ranked ${ranked.rank}` : "Not ranked yet"}
        >
          {ranked.rank ?? "–"}
        </span>

        <div className="min-w-0 flex-1">
          {mode === "edit" ? (
            <form onSubmit={saveEdit} className="space-y-3" noValidate>
              <input
                aria-label="Name"
                value={name}
                maxLength={80}
                onChange={(event) => setName(event.target.value)}
                className="h-10 w-full rounded-xl border border-line px-3 font-semibold focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10"
              />
              <input
                aria-label="Listing link"
                value={listing}
                placeholder="Listing link (optional)"
                onChange={(event) => {
                  setListing(event.target.value);
                  setError(null);
                }}
                className="h-10 w-full rounded-xl border border-line px-3 text-sm focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10"
              />
              {error && <p className="text-sm text-estimate">{error}</p>}
              <div className="flex gap-2">
                <button type="submit" className="rounded-xl bg-ink px-3.5 py-2 text-sm font-semibold text-white">
                  Save
                </button>
                <button type="button" onClick={() => setMode("view")} className="px-3 py-2 text-sm font-semibold text-muted">
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 className="text-lg font-semibold leading-snug">{home.name}</h2>
                <p className="text-2xl font-bold tabular-nums">
                  {ranked.total !== null ? formatGBP(ranked.total) : "—"}
                  <span className="text-sm font-medium text-muted"> /mo</span>
                </p>
              </div>
              <p className="mt-1 text-sm text-muted">
                {authority.name} council · {OCCUPANCY_LABELS[home.check.who]}
                {place.precision !== "postcode" && " · from the street or area, not the full postcode"}
              </p>

              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-muted">Rent</dt>
                  <dd className="font-semibold tabular-nums">{rent !== null ? formatGBP(rent) : "Not entered"}</dd>
                </div>
                <div>
                  <dt className="text-muted">Council tax</dt>
                  <dd className="font-semibold tabular-nums">{councilTax.value}</dd>
                  <dd className="text-xs text-muted">{councilTax.note}</dd>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <dt className="text-muted">Rate</dt>
                  <dd className="mt-0.5">
                    <ConfidenceBadge confidence={bandD.confidence} />
                  </dd>
                </div>
              </dl>

              <p className="mt-3 text-sm">
                {ranked.rank === null ? (
                  <Link href={openHref} className="font-semibold text-brand hover:underline">
                    {rent === null ? "Add the rent" : "Choose the band"} to rank this home
                  </Link>
                ) : ranked.aboveCheapest === 0 ? (
                  <span className="font-semibold text-official">Cheapest of your homes</span>
                ) : (
                  <span className="text-ink-soft">
                    <strong className="tabular-nums">{formatGBP(ranked.aboveCheapest ?? 0)}</strong> a month more than the
                    cheapest
                  </span>
                )}
                {ranked.rank !== null && ranked.rentRank !== null && ranked.rentRank !== ranked.rank && (
                  <span className="text-muted"> · #{ranked.rentRank} by rent alone</span>
                )}
              </p>
              {refreshError && <p className="mt-2 text-sm text-estimate">{refreshError}</p>}
            </>
          )}

          {mode !== "edit" && (
            <div className="mt-4 flex flex-wrap items-center gap-x-1 gap-y-2 border-t border-line pt-3 text-sm">
              <label className="mr-2 flex cursor-pointer items-center gap-2 rounded-lg px-1 py-1 font-semibold">
                <input type="checkbox" checked={selected} onChange={onToggleCompare} className="h-4 w-4 accent-brand" />
                Compare
              </label>
              <Link href={openHref} className="rounded-lg px-2 py-1 font-semibold text-brand hover:bg-brand-soft">
                Open
              </Link>
              {home.listingUrl && (
                <a
                  href={home.listingUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-ink-soft hover:bg-canvas"
                >
                  Listing <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
              )}
              <button
                type="button"
                onClick={() => {
                  setName(home.name);
                  setListing(home.listingUrl);
                  setError(null);
                  setMode("edit");
                }}
                className="rounded-lg px-2 py-1 font-semibold text-ink-soft hover:bg-canvas"
              >
                Rename
              </button>
              {mode === "confirm-remove" ? (
                <span className="flex items-center gap-1">
                  <span className="text-muted">Remove this home?</span>
                  <button
                    type="button"
                    onClick={() => setSavedHomes(withoutHome(getSavedHomes(), home.id))}
                    className="rounded-lg px-2 py-1 font-semibold text-estimate hover:bg-estimate-soft"
                  >
                    Remove
                  </button>
                  <button type="button" onClick={() => setMode("view")} className="rounded-lg px-2 py-1 font-semibold text-muted">
                    Keep
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setMode("confirm-remove")}
                  className="rounded-lg px-2 py-1 font-semibold text-muted hover:text-ink"
                >
                  Remove
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
