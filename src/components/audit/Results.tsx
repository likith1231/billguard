"use client";

import { FileText, ListChecks, RotateCcw, Table2, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import Counter from "@/components/ui/Counter";
import TiltCard from "@/components/ui/TiltCard";
import { money } from "@/lib/format";
import { partyFor } from "@/lib/rules";
import type { AuditResult } from "@/lib/schema";
import FindingCard from "./FindingCard";
import LetterPanel from "./LetterPanel";
import LineTable from "./LineTable";
import Settlement from "./Settlement";

const TABS = [
  { id: "findings", label: "Findings", icon: ListChecks },
  { id: "lines", label: "Line items", icon: Table2 },
  { id: "settlement", label: "Settlement", icon: Wallet },
] as const;

export default function Results({ result, onReset }: { result: AuditResult; onReset: () => void }) {
  const x = result.extraction;
  const cur = x.currency;
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("findings");
  const [selected, setSelected] = useState<Set<string>>(() => new Set(result.findings.map((f) => f.id)));
  const [party, setParty] = useState<"all" | "hospital" | "insurer">("all");

  const byParty = useMemo(() => {
    const h = result.findings.filter((f) => partyFor(f) === "hospital");
    const i = result.findings.filter((f) => partyFor(f) === "insurer");
    return { hospital: h, insurer: i, sum: (l: typeof h) => l.reduce((s, f) => s + f.disputedAmount, 0) };
  }, [result.findings]);

  const shown = party === "all" ? result.findings : byParty[party];

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const kpis = [
    { label: "Billed", value: result.totals.billed, tone: "text-ink" },
    { label: "Insurer paid", value: result.totals.approved, tone: "text-ink" },
    { label: "Deducted by insurer", value: result.totals.deducted, tone: "text-amber" },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-xs tracking-[0.3em] text-mint">AUDIT REPORT</p>
            {result.mode === "demo" && <span className="rounded-full bg-violet/20 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-violet uppercase">Sample case</span>}
          </div>
          <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight md:text-4xl">{x.hospital.name ?? "Hospital bill"}</h1>
          <p className="mt-1 text-sm text-muted">
            {[x.patient.name, x.hospital.diagnosis, x.hospital.admissionDate && `${x.hospital.admissionDate} → ${x.hospital.dischargeDate ?? "?"}`, x.hospital.billNumber]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="flex gap-2">
          <a href="#letter" className="inline-flex items-center gap-2 rounded-xl bg-mint px-4 py-2.5 text-sm font-semibold text-black hover:brightness-110">
            <FileText className="h-4 w-4" /> Draft letter
          </a>
          <button type="button" onClick={onReset} className="glass inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm hover:bg-white/5">
            <RotateCcw className="h-4 w-4" /> New audit
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="mt-8 grid gap-4 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <TiltCard max={8} className="glass-strong glow-ring overflow-hidden rounded-3xl p-6">
          <div className="tilt-pop">
            <p className="text-sm text-ink-2">Recoverable</p>
            <p className="font-display mt-2 text-5xl font-semibold text-mint drop-shadow-[0_0_24px_rgba(77,255,181,0.45)]">
              <Counter value={result.totals.recoverable} prefix={cur === "INR" ? "₹" : `${cur} `} />
            </p>
            <p className="mt-2 text-xs text-muted">
              {result.findings.length} findings · {result.totals.flaggedLines} bill lines flagged
            </p>
          </div>
          <div className="pointer-events-none absolute -right-10 -bottom-16 h-40 w-40 rounded-full bg-mint/25 blur-3xl" />
        </TiltCard>
        {kpis.map((k) => (
          <TiltCard key={k.label} max={8} className="glass rounded-3xl p-6">
            <div className="tilt-pop">
              <p className="text-sm text-ink-2">{k.label}</p>
              <p className={`font-display mt-2 text-3xl font-semibold ${k.tone}`}>{money(k.value, cur)}</p>
            </div>
          </TiltCard>
        ))}
      </div>

      {x.summary && (
        <p className="glass mt-4 rounded-3xl p-6 leading-relaxed text-ink-2">
          <span className="font-semibold text-ink">In short: </span>
          {x.summary}
        </p>
      )}

      {/* Tabs */}
      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" className="glass inline-flex rounded-2xl p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition ${tab === t.id ? "bg-white/10 text-ink" : "text-muted hover:text-ink"}`}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>
        {tab === "findings" && (
          <div className="flex gap-1.5 text-xs">
            {(
              [
                ["all", `All · ${money(byParty.sum(result.findings), cur)}`],
                ["hospital", `Hospital · ${money(byParty.sum(byParty.hospital), cur)}`],
                ["insurer", `Insurer · ${money(byParty.sum(byParty.insurer), cur)}`],
              ] as const
            ).map(([k, l]) => (
              <button
                key={k}
                onClick={() => setParty(k)}
                className={`rounded-full border px-3 py-1.5 transition ${party === k ? "border-mint/50 bg-mint/10 text-mint" : "border-line text-muted hover:text-ink"}`}
              >
                {l}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6">
        {tab === "findings" &&
          (shown.length ? (
            <div className="grid gap-4">
              {shown.map((f, i) => (
                <FindingCard key={f.id} f={f} index={i} currency={cur} lines={x.lineItems} checked={selected.has(f.id)} onToggle={() => toggle(f.id)} />
              ))}
            </div>
          ) : (
            <p className="glass rounded-3xl p-10 text-center text-ink-2">Nothing to dispute here. This part of the bill looks clean.</p>
          ))}
        {tab === "lines" && <LineTable result={result} />}
        {tab === "settlement" && <Settlement result={result} />}
      </div>

      <LetterPanel result={result} selected={selected} setSelected={setSelected} />

      <p className="mt-10 text-xs leading-relaxed text-muted">
        This audit is informational and may contain mistakes. Check each finding against your documents before you send a dispute. Benchmarks are indicative
        ranges, not official tariffs. Regulatory references are to IRDAI&apos;s 2024 Master Circular on Health Insurance; your policy wording governs.
      </p>
    </div>
  );
}
