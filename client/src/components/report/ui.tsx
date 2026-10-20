import type { ReactNode } from "react";
import { AlertTriangle, Info } from "lucide-react";
import type { Confidence } from "@truecost/core";

const CONFIDENCE: Record<Confidence, { label: string; className: string }> = {
  official: { label: "Official rate", className: "bg-official-soft text-official" },
  estimated: { label: "Estimate", className: "bg-estimate-soft text-estimate" },
  reported: { label: "From listing", className: "bg-entered-soft text-entered" },
  user_provided: { label: "You entered", className: "bg-entered-soft text-entered" },
};

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const { label, className } = CONFIDENCE[confidence];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {label}
    </span>
  );
}

export function Panel({
  step,
  title,
  description,
  highlight = false,
  children,
}: {
  step: number;
  title: string;
  description?: ReactNode;
  /** Marks the step the renter should do next. */
  highlight?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={`rounded-3xl bg-white p-5 sm:p-6 ${highlight ? "ring-2 ring-brand" : "ring-1 ring-line"}`}
      aria-labelledby={`panel-${step}`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
            highlight ? "bg-brand" : "bg-ink"
          }`}
        >
          {step}
        </span>
        <div className="min-w-0">
          <h2 id={`panel-${step}`} className="flex scroll-mt-28 flex-wrap items-center gap-2 text-lg font-semibold leading-snug">
            {title}
            {highlight && (
              <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-strong">Start here</span>
            )}
          </h2>
          {description && <div className="mt-1 text-sm text-muted">{description}</div>}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function Notice({ tone, title, children }: { tone: "info" | "warn"; title: string; children?: ReactNode }) {
  const Icon = tone === "warn" ? AlertTriangle : Info;
  const colours = tone === "warn" ? "bg-estimate-soft text-estimate" : "bg-brand-soft text-brand-strong";
  return (
    <div className={`flex gap-3 rounded-2xl p-4 ${colours}`} role={tone === "warn" ? "alert" : "status"}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      <div className="space-y-2 text-sm">
        <p className="font-semibold">{title}</p>
        {children && <div className="text-ink-soft">{children}</div>}
      </div>
    </div>
  );
}
