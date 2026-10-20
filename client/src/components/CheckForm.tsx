"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight, MapPin } from "lucide-react";
import { parseAddress } from "@truecost/core";
import { checkHref } from "@/lib/check";

const ADDRESS_HELP = "Enter a postcode like E8 3PN, or the street and town from the listing, like “Navarino Road, Hackney”.";

export function CheckForm() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [rent, setRent] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (parseAddress(query).kind === "invalid") {
      setError(ADDRESS_HELP);
      return;
    }
    router.push(checkHref({ q: query.trim(), rent: rent.trim() }));
  }

  return (
    <form onSubmit={submit} noValidate className="rounded-3xl bg-white p-5 shadow-card ring-1 ring-line sm:p-7">
      <div className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="q" className="block text-sm font-semibold text-ink">
            Where is it?
          </label>
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden />
            <input
              id="q"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setError(null);
              }}
              placeholder="Postcode or address, e.g. E8 3PN"
              autoComplete="off"
              aria-invalid={error ? true : undefined}
              aria-describedby="q-help"
              className="h-14 w-full rounded-2xl border border-line bg-canvas/60 pl-12 pr-4 text-lg font-medium text-ink placeholder:font-normal placeholder:text-muted/70 focus:border-brand focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand/10"
            />
          </div>
          <p id="q-help" className={`text-sm ${error ? "text-estimate" : "text-muted"}`}>
            {error ?? "Listings often hide the postcode. The street and town work too, like “Navarino Road, Hackney”."}
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="rent" className="block text-sm font-semibold text-ink">
            Monthly rent <span className="font-normal text-muted">(optional)</span>
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted">£</span>
            <input
              id="rent"
              value={rent}
              onChange={(event) => setRent(event.target.value)}
              inputMode="decimal"
              placeholder="1,500"
              className="h-14 w-full rounded-2xl border border-line bg-canvas/60 pl-10 pr-24 text-lg font-medium tabular-nums text-ink placeholder:font-normal placeholder:text-muted/70 focus:border-brand focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand/10"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">per month</span>
          </div>
        </div>

        <button
          type="submit"
          className="group flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand text-base font-semibold text-white shadow-[0_8px_20px_-8px_rgb(109_40_217/0.6)] transition-colors hover:bg-brand-strong"
        >
          See the real monthly cost
          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </button>

        <p className="text-center text-xs text-muted">Free, no sign-up. Covers every council in England and Wales.</p>
      </div>
    </form>
  );
}
