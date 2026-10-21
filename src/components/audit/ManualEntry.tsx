"use client";

import { ArrowRight, FileDown, FileText, FileUp, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { download } from "@/lib/export";
import { CATEGORY_LABEL, money } from "@/lib/format";
import {
  CSV_TEMPLATE,
  draftFromBillText,
  draftToExtraction,
  emptyDeduction,
  emptyDraft,
  emptyLine,
  extractionToDraft,
  guessCategory,
  linesFromCsv,
  num,
  type DeductionDraft,
  type LineDraft,
  type ManualDraft,
} from "@/lib/manual";
import { SAMPLE_EXTRACTION } from "@/lib/sample";
import type { Extraction, LineItemCategory } from "@/lib/schema";

const input =
  "w-full rounded-lg border border-line bg-white/[0.03] px-2.5 py-2 text-sm outline-none placeholder:text-muted/70 focus:border-mint/50 [color-scheme:dark]";

function Field({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="block text-xs text-muted">
      {label}
      <input type={type} inputMode={type === "text" ? undefined : "decimal"} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={`${input} mt-1`} />
    </label>
  );
}

function Section({ title, hint, children, action }: { title: string; hint?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="glass min-w-0 rounded-3xl p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold">{title}</h3>
          {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function ManualEntry({ onRun }: { onRun: (x: Extraction) => void }) {
  const [d, setD] = useState<ManualDraft>(emptyDraft);
  const [csvError, setCsvError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const billRef = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);
  const [readNote, setReadNote] = useState<string | null>(null);

  const set = <K extends keyof ManualDraft>(k: K) => (v: ManualDraft[K]) => setD((p) => ({ ...p, [k]: v }));
  const setLine = (i: number, patch: Partial<LineDraft>) =>
    setD((p) => ({
      ...p,
      lines: p.lines.map((l, j) => {
        if (j !== i) return l;
        const next = { ...l, ...patch };
        // Pick a category from the description until the user chooses one.
        if (patch.description !== undefined && (l.category === "other" || l.category === guessCategory(l.description))) next.category = guessCategory(patch.description);
        return next;
      }),
    }));
  const setDed = (i: number, patch: Partial<DeductionDraft>) => setD((p) => ({ ...p, deductions: p.deductions.map((x, j) => (j === i ? { ...x, ...patch } : x)) }));

  const lineTotal = (l: LineDraft) => num(l.amount) ?? (num(l.quantity) ?? 1) * (num(l.unitPrice) ?? 0);
  const filled = d.lines.filter((l) => l.description.trim() && (num(l.amount) !== null || num(l.unitPrice) !== null));
  const sum = filled.reduce((s, l) => s + lineTotal(l), 0);

  async function importCsv(f: File) {
    setCsvError(null);
    try {
      const lines = linesFromCsv(await f.text());
      if (!lines.length) throw new Error("No line items found in that file.");
      setD((p) => ({ ...p, lines: [...p.lines.filter((l) => l.description.trim()), ...lines] }));
    } catch (e) {
      setCsvError((e as Error).message);
    }
  }

  // Text-based PDFs and .txt bills are read in the browser; the user then reviews the filled form.
  async function importBill(f: File) {
    setCsvError(null);
    setReadNote(null);
    setReading(true);
    try {
      const isPdf = f.type === "application/pdf" || /\.pdf$/i.test(f.name);
      const text = isPdf ? (await import("@/lib/pdf-text").then((m) => m.pdfToText(f))) : await f.text();
      if (!text.trim()) throw new Error("That PDF has no text layer (it looks scanned). Type the lines in or use the AI upload, which can read scans.");
      const { fields, lines } = draftFromBillText(text);
      if (!lines.length) throw new Error("Couldn't find a table of line items in that file. Try the CSV template instead.");
      setD((p) => ({ ...p, ...fields, lines: [...p.lines.filter((l) => l.description.trim()), ...lines] }));
      setReadNote(`Read ${lines.length} line${lines.length > 1 ? "s" : ""} from ${f.name}. Check them against your bill before running the audit.`);
    } catch (e) {
      setCsvError((e as Error).message);
    } finally {
      setReading(false);
    }
  }

  return (
    <div className="grid gap-4">
      <Section
        title="Bill details"
        hint="Copy these from the top of the hospital bill. All optional, but dates enable the length-of-stay check."
        action={
          <button type="button" onClick={() => setD(extractionToDraft(SAMPLE_EXTRACTION))} className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-1.5 text-xs text-ink-2 hover:text-mint">
            <Sparkles className="h-3.5 w-3.5" /> Fill with the sample bill
          </button>
        }
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Field label="Patient name" value={d.patientName} onChange={set("patientName")} />
          <Field label="Hospital" value={d.hospitalName} onChange={set("hospitalName")} />
          <Field label="Bill number" value={d.billNumber} onChange={set("billNumber")} />
          <Field label="Bill grand total (₹)" type="number" value={d.billedTotal} onChange={set("billedTotal")} />
          <Field label="Admitted on" type="date" value={d.admissionDate} onChange={set("admissionDate")} />
          <Field label="Discharged on" type="date" value={d.dischargeDate} onChange={set("dischargeDate")} />
          <Field label="Policy number" value={d.policyNumber} onChange={set("policyNumber")} />
          <Field label="Claim number" value={d.claimNumber} onChange={set("claimNumber")} />
        </div>
      </Section>

      <Section
        title="Line items"
        hint="One row per bill line. Leave Amount blank to use quantity × rate."
        action={
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={reading} onClick={() => billRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-xl border border-mint/40 px-3 py-1.5 text-xs text-mint hover:bg-mint/10 disabled:opacity-50">
              {reading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />} Read a text PDF
            </button>
            <input
              ref={billRef}
              type="file"
              accept=".pdf,application/pdf,.txt,text/plain"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importBill(f);
                e.target.value = "";
              }}
            />
            <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-1.5 text-xs text-ink-2 hover:text-mint">
              <FileUp className="h-3.5 w-3.5" /> Import CSV
            </button>
            <button type="button" onClick={() => download("billguard-lines-template.csv", CSV_TEMPLATE, "text/csv;charset=utf-8")} className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-1.5 text-xs text-ink-2 hover:text-mint">
              <FileDown className="h-3.5 w-3.5" /> CSV template
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importCsv(f);
                e.target.value = "";
              }}
            />
          </div>
        }
      >
        {csvError && <p className="mb-3 text-sm text-coral">{csvError}</p>}
        {readNote && <p className="mb-3 text-sm text-mint">{readNote}</p>}
        <div className="scrollbar-thin -mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-[880px] text-sm">
            <thead>
              <tr className="text-left text-[11px] tracking-wider text-muted uppercase">
                <th className="w-10 pb-2 font-medium">#</th>
                <th className="w-36 pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Description</th>
                <th className="w-36 pb-2 font-medium">Category</th>
                <th className="w-16 pb-2 font-medium">Qty</th>
                <th className="w-24 pb-2 font-medium">Rate</th>
                <th className="w-28 pb-2 font-medium">Amount</th>
                <th className="w-20 pb-2 font-medium">MRP</th>
                <th className="w-8 pb-2" />
              </tr>
            </thead>
            <tbody>
              {d.lines.map((l, i) => (
                <tr key={i} className="align-top">
                  <td className="py-1 pr-2 pt-3 font-mono text-xs text-muted">L{i + 1}</td>
                  <td className="py-1 pr-2">
                    <input aria-label={`Line ${i + 1} date`} type="date" value={l.date} onChange={(e) => setLine(i, { date: e.target.value })} className={input} />
                  </td>
                  <td className="py-1 pr-2">
                    <input aria-label={`Line ${i + 1} description`} value={l.description} placeholder="e.g. CBC, Private room, Inj. Ceftriaxone" onChange={(e) => setLine(i, { description: e.target.value })} className={input} />
                  </td>
                  <td className="py-1 pr-2">
                    <select aria-label={`Line ${i + 1} category`} value={l.category} onChange={(e) => setLine(i, { category: e.target.value as LineItemCategory })} className={`${input} bg-bg-2`}>
                      {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-1 pr-2">
                    <input aria-label={`Line ${i + 1} quantity`} inputMode="decimal" value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} className={input} />
                  </td>
                  <td className="py-1 pr-2">
                    <input aria-label={`Line ${i + 1} rate`} inputMode="decimal" value={l.unitPrice} onChange={(e) => setLine(i, { unitPrice: e.target.value })} className={input} />
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      aria-label={`Line ${i + 1} amount`}
                      inputMode="decimal"
                      value={l.amount}
                      placeholder={num(l.unitPrice) !== null ? String((num(l.quantity) ?? 1) * (num(l.unitPrice) ?? 0)) : ""}
                      onChange={(e) => setLine(i, { amount: e.target.value })}
                      className={input}
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <input aria-label={`Line ${i + 1} MRP`} inputMode="decimal" value={l.mrp} placeholder="—" onChange={(e) => setLine(i, { mrp: e.target.value })} className={input} />
                  </td>
                  <td className="py-1 pt-2">
                    <button type="button" aria-label={`Remove line ${i + 1}`} onClick={() => setD((p) => ({ ...p, lines: p.lines.filter((_, j) => j !== i) }))} className="p-1 text-muted hover:text-coral">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={() => setD((p) => ({ ...p, lines: [...p.lines, emptyLine()] }))} className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-line-2 px-3 py-2 text-sm text-ink-2 hover:border-mint/50 hover:text-mint">
            <Plus className="h-4 w-4" /> Add line
          </button>
          <p className="text-sm text-muted">
            {filled.length} lines · <span className="font-mono text-ink">{money(sum)}</span>
            {num(d.billedTotal) !== null && Math.abs((num(d.billedTotal) ?? 0) - sum) > 1 && <span className="text-amber"> (bill total says {money(num(d.billedTotal))})</span>}
          </p>
        </div>
      </Section>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Section title="Insurer settlement" hint="Optional. From the settlement or deduction letter.">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Insurer / TPA" value={d.insurer} onChange={set("insurer")} />
            <Field label="Claimed (₹)" type="number" value={d.claimedAmount} onChange={set("claimedAmount")} />
            <Field label="Approved (₹)" type="number" value={d.approvedAmount} onChange={set("approvedAmount")} />
          </div>
          <div className="mt-4 space-y-2">
            {d.deductions.map((x, i) => (
              <div key={i} className="grid grid-cols-[1fr_7rem_6rem_auto] items-end gap-2 rounded-2xl border border-line p-3 max-sm:grid-cols-2">
                <Field label={`D${i + 1} reason given by insurer`} value={x.reasonGiven} placeholder="e.g. Co-payment as per policy" onChange={(v) => setDed(i, { reasonGiven: v })} />
                <Field label="Amount (₹)" type="number" value={x.amount} onChange={(v) => setDed(i, { amount: v })} />
                <Field label="Bill lines" value={x.lines} placeholder="L3, L4" onChange={(v) => setDed(i, { lines: v })} />
                <button type="button" aria-label={`Remove deduction ${i + 1}`} onClick={() => setD((p) => ({ ...p, deductions: p.deductions.filter((_, j) => j !== i) }))} className="mb-1.5 p-1 text-muted hover:text-coral">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => setD((p) => ({ ...p, deductions: [...p.deductions, emptyDeduction()] }))} className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-line-2 px-3 py-2 text-sm text-ink-2 hover:border-mint/50 hover:text-mint">
              <Plus className="h-4 w-4" /> Add deduction
            </button>
          </div>
        </Section>

        <Section title="Policy limits" hint="Optional. From the policy schedule.">
          <div className="grid gap-3">
            <Field label="Sum insured (₹)" type="number" value={d.sumInsured} onChange={set("sumInsured")} />
            <Field label="Room rent limit per day (₹)" type="number" value={d.roomRentLimitPerDay} onChange={set("roomRentLimitPerDay")} />
            <Field label="Co-pay % (0 if none)" type="number" value={d.copayPercent} onChange={set("copayPercent")} />
          </div>
        </Section>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          disabled={!filled.length}
          onClick={() => onRun(draftToExtraction(d))}
          className="inline-flex items-center gap-2 rounded-2xl bg-mint px-6 py-3.5 font-semibold text-black shadow-[0_0_40px_-10px_var(--mint)] transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Run free audit <ArrowRight className="h-4 w-4" />
        </button>
        <p className="text-sm text-muted">Runs in your browser. Nothing is uploaded.</p>
      </div>
    </div>
  );
}
