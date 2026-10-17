"use client";

import { CATEGORY_LABEL, SEVERITY_STYLE, money } from "@/lib/format";
import type { AuditResult } from "@/lib/schema";

export default function LineTable({ result }: { result: AuditResult }) {
  const x = result.extraction;
  const flags = new Map<string, AuditResult["findings"]>();
  for (const f of result.findings) for (const id of f.lineIds) flags.set(id, [...(flags.get(id) ?? []), f]);
  const total = x.lineItems.reduce((s, l) => s + l.amount, 0);

  return (
    <div className="glass overflow-hidden rounded-3xl">
      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs tracking-wider text-muted uppercase">
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 text-right font-medium">Qty</th>
              <th className="px-4 py-3 text-right font-medium">Rate</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Flags</th>
            </tr>
          </thead>
          <tbody>
            {x.lineItems.map((l) => {
              const fl = flags.get(l.id) ?? [];
              const worst = fl.find((f) => f.severity === "high") ?? fl[0];
              return (
                <tr key={l.id} className={`border-b border-line/60 last:border-0 ${fl.length ? "bg-coral/[0.06]" : ""}`}>
                  <td className="px-4 py-3 font-mono text-xs text-muted">{l.id}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-ink-2">{l.date ?? "—"}</td>
                  <td className="px-4 py-3">
                    {l.description}
                    {l.mrp !== null && <span className="ml-2 text-xs text-muted">MRP {money(l.mrp, x.currency, 2)}</span>}
                  </td>
                  <td className="px-4 py-3 text-ink-2">{CATEGORY_LABEL[l.category]}</td>
                  <td className="px-4 py-3 text-right font-mono">{l.quantity}</td>
                  <td className="px-4 py-3 text-right font-mono">{money(l.unitPrice, x.currency, 2)}</td>
                  <td className="px-4 py-3 text-right font-mono">{money(l.amount, x.currency, 2)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {fl.map((f) => (
                        <span key={f.id} title={f.title} className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] font-semibold ${SEVERITY_STYLE[f.severity].chip}`}>
                          {f.id}
                        </span>
                      ))}
                      {!worst && <span className="text-xs text-muted">—</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-line-2 font-semibold">
              <td colSpan={6} className="px-4 py-3 text-right text-ink-2">
                Sum of lines {x.hospital.billedTotal !== null && `· printed total ${money(x.hospital.billedTotal, x.currency)}`}
              </td>
              <td className="px-4 py-3 text-right font-mono">{money(total, x.currency, 2)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
