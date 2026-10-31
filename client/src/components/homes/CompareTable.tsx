import { formatGBP, type RankedHome } from "@truecost/core";
import { ConfidenceBadge } from "@/components/report/ui";
import { OCCUPANCY_LABELS, parseRent } from "@/lib/check";
import { savedHomeCouncilTax } from "@/lib/homeCosts";
import type { SavedHome } from "@/lib/savedHomes";
import { councilTaxText } from "./costLabels";

/** Two or three saved homes side by side, line by line, cheapest highlighted. */
export function CompareTable({ homes, ranked }: { homes: SavedHome[]; ranked: Map<string, RankedHome> }) {
  const totals = homes.map((home) => ranked.get(home.id)?.total ?? null);
  const known = totals.filter((total): total is number => total !== null);
  const cheapest = known.length > 0 ? Math.min(...known) : null;

  const cell = "px-4 py-3 align-top";
  const label = `${cell} sticky left-0 bg-white text-left font-medium text-muted`;

  return (
    <div className="overflow-x-auto rounded-3xl bg-white ring-1 ring-line">
      <table className="w-full min-w-[520px] text-sm">
        <caption className="sr-only">Saved homes compared side by side</caption>
        <thead>
          <tr className="border-b border-line">
            <th scope="col" className={`${label} w-36`}>
              <span className="sr-only">Cost</span>
            </th>
            {homes.map((home) => (
              <th key={home.id} scope="col" className={`${cell} text-left`}>
                <span className="block font-semibold text-ink">{home.name}</span>
                <span className="block font-normal text-muted">{home.snapshot.authority.name}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          <tr>
            <th scope="row" className={label}>
              Rent
            </th>
            {homes.map((home) => {
              const rent = parseRent(home.check.rent);
              return (
                <td key={home.id} className={`${cell} font-semibold tabular-nums`}>
                  {rent !== null ? formatGBP(rent) : "Not entered"}
                </td>
              );
            })}
          </tr>
          <tr>
            <th scope="row" className={label}>
              Council tax
            </th>
            {homes.map((home) => {
              const text = councilTaxText(savedHomeCouncilTax(home));
              return (
                <td key={home.id} className={cell}>
                  <span className="block font-semibold tabular-nums">{text.value}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                    {text.note}
                    <ConfidenceBadge confidence={home.snapshot.bandD.confidence} />
                  </span>
                </td>
              );
            })}
          </tr>
          <tr>
            <th scope="row" className={label}>
              Energy, water, broadband
            </th>
            {homes.map((home) => (
              <td key={home.id} className={`${cell} text-muted`}>
                Not included yet
              </td>
            ))}
          </tr>
          <tr className="bg-canvas/60">
            <th scope="row" className={`${label} bg-canvas text-ink`}>
              Total a month
            </th>
            {homes.map((home, i) => (
              <td key={home.id} className={cell}>
                <span className="block text-lg font-bold tabular-nums">{totals[i] !== null ? formatGBP(totals[i]) : "—"}</span>
                {totals[i] !== null && cheapest !== null && (
                  <span className={`text-xs ${totals[i] === cheapest ? "font-semibold text-official" : "text-muted"}`}>
                    {totals[i] === cheapest ? "Cheapest" : `+${formatGBP(totals[i] - cheapest)} a month`}
                  </span>
                )}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row" className={label}>
              A year
            </th>
            {homes.map((home, i) => (
              <td key={home.id} className={`${cell} tabular-nums`}>
                {totals[i] !== null ? formatGBP(totals[i] * 12) : "—"}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row" className={label}>
              Who&apos;s living there
            </th>
            {homes.map((home) => (
              <td key={home.id} className={`${cell} text-ink-soft`}>
                {OCCUPANCY_LABELS[home.check.who]}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
