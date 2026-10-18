"use client";

import { createPortal } from "react-dom";
import { CATEGORY_LABEL, SEVERITY_STYLE, TYPE_LABEL, money } from "@/lib/format";
import { partyFor } from "@/lib/rules";
import type { AuditResult } from "@/lib/schema";

/**
 * Opens the print dialog showing only one print-only view (Save as PDF works).
 * Each view is portalled straight into <body> with class `print-<kind>`.
 */
export function printView(kind: "report" | "letter") {
  const root = document.documentElement;
  root.dataset.print = kind;
  const done = () => {
    delete root.dataset.print;
    window.removeEventListener("afterprint", done);
  };
  window.addEventListener("afterprint", done);
  window.print();
}

const th = "border-b border-black/30 px-2 py-1.5 text-left font-semibold";
const td = "border-b border-black/10 px-2 py-1.5 align-top";

export const printReport = () => printView("report");

/** Print-only, paper-styled version of the audit. Portalled to <body> so print CSS can hide the app. */
export default function ReportPrint({ result, selected }: { result: AuditResult; selected: Set<string> }) {
  const x = result.extraction;
  const cur = x.currency;
  const findings = result.findings.filter((f) => selected.has(f.id));
  const total = findings.reduce((s, f) => s + Math.max(0, f.disputedAmount), 0);
  const byParty = (p: "hospital" | "insurer") => findings.filter((f) => partyFor(f) === p).reduce((s, f) => s + f.disputedAmount, 0);
  const flags = new Map<string, string[]>();
  for (const f of findings) for (const id of f.lineIds) flags.set(id, [...(flags.get(id) ?? []), f.id]);
  const source = { live: "AI reading + rules engine", demo: "Sample case", manual: "Manual entry, rules engine only" }[result.mode];

  return createPortal(
    <div className="print-report hidden bg-white p-8 font-sans text-[11px] leading-snug text-black">
      <header className="flex items-start justify-between border-b-2 border-black pb-3">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.25em]">BILLGUARD · AUDIT REPORT</p>
          <h1 className="mt-1 text-xl font-bold">{x.hospital.name ?? "Hospital bill"}</h1>
          <p className="mt-0.5">
            {[x.patient.name, x.hospital.billNumber && `Bill ${x.hospital.billNumber}`, x.patient.claimNumber && `Claim ${x.patient.claimNumber}`, x.patient.policyNumber && `Policy ${x.patient.policyNumber}`]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {x.hospital.admissionDate && (
            <p>
              Stay: {x.hospital.admissionDate} → {x.hospital.dischargeDate ?? "?"}
              {x.hospital.diagnosis && ` · ${x.hospital.diagnosis}`}
            </p>
          )}
        </div>
        <div className="text-right text-[10px]">
          <p>Generated {new Date(result.generatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
          <p>Source: {source}</p>
        </div>
      </header>

      <section className="mt-4 grid grid-cols-5 gap-2">
        {[
          ["Billed", result.totals.billed],
          ["Insurer paid", result.totals.approved],
          ["Deducted", result.totals.deducted],
          ["Recover from hospital", byParty("hospital")],
          ["Recover from insurer", byParty("insurer")],
        ].map(([l, v]) => (
          <div key={l as string} className="rounded border border-black/30 p-2">
            <p className="text-[9px] tracking-wider uppercase">{l}</p>
            <p className="mt-0.5 text-base font-bold">{money(v as number | null, cur)}</p>
          </div>
        ))}
      </section>
      <p className="mt-2 font-semibold">
        Total disputed: {money(total, cur)} across {findings.length} finding{findings.length === 1 ? "" : "s"}.
      </p>
      {x.summary && <p className="mt-1">{x.summary}</p>}

      <h2 className="mt-5 text-sm font-bold">Findings</h2>
      <table className="mt-1 w-full border-collapse">
        <thead>
          <tr>
            <th className={th}>#</th>
            <th className={th}>Issue</th>
            <th className={th}>Type</th>
            <th className={th}>Severity</th>
            <th className={th}>Raise with</th>
            <th className={`${th} text-right`}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {findings.map((f) => (
            <tr key={f.id} className="break-inside-avoid">
              <td className={td}>{f.id}</td>
              <td className={td}>
                <p className="font-semibold">{f.title}</p>
                <p className="mt-0.5">{f.explanation}</p>
                {f.evidence.length > 0 && <p className="mt-0.5 italic">Evidence: {f.evidence.join(" · ")}</p>}
                {f.policyClause && <p className="mt-0.5">Clause: {f.policyClause}</p>}
                <p className="mt-0.5">
                  <span className="font-semibold">Ask for:</span> {f.action}
                </p>
              </td>
              <td className={td}>{TYPE_LABEL[f.type]}</td>
              <td className={td}>{SEVERITY_STYLE[f.severity].label}</td>
              <td className={`${td} capitalize`}>{partyFor(f)}</td>
              <td className={`${td} text-right font-mono`}>{money(f.disputedAmount, cur)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="mt-5 text-sm font-bold">Bill line items</h2>
      <table className="mt-1 w-full border-collapse">
        <thead>
          <tr>
            <th className={th}>#</th>
            <th className={th}>Date</th>
            <th className={th}>Description</th>
            <th className={th}>Category</th>
            <th className={`${th} text-right`}>Qty</th>
            <th className={`${th} text-right`}>Rate</th>
            <th className={`${th} text-right`}>Amount</th>
            <th className={th}>Flags</th>
          </tr>
        </thead>
        <tbody>
          {x.lineItems.map((l) => (
            <tr key={l.id} className={`break-inside-avoid ${flags.has(l.id) ? "bg-black/[0.06] font-semibold" : ""}`}>
              <td className={td}>{l.id}</td>
              <td className={td}>{l.date ?? ""}</td>
              <td className={td}>{l.description}</td>
              <td className={td}>{CATEGORY_LABEL[l.category]}</td>
              <td className={`${td} text-right`}>{l.quantity}</td>
              <td className={`${td} text-right font-mono`}>{money(l.unitPrice, cur, 2)}</td>
              <td className={`${td} text-right font-mono`}>{money(l.amount, cur)}</td>
              <td className={td}>{(flags.get(l.id) ?? []).join(", ")}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {x.settlement.deductions.length > 0 && (
        <>
          <h2 className="mt-5 text-sm font-bold">Insurer deductions{x.settlement.insurer && ` — ${x.settlement.insurer}`}</h2>
          <table className="mt-1 w-full border-collapse">
            <thead>
              <tr>
                <th className={th}>#</th>
                <th className={th}>Reason given</th>
                <th className={`${th} text-right`}>Amount</th>
                <th className={th}>Disputed in</th>
              </tr>
            </thead>
            <tbody>
              {x.settlement.deductions.map((d) => (
                <tr key={d.id} className="break-inside-avoid">
                  <td className={td}>{d.id}</td>
                  <td className={td}>{d.reasonGiven}</td>
                  <td className={`${td} text-right font-mono`}>{money(d.amount, cur)}</td>
                  <td className={td}>
                    {findings
                      .filter((f) => f.deductionIds.includes(d.id))
                      .map((f) => f.id)
                      .join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <p className="mt-6 border-t border-black/30 pt-2 text-[9px]">
        Informational audit; it may contain mistakes. Check each finding against your documents before disputing. Benchmarks are indicative ranges, not official tariffs. Regulatory references are to IRDAI&apos;s 2024 Master Circular on Health Insurance; your policy wording governs.
      </p>
    </div>,
    document.body,
  );
}
