"use client";

import { FileDown, FileUp, MapPin, X } from "lucide-react";
import { useRef, useState } from "react";
import { CITIES, RATE_CSV_TEMPLATE, TIER_FACTOR, cityTier, parseRateCsv, type RateContext } from "@/lib/benchmarks";
import { download } from "@/lib/export";
import { parseCsv } from "@/lib/manual";

/** City tier and an optional rate table (e.g. the CGHS list or an insurer's PPN rates) for the price check. */
export default function RatePanel({ rates, onChange }: { rates: RateContext; onChange: (r: RateContext) => void }) {
  const file = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const tier = cityTier(rates.city);

  async function load(f: File) {
    setError(null);
    try {
      onChange({ ...rates, custom: parseRateCsv(parseCsv(await f.text())) });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <details className="glass group mt-6 max-w-2xl rounded-2xl">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm [&::-webkit-details-marker]:hidden">
        <MapPin className="h-4 w-4 text-mint" />
        <span className="font-medium">Price check settings</span>
        <span className="text-muted">
          {rates.city ? rates.city : "any city"}
          {rates.custom?.length ? ` · ${rates.custom.length} custom rates` : ""}
        </span>
        <span className="ml-auto text-xs text-muted group-open:hidden">Edit</span>
      </summary>
      <div className="space-y-4 border-t border-line px-4 py-4 text-sm">
        <label className="block">
          <span className="font-medium">City of the hospital</span>
          <select
            value={rates.city ?? ""}
            onChange={(e) => onChange({ ...rates, city: e.target.value || null })}
            className="mt-2 w-full rounded-xl border border-line bg-white/[0.03] px-3 py-2.5 outline-none focus:border-mint/50 [color-scheme:dark]"
          >
            <option value="">Not specified (metro bands)</option>
            {CITIES.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
          <span className="mt-1.5 block text-xs text-muted">
            {tier && tier > 1
              ? `Tier-${tier === 2 ? "II" : "III"}: price bands are scaled to ${TIER_FACTOR[tier] * 100}% of the metro range, the way CGHS discounts smaller cities.`
              : "Smaller cities have lower rates, so choosing yours makes the price check stricter."}
          </span>
        </label>

        <div>
          <p className="font-medium">Your own rate table</p>
          <p className="mt-1 text-xs text-muted">
            Have the CGHS list, your insurer&apos;s PPN package rates or NPPA ceiling prices? Upload them as a CSV. Any bill line that matches an item and costs more than your
            Max rate is flagged, and your rates win over the built-in bands.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => file.current?.click()} className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-1.5 text-xs text-ink-2 hover:text-mint">
              <FileUp className="h-3.5 w-3.5" /> Upload rate CSV
            </button>
            <button type="button" onClick={() => download("billguard-rates-template.csv", RATE_CSV_TEMPLATE, "text/csv;charset=utf-8")} className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-1.5 text-xs text-ink-2 hover:text-mint">
              <FileDown className="h-3.5 w-3.5" /> Template
            </button>
            {!!rates.custom?.length && (
              <button type="button" onClick={() => onChange({ ...rates, custom: [] })} className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-coral">
                <X className="h-3.5 w-3.5" /> Clear {rates.custom.length} rates
              </button>
            )}
            <input
              ref={file}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) load(f);
                e.target.value = "";
              }}
            />
          </div>
          {error && <p className="mt-2 text-xs text-coral">{error}</p>}
        </div>
      </div>
    </details>
  );
}
