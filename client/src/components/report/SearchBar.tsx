"use client";

import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";

export function SearchBar({ value, onSearch }: { value: string; onSearch: (query: string) => void }) {
  const [draft, setDraft] = useState(value);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (draft.trim()) onSearch(draft.trim());
  }

  return (
    <form onSubmit={submit} role="search" className="flex gap-2">
      <label htmlFor="search-q" className="sr-only">
        Postcode or address
      </label>
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
        <input
          id="search-q"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Postcode or address, e.g. E8 3PN"
          autoComplete="off"
          className="h-11 w-full rounded-xl border border-line bg-white pl-10 pr-3 font-medium focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10"
        />
      </div>
      <button
        type="submit"
        className="h-11 rounded-xl bg-ink px-4 text-sm font-semibold text-white transition-colors hover:bg-ink-soft"
      >
        Update
      </button>
    </form>
  );
}
