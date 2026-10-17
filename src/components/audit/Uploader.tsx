"use client";

import { AlertTriangle, ArrowRight, Download, FileCheck2, FileSearch, Landmark, Receipt, ScrollText, X } from "lucide-react";
import { useRef, useState, type ComponentType } from "react";
import TiltCard from "@/components/ui/TiltCard";

export type Files = { bill: File[]; insurer_letter: File[]; policy: File[] };
type Role = keyof Files;

const SLOTS: { role: Role; title: string; hint: string; icon: ComponentType<{ className?: string }>; required?: boolean }[] = [
  { role: "bill", title: "Hospital bill", hint: "Itemised final bill, all pages", icon: Receipt, required: true },
  { role: "insurer_letter", title: "Insurer letter", hint: "Settlement or deduction letter", icon: Landmark },
  { role: "policy", title: "Policy wording", hint: "Optional — sharpens the audit", icon: ScrollText },
];

const ACCEPT = "application/pdf,image/png,image/jpeg,image/webp,text/plain,.txt";

function Slot({ slot, files, onAdd, onRemove }: { slot: (typeof SLOTS)[number]; files: File[]; onAdd: (f: File[]) => void; onRemove: (i: number) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const has = files.length > 0;

  return (
    <TiltCard max={8} className="h-full">
      <div
        role="button"
        tabIndex={0}
        onClick={() => input.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          onAdd([...e.dataTransfer.files]);
        }}
        className={`glass flex h-full min-h-48 cursor-pointer flex-col rounded-3xl border-dashed p-5 transition outline-none focus-visible:ring-2 focus-visible:ring-mint ${
          over ? "border-mint bg-mint/10" : has ? "border-mint/40" : "hover:border-line-2"
        }`}
      >
        <div className="tilt-pop flex items-start justify-between">
          <div className={`grid h-11 w-11 place-items-center rounded-2xl ${has ? "glow-ring bg-mint/15" : "bg-white/5"}`}>
            {has ? <FileCheck2 className="h-5 w-5 text-mint" /> : <slot.icon className="h-5 w-5 text-ink-2" />}
          </div>
          {slot.required && <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-muted uppercase">Required</span>}
        </div>
        <h3 className="font-display mt-5 text-lg font-semibold">{slot.title}</h3>
        <p className="text-sm text-muted">{slot.hint}</p>
        <div className="mt-auto space-y-1.5 pt-4">
          {files.map((f, i) => (
            <div key={f.name + i} className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs">
              <span className="truncate">{f.name}</span>
              <button
                type="button"
                aria-label={`Remove ${f.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(i);
                }}
                className="text-muted hover:text-coral"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {!has && <p className="text-xs text-muted">Drop files or click · PDF, JPG, PNG, TXT</p>}
        </div>
        <input
          ref={input}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            onAdd([...(e.target.files ?? [])]);
            e.target.value = "";
          }}
        />
      </div>
    </TiltCard>
  );
}

export default function Uploader({ onRun, error }: { onRun: (f: Files | null, notes?: string) => void; error: string | null }) {
  const [files, setFiles] = useState<Files>({ bill: [], insurer_letter: [], policy: [] });
  const [notes, setNotes] = useState("");
  const ready = files.bill.length > 0;

  return (
    <div className="grid gap-10 lg:grid-cols-[1.25fr_1fr]">
      <div>
        <p className="font-mono text-xs tracking-[0.3em] text-mint">NEW AUDIT</p>
        <h1 className="font-display mt-3 text-4xl font-semibold tracking-tight md:text-5xl">Upload your documents.</h1>
        <p className="mt-4 max-w-lg text-ink-2">
          The bill is enough to catch hospital overcharges. Add the insurer&apos;s letter and policy wording to audit the claim settlement too.
        </p>

        {error && (
          <div role="alert" className="mt-6 flex items-start gap-3 rounded-2xl border border-coral/40 bg-coral/10 p-4 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-coral" /> {error}
          </div>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {SLOTS.map((s) => (
            <Slot
              key={s.role}
              slot={s}
              files={files[s.role]}
              onAdd={(add) => setFiles((p) => ({ ...p, [s.role]: [...p[s.role], ...add].slice(0, 10) }))}
              onRemove={(i) => setFiles((p) => ({ ...p, [s.role]: p[s.role].filter((_, k) => k !== i) }))}
            />
          ))}
        </div>

        <label className="mt-6 block">
          <span className="text-sm font-medium">Anything we should know? <span className="text-muted">(optional)</span></span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="e.g. I was told the surgery was a fixed package. I have a consumables rider."
            className="glass mt-2 w-full resize-none rounded-2xl px-4 py-3 text-sm outline-none placeholder:text-muted focus:border-mint/50"
          />
        </label>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!ready}
            onClick={() => onRun(files, notes)}
            className="inline-flex items-center gap-2 rounded-2xl bg-mint px-6 py-3.5 font-semibold text-black shadow-[0_0_40px_-10px_var(--mint)] transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Run audit <ArrowRight className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => onRun(null)} className="glass inline-flex items-center gap-2 rounded-2xl px-5 py-3.5 font-medium hover:bg-white/5">
            <FileSearch className="h-4 w-4 text-mint" /> Use the sample case
          </button>
        </div>

        <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
          <span>Sample documents to try live:</span>
          {[
            ["hospital-bill.txt", "Bill"],
            ["insurer-letter.txt", "Insurer letter"],
            ["policy-wording.txt", "Policy"],
          ].map(([f, l]) => (
            <a key={f} href={`/samples/${f}`} download className="inline-flex items-center gap-1 text-ink-2 hover:text-mint">
              <Download className="h-3 w-3" /> {l}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
