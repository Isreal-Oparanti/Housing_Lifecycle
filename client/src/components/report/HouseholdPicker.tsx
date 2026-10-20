"use client";

import { DoorOpen, GraduationCap, User, Users, type LucideIcon } from "lucide-react";
import type { Occupancy } from "@/lib/check";

const OPTIONS: { value: Occupancy; icon: LucideIcon; title: string; effect: string }[] = [
  { value: "adults", icon: Users, title: "Two or more adults", effect: "Full council tax" },
  { value: "single", icon: User, title: "Just me", effect: "25% off" },
  { value: "students", icon: GraduationCap, title: "All full-time students", effect: "No council tax" },
  { value: "room", icon: DoorOpen, title: "A room in a shared house", effect: "Usually the landlord pays" },
];

export function HouseholdPicker({ value, onChange }: { value: Occupancy; onChange: (value: Occupancy) => void }) {
  return (
    <div role="radiogroup" aria-label="Who's living there" className="grid gap-2 sm:grid-cols-2">
      {OPTIONS.map(({ value: option, icon: Icon, title, effect }) => (
        <label
          key={option}
          className="flex cursor-pointer items-center gap-3 rounded-2xl border border-line bg-canvas/50 p-3.5 transition-colors hover:border-brand-line has-checked:border-brand has-checked:bg-brand-soft has-focus-visible:ring-4 has-focus-visible:ring-brand/20"
        >
          <input
            type="radio"
            name="who"
            value={option}
            checked={value === option}
            onChange={() => onChange(option)}
            className="sr-only"
          />
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-ink-soft ring-1 ring-line">
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block font-semibold leading-snug">{title}</span>
            <span className="block text-sm text-muted">{effect}</span>
          </span>
        </label>
      ))}
    </div>
  );
}
