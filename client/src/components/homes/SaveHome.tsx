"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import type { AuthoritySummary, Pence, Place, Sourced } from "@truecost/core";
import type { CheckParams } from "@/lib/check";
import {
  MAX_SAVED_HOMES,
  cleanListingUrl,
  defaultHomeName,
  getSavedHomes,
  newHomeId,
  setSavedHomes,
  useSavedHomes,
  withHomeAdded,
  withoutHome,
} from "@/lib/savedHomes";

interface Resolved {
  place: Place;
  authority: AuthoritySummary;
  bandD: Sourced<Pence>;
  taxYear: string;
}

/**
 * Save the home on this results page to "Your homes". Once saved, the page
 * carries the home's id in its URL and later edits (band, household, rent)
 * are saved to it automatically by the results page.
 */
export function SaveHome({
  resolved,
  params,
  onSavedChange,
}: {
  resolved: Resolved;
  params: CheckParams;
  onSavedChange: (savedId: string) => void;
}) {
  const homes = useSavedHomes();
  const saved = params.saved ? homes.find((home) => home.id === params.saved) : undefined;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [listing, setListing] = useState("");
  const [error, setError] = useState<string | null>(null);

  function startSaving() {
    setName(defaultHomeName(resolved.place, resolved.authority));
    setListing("");
    setError(null);
    setOpen(true);
  }

  function save(event: FormEvent) {
    event.preventDefault();
    if (listing.trim() && !cleanListingUrl(listing)) {
      setError("That doesn't look like a web link. Paste the listing's address from your browser, or leave it empty.");
      return;
    }
    const now = new Date().toISOString();
    const id = newHomeId();
    try {
      const next = withHomeAdded(getSavedHomes(), {
        id,
        name: name.trim() || defaultHomeName(resolved.place, resolved.authority),
        listingUrl: cleanListingUrl(listing),
        check: { q: params.q, rent: params.rent, band: params.band, who: params.who, authority: resolved.authority.gssCode },
        snapshot: resolved,
        savedAt: now,
        updatedAt: now,
      });
      if (!setSavedHomes(next)) {
        setError("Your browser didn't let us save this. Private browsing can block it.");
        return;
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Couldn't save this home.");
      return;
    }
    setOpen(false);
    onSavedChange(id);
  }

  function remove() {
    if (!saved) return;
    setSavedHomes(withoutHome(getSavedHomes(), saved.id));
    onSavedChange("");
  }

  if (saved) {
    return (
      <section aria-label="Saved home" className="rounded-3xl bg-white p-5 ring-1 ring-line">
        <p className="flex items-center gap-2 font-semibold text-official">
          <BookmarkCheck className="h-5 w-5" aria-hidden /> Saved as &ldquo;{saved.name}&rdquo;
        </p>
        <p className="mt-1 text-sm text-muted">Changes you make here are saved to it.</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Link href="/homes" className="rounded-xl bg-ink px-3.5 py-2 text-sm font-semibold text-white hover:bg-ink-soft">
            Compare your homes ({homes.length})
          </Link>
          <button type="button" onClick={remove} className="rounded-xl px-3 py-2 text-sm font-semibold text-muted hover:text-ink">
            Remove
          </button>
        </div>
      </section>
    );
  }

  if (!open) {
    const full = homes.length >= MAX_SAVED_HOMES;
    return (
      <section aria-label="Save this home" className="rounded-3xl bg-white p-5 ring-1 ring-line">
        <button
          type="button"
          onClick={startSaving}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-brand-line bg-brand-soft px-4 py-3 font-semibold text-brand-strong transition-colors hover:bg-brand-line/60"
        >
          <Bookmark className="h-5 w-5" aria-hidden /> Save this home
        </button>
        <p className="mt-2 text-center text-xs text-muted">
          {full
            ? `You've saved ${MAX_SAVED_HOMES} homes, the most we keep. Remove one to save another.`
            : homes.length > 0
              ? `Compare it with your ${homes.length} saved ${homes.length === 1 ? "home" : "homes"} by real monthly cost.`
              : "Save a few homes and compare them by real monthly cost. Kept on this device only."}
        </p>
      </section>
    );
  }

  return (
    <form onSubmit={save} aria-label="Save this home" className="space-y-4 rounded-3xl bg-white p-5 ring-1 ring-line" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="home-name" className="block text-sm font-semibold">
          Name
        </label>
        <input
          id="home-name"
          value={name}
          maxLength={80}
          onChange={(event) => setName(event.target.value)}
          className="h-11 w-full rounded-xl border border-line bg-canvas/50 px-3 focus:border-brand focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand/10"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="home-listing" className="block text-sm font-semibold">
          Listing link <span className="font-normal text-muted">(optional)</span>
        </label>
        <input
          id="home-listing"
          value={listing}
          inputMode="url"
          placeholder="https://www.rightmove.co.uk/properties/…"
          onChange={(event) => {
            setListing(event.target.value);
            setError(null);
          }}
          aria-invalid={error ? true : undefined}
          className="h-11 w-full rounded-xl border border-line bg-canvas/50 px-3 text-sm focus:border-brand focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand/10"
        />
        <p className="text-xs text-muted">Just for your reference. We don&apos;t open it.</p>
      </div>
      {error && <p className="text-sm text-estimate">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" className="flex-1 rounded-xl bg-brand px-4 py-2.5 font-semibold text-white hover:bg-brand-strong">
          Save home
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-xl px-4 py-2.5 font-semibold text-muted hover:text-ink">
          Cancel
        </button>
      </div>
    </form>
  );
}
