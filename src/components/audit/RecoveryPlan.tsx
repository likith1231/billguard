"use client";

import { CalendarClock, Check, Gavel, Landmark, Percent, PiggyBank, Receipt, Scale, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { money } from "@/lib/format";
import { partyFor } from "@/lib/rules";
import type { AuditResult } from "@/lib/schema";

const DAY = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (s: string, n: number) => iso(new Date(new Date(s).getTime() + n * DAY));
const nice = (s: string) => new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const daysBetween = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / DAY);

const DOCS = [
  "Final bill and itemised bill (every page)",
  "Pharmacy and consumables invoices",
  "Discharge summary",
  "Insurer / TPA settlement letter",
  "Policy wording and schedule",
  "Payment receipts for what you paid",
  "Pre-authorisation and query emails",
  "Your dispute letter, with proof of sending",
];

/** Money breakdown, escalation deadlines, delayed-settlement interest and a document checklist. */
export default function RecoveryPlan({ result, selected }: { result: AuditResult; selected: Set<string> }) {
  const x = result.extraction;
  const cur = x.currency;
  const today = useMemo(() => iso(new Date()), []);

  const fromInsurer = result.findings.filter((f) => selected.has(f.id) && partyFor(f) === "insurer").reduce((s, f) => s + f.disputedAmount, 0);
  const fromHospital = result.findings.filter((f) => selected.has(f.id) && partyFor(f) === "hospital").reduce((s, f) => s + f.disputedAmount, 0);
  const paid = result.totals.approved ?? 0;
  const outOfPocket = Math.max(0, result.totals.billed - paid);
  const stillYours = Math.max(0, outOfPocket - fromInsurer - fromHospital);

  const segments = [
    { label: "Insurer paid", value: paid, bar: "bg-ink-2/60", tone: "text-ink-2" },
    { label: "Recover from insurer", value: fromInsurer, bar: "bg-mint", tone: "text-mint" },
    { label: "Recover from hospital", value: fromHospital, bar: "bg-violet", tone: "text-violet" },
    { label: "Genuinely yours to pay", value: stillYours, bar: "bg-amber/70", tone: "text-amber" },
  ];
  const segTotal = segments.reduce((s, g) => s + g.value, 0) || 1;

  // Escalation ladder
  const [sentOn, setSentOn] = useState(today);
  const steps = [
    {
      icon: Receipt,
      title: "Send the dispute letter",
      when: nice(sentOn),
      body: "Email it to the insurer's grievance officer (and the hospital billing desk for hospital points). Keep the acknowledgement or a dated screenshot.",
    },
    {
      icon: CalendarClock,
      title: "Insurer must resolve the grievance",
      when: `by ${nice(addDays(sentOn, 14))}`,
      body: "IRDAI expects insurers to resolve grievances within 14 days. If they don't, or you disagree with the reply, escalate.",
    },
    {
      icon: Landmark,
      title: "Escalate on Bima Bharosa",
      when: `from ${nice(addDays(sentOn, 15))}`,
      body: "Register the complaint on IRDAI's Bima Bharosa portal (bimabharosa.irdai.gov.in), quoting the insurer's grievance reference.",
    },
    {
      icon: Scale,
      title: "Insurance Ombudsman",
      when: `after ${nice(addDays(sentOn, 30))}, within 1 year of the insurer's reply`,
      body: "Free, no lawyer needed, for claims up to ₹50 lakh. You can file online through the Council for Insurance Ombudsmen (cioins.co.in).",
    },
    {
      icon: Gavel,
      title: "Consumer Commission",
      when: "within 2 years of the dispute",
      body: "For hospital overcharging, or if the Ombudsman route doesn't resolve it. File on e-Daakhil. District Commission hears claims up to ₹50 lakh.",
    },
  ];
  const hasMrp = result.findings.some((f) => f.type === "mrp_violation" && selected.has(f.id));

  // Delayed-settlement interest
  const [docsOn, setDocsOn] = useState(() => (x.hospital.dischargeDate && !Number.isNaN(Date.parse(x.hospital.dischargeDate)) ? iso(new Date(x.hospital.dischargeDate)) : addDays(today, -60)));
  const [paidOn, setPaidOn] = useState(today);
  const [amount, setAmount] = useState(() => Math.round(fromInsurer));
  const [bankRate, setBankRate] = useState(5.75);
  const elapsed = Math.max(0, daysBetween(docsOn, paidOn));
  const late = Math.max(0, elapsed - 30);
  const interest = (amount * (bankRate + 2) * late) / 36500;

  // Document checklist, remembered per claim in this browser
  const key = `billguard:docs:${x.patient.claimNumber ?? x.hospital.billNumber ?? "case"}`;
  const [have, setHave] = useState<Set<number>>(new Set());
  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setHave(new Set(JSON.parse(saved)));
    } catch {}
  }, [key]);
  const toggleDoc = (i: number) =>
    setHave((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      try {
        localStorage.setItem(key, JSON.stringify([...n]));
      } catch {}
      return n;
    });

  const input = "mt-1.5 w-full rounded-xl border border-line bg-white/[0.03] px-3 py-2 text-sm outline-none focus:border-mint/50 [color-scheme:dark]";

  return (
    <div className="grid gap-4">
      {/* Where the money went */}
      <section className="glass rounded-3xl p-6">
        <div className="flex items-center gap-2">
          <PiggyBank className="h-5 w-5 text-mint" />
          <h3 className="font-display text-lg font-semibold">Where your {money(result.totals.billed, cur)} went</h3>
        </div>
        <div className="mt-5 flex h-4 overflow-hidden rounded-full bg-white/5">
          {segments.map((g) => (
            <div key={g.label} className={`${g.bar} h-full transition-all duration-700`} style={{ width: `${(g.value / segTotal) * 100}%` }} title={`${g.label}: ${money(g.value, cur)}`} />
          ))}
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {segments.map((g) => (
            <div key={g.label} className="rounded-2xl border border-line p-4">
              <dt className="flex items-center gap-2 text-xs text-muted">
                <span className={`h-2 w-2 rounded-full ${g.bar}`} /> {g.label}
              </dt>
              <dd className={`font-display mt-1 text-xl font-semibold ${g.tone}`}>{money(g.value, cur)}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm text-ink-2">
          You were left paying <span className="font-semibold text-ink">{money(outOfPocket, cur)}</span>. If the selected points are upheld, that drops to{" "}
          <span className="font-semibold text-mint">{money(stillYours, cur)}</span>
          {outOfPocket > 0 && <>, a {Math.round(((outOfPocket - stillYours) / outOfPocket) * 100)}% cut</>}.
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        {/* Escalation ladder */}
        <section className="glass rounded-3xl p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-cyan" />
              <h3 className="font-display text-lg font-semibold">Escalation timeline</h3>
            </div>
            <label className="text-xs text-muted">
              Letter sent on
              <input type="date" value={sentOn} onChange={(e) => e.target.value && setSentOn(e.target.value)} className={input} />
            </label>
          </div>
          <ol className="relative mt-6 space-y-6 border-l border-line-2 pl-6">
            {steps.map((s, i) => (
              <li key={s.title} className="relative">
                <span className="absolute top-0 -left-[37px] grid h-7 w-7 place-items-center rounded-full border border-line-2 bg-bg-2 text-cyan">
                  <s.icon className="h-3.5 w-3.5" />
                </span>
                <p className="flex flex-wrap items-baseline gap-x-2 text-sm font-medium">
                  <span className="font-mono text-xs text-muted">{i + 1}</span> {s.title}
                  <span className="font-mono text-xs text-cyan">{s.when}</span>
                </p>
                <p className="mt-1 text-sm leading-relaxed text-ink-2">{s.body}</p>
              </li>
            ))}
          </ol>
          {hasMrp && (
            <p className="mt-6 flex gap-2 rounded-2xl border border-coral/30 bg-coral/5 p-4 text-sm text-ink-2">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-coral" />
              Charging above MRP can also be reported to the National Pharmaceutical Pricing Authority through its Pharma Jan Samadhan portal, separately from your refund claim.
            </p>
          )}
        </section>

        <div className="grid h-fit gap-4">
          {/* Interest calculator */}
          <section className="glass rounded-3xl p-6">
            <div className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-violet" />
              <h3 className="font-display text-lg font-semibold">Interest on late payment</h3>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">
              Insurers must settle within 30 days of your last document. Past that, IRDAI rules entitle you to interest at 2% above the RBI bank rate.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="text-xs text-muted">
                Last document sent
                <input type="date" value={docsOn} onChange={(e) => e.target.value && setDocsOn(e.target.value)} className={input} />
              </label>
              <label className="text-xs text-muted">
                Paid on (or today)
                <input type="date" value={paidOn} onChange={(e) => e.target.value && setPaidOn(e.target.value)} className={input} />
              </label>
              <label className="text-xs text-muted">
                Amount owed ({cur === "INR" ? "₹" : cur})
                <input type="number" min={0} value={amount} onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))} className={input} />
              </label>
              <label className="text-xs text-muted">
                RBI bank rate %
                <input type="number" min={0} step={0.05} value={bankRate} onChange={(e) => setBankRate(Math.max(0, Number(e.target.value) || 0))} className={input} />
              </label>
            </div>
            <div className="mt-4 flex items-end justify-between border-t border-line pt-4">
              <p className="text-sm text-muted">
                {late > 0 ? `${late} days late at ${(bankRate + 2).toFixed(2)}% a year` : elapsed <= 30 ? `Still within the 30-day window (day ${elapsed})` : ""}
              </p>
              <p className="font-display text-2xl font-semibold text-violet">{money(interest, cur, 0)}</p>
            </div>
            <p className="mt-2 text-xs text-muted">Check RBI&apos;s current bank rate before quoting this figure. Simple interest, indicative only.</p>
          </section>

          {/* Document checklist */}
          <section className="glass rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">Paper trail</h3>
              <span className="font-mono text-xs text-muted">
                {have.size}/{DOCS.length}
              </span>
            </div>
            <ul className="mt-3 space-y-1">
              {DOCS.map((d, i) => {
                const on = have.has(i);
                return (
                  <li key={d}>
                    <button type="button" onClick={() => toggleDoc(i)} className="flex w-full items-start gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-white/5">
                      <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border ${on ? "border-mint bg-mint text-black" : "border-line-2"}`}>
                        {on && <Check className="h-3 w-3" strokeWidth={3} />}
                      </span>
                      <span className={on ? "text-muted line-through" : "text-ink-2"}>{d}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
