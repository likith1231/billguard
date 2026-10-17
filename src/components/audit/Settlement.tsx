"use client";

import { AlertTriangle, CheckCircle2, CircleDot, HelpCircle } from "lucide-react";
import { useState } from "react";
import { money } from "@/lib/format";
import type { AuditResult } from "@/lib/schema";

type Row = {
  key: string;
  label: string;
  sub?: string;
  start: number;
  value: number;
  kind: "claimed" | "disputed" | "accepted" | "gap" | "approved";
};

const KIND = {
  claimed: { bar: "bg-ink-2/70", label: "Claimed", Icon: CircleDot, tone: "text-ink-2" },
  disputed: { bar: "bg-coral", label: "Disputed", Icon: AlertTriangle, tone: "text-coral" },
  accepted: { bar: "bg-muted/60", label: "Not disputed", Icon: CheckCircle2, tone: "text-muted" },
  gap: { bar: "bg-amber", label: "Unexplained", Icon: HelpCircle, tone: "text-amber" },
  approved: { bar: "bg-mint", label: "Approved", Icon: CheckCircle2, tone: "text-mint" },
} as const;

/** Waterfall from claimed → each deduction → approved. Doubles as the table view. */
export default function Settlement({ result }: { result: AuditResult }) {
  const s = result.extraction.settlement;
  const cur = result.extraction.currency;
  const [hover, setHover] = useState<string | null>(null);

  if (!s.claimedAmount && !s.deductions.length) {
    return <p className="glass rounded-3xl p-10 text-center text-ink-2">No insurer settlement letter was provided, so there&apos;s no settlement to audit.</p>;
  }

  const disputedBy = new Map<string, string[]>();
  for (const f of result.findings) for (const d of f.deductionIds) disputedBy.set(d, [...(disputedBy.get(d) ?? []), f.id]);

  const claimed = s.claimedAmount ?? s.deductions.reduce((t, d) => t + d.amount, 0) + (s.approvedAmount ?? 0);
  const rows: Row[] = [{ key: "claimed", label: "Amount claimed", start: 0, value: claimed, kind: "claimed" }];
  let run = claimed;
  for (const d of s.deductions) {
    run -= d.amount;
    const by = disputedBy.get(d.id);
    rows.push({ key: d.id, label: `${d.id} · ${d.description}`, sub: d.reasonGiven + (by ? ` — see ${by.join(", ")}` : ""), start: run, value: d.amount, kind: by ? "disputed" : "accepted" });
  }
  if (s.approvedAmount !== null && run - s.approvedAmount > 10) {
    const gap = run - s.approvedAmount;
    run -= gap;
    rows.push({ key: "gap", label: "Unaccounted difference", sub: "Not explained by any listed deduction", start: run, value: gap, kind: "gap" });
  }
  if (s.approvedAmount !== null) rows.push({ key: "approved", label: "Amount approved", start: 0, value: s.approvedAmount, kind: "approved" });

  const max = claimed || 1;

  return (
    <div className="glass rounded-3xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-lg font-semibold">{s.insurer ?? "Insurer"} — where the money went</h3>
        <ul className="flex flex-wrap gap-4 text-xs text-ink-2">
          {(["disputed", "accepted", "gap", "approved"] as const).map((k) => {
            const K = KIND[k];
            return (
              <li key={k} className="flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-sm ${K.bar}`} /> {K.label}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-6 space-y-[2px]">
        {rows.map((r) => {
          const K = KIND[r.kind];
          return (
            <div
              key={r.key}
              className={`grid grid-cols-1 gap-2 rounded-xl px-3 py-2.5 transition md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] md:items-center ${hover === r.key ? "bg-white/[0.05]" : ""}`}
              onPointerEnter={() => setHover(r.key)}
              onPointerLeave={() => setHover(null)}
            >
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <K.Icon className={`h-3.5 w-3.5 shrink-0 ${K.tone}`} aria-label={K.label} />
                  <span className="truncate">{r.label}</span>
                </p>
                {r.sub && <p className="mt-0.5 line-clamp-2 text-xs text-muted">{r.sub}</p>}
              </div>
              <div className="relative h-4">
                <div className="absolute inset-y-[5px] inset-x-0 rounded-full bg-white/[0.04]" />
                <div
                  className={`absolute inset-y-0 rounded ${K.bar}`}
                  style={{ left: `${(r.start / max) * 100}%`, width: `max(4px, ${(r.value / max) * 100}%)` }}
                />
                {hover === r.key && (
                  <div
                    role="tooltip"
                    className="glass-strong absolute bottom-6 z-10 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap"
                    style={{ left: `min(${((r.start + r.value / 2) / max) * 100}%, 70%)` }}
                  >
                    <span className="text-muted">{K.label}: </span>
                    <span className="font-semibold">{money(r.value, cur)}</span>
                    <span className="text-muted"> · {((r.value / max) * 100).toFixed(1)}% of claim</span>
                  </div>
                )}
              </div>
              <p className="text-right font-mono text-sm font-semibold">
                {r.kind === "claimed" || r.kind === "approved" ? "" : "−"}
                {money(r.value, cur)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
