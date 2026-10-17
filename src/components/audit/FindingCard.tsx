"use client";

import { Bot, Check, ChevronDown, Cpu, Quote } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { SEVERITY_STYLE, TYPE_LABEL, money } from "@/lib/format";
import { partyFor } from "@/lib/rules";
import type { AuditFinding, LineItem } from "@/lib/schema";

export default function FindingCard({
  f,
  index,
  currency,
  lines,
  checked,
  onToggle,
}: {
  f: AuditFinding;
  index: number;
  currency: string;
  lines: LineItem[];
  checked: boolean;
  onToggle: () => void;
}) {
  const [open, setOpen] = useState(index < 3);
  const sev = SEVERITY_STYLE[f.severity];
  const party = partyFor(f);
  const related = lines.filter((l) => f.lineIds.includes(l.id));

  return (
    <motion.article
      initial={{ opacity: 0, y: 24, rotateX: 10 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.05, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      style={{ transformPerspective: 1000 }}
      className={`glass relative overflow-hidden rounded-3xl transition ${checked ? "" : "opacity-60"}`}
    >
      <div className={`absolute inset-y-0 left-0 w-1 ${sev.bar}`} />
      <div className="flex items-start gap-4 p-5 pl-6">
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          aria-label="Include in dispute letter"
          title="Include in dispute letter"
          onClick={onToggle}
          className={`mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition ${checked ? "border-mint bg-mint text-black" : "border-line-2"}`}
        >
          {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
            <span className={`rounded-full px-2 py-0.5 ${sev.chip}`}>{sev.label}</span>
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-ink-2">{TYPE_LABEL[f.type]}</span>
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-ink-2">{party === "insurer" ? "Raise with insurer" : "Raise with hospital"}</span>
            <span className="inline-flex items-center gap-1 text-muted" title={f.source === "ai" ? "Found by Claude reading the documents" : "Found by the deterministic rules engine"}>
              {f.source === "ai" ? <Bot className="h-3 w-3" /> : <Cpu className="h-3 w-3" />} {f.source === "ai" ? "AI" : "Rule"}
            </span>
          </div>
          <button type="button" onClick={() => setOpen((o) => !o)} className="mt-2 flex w-full items-start justify-between gap-4 text-left">
            <h3 className="font-semibold leading-snug md:text-lg">{f.title}</h3>
            <span className="flex shrink-0 items-center gap-2">
              <span className="font-display text-xl font-semibold">{money(f.disputedAmount, currency)}</span>
              <ChevronDown className={`h-4 w-4 text-muted transition ${open ? "rotate-180" : ""}`} />
            </span>
          </button>

          {open && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
              <p className="mt-3 leading-relaxed text-ink-2">{f.explanation}</p>
              {f.evidence.length > 0 && (
                <div className="mt-4 space-y-1.5">
                  {f.evidence.map((e, i) => (
                    <p key={i} className="flex gap-2 rounded-lg border-l-2 border-mint/60 bg-white/[0.03] px-3 py-2 font-mono text-xs leading-relaxed text-ink-2">
                      <Quote className="mt-0.5 h-3 w-3 shrink-0 text-mint" />
                      <span className="break-words">{e}</span>
                    </p>
                  ))}
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                {f.policyClause && (
                  <span className="text-muted">
                    Reference: <span className="text-ink-2">{f.policyClause}</span>
                  </span>
                )}
                {related.length > 0 && (
                  <span className="text-muted">
                    Lines: <span className="font-mono text-ink-2">{related.map((l) => l.id).join(", ")}</span>
                  </span>
                )}
                {f.deductionIds.length > 0 && (
                  <span className="text-muted">
                    Deductions: <span className="font-mono text-ink-2">{f.deductionIds.join(", ")}</span>
                  </span>
                )}
              </div>
              <p className="mt-4 rounded-xl bg-mint/[0.07] px-4 py-3 text-sm">
                <span className="font-semibold text-mint">Ask for → </span>
                {f.action}
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </motion.article>
  );
}
