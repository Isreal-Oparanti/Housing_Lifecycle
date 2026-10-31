"use client";

import Link from "next/link";
import { Bookmark } from "lucide-react";
import { useSavedHomes } from "@/lib/savedHomes";

/** Header link to "Your homes", shown once at least one home is saved. */
export function SavedHomesLink() {
  const count = useSavedHomes().length;
  if (count === 0) return null;
  return (
    <Link
      href="/homes"
      className="flex items-center gap-1.5 rounded-lg px-3 py-2 hover:text-ink"
      aria-label={`Your homes, ${count} saved`}
    >
      <Bookmark className="h-4 w-4" aria-hidden />
      <span className="hidden sm:inline">Your homes</span>
      <span className="rounded-full bg-brand-soft px-1.5 text-xs font-semibold tabular-nums text-brand-strong">{count}</span>
    </Link>
  );
}
