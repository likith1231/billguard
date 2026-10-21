"use client";

import { AlertTriangle, ArrowRight, Download, FileUp, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import Background3D from "@/components/ui/Background3D";
import {
  CASE_STATUSES,
  ESCALATE_AFTER_DAYS,
  OPEN_KEY,
  caseTitle,
  daysSince,
  deleteCase,
  exportCases,
  importCases,
  parseCases,
  readRaw,
  subscribeCases,
  updateCase,
  type SavedCase,
} from "@/lib/cases";
import { download } from "@/lib/export";
import { money } from "@/lib/format";

const field = "w-full rounded-lg border border-line bg-white/[0.03] px-2.5 py-2 text-sm outline-none focus:border-mint/50 [color-scheme:dark]";

function CaseCard({ c }: { c: SavedCase }) {
  const router = useRouter();
  const cur = c.audit.extraction.currency;
  const days = daysSince(c.sentOn);
  const waiting = c.status === "sent_hospital" || c.status === "sent_insurer";
  const overdue = waiting && days !== null && days >= ESCALATE_AFTER_DAYS;
  const x = c.audit.extraction;

  return (
    <article className="glass rounded-3xl p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-semibold">{caseTitle(c)}</h2>
          <p className="mt-1 text-sm text-muted">
            {[x.patient.name, x.hospital.billNumber, `saved ${new Date(c.savedAt).toLocaleDateString("en-IN")}`].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted">Recoverable</p>
          <p className="font-display text-2xl font-semibold text-mint">{money(c.audit.totals.recoverable, cur)}</p>
        </div>
      </div>

      {overdue && (
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-amber/40 bg-amber/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
          <span>
            It&apos;s been {days} days with no reply. Time to escalate: for an insurer, write to the Insurance Ombudsman and register on the IRDAI Bima Bharosa portal; for a hospital, raise it with your insurer or a consumer forum.
          </span>
        </p>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs text-muted">
          Status
          <select value={c.status} onChange={(e) => updateCase(c.id, { status: e.target.value as SavedCase["status"] })} className={`${field} mt-1`}>
            {CASE_STATUSES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted">
          Letter sent on
          <input type="date" value={c.sentOn ?? ""} onChange={(e) => updateCase(c.id, { sentOn: e.target.value || null })} className={`${field} mt-1`} />
          {waiting && days !== null && !overdue && <span className="mt-1 block text-[11px]">{ESCALATE_AFTER_DAYS - days} days until you can escalate</span>}
        </label>
        <label className="text-xs text-muted">
          Amount recovered ({cur})
          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={c.recovered ?? ""}
            onChange={(e) => updateCase(c.id, { recovered: e.target.value === "" ? null : Math.max(0, Number(e.target.value)) })}
            className={`${field} mt-1`}
          />
        </label>
        <label className="text-xs text-muted sm:col-span-2 lg:col-span-1">
          Notes
          <input value={c.notes} maxLength={500} onChange={(e) => updateCase(c.id, { notes: e.target.value })} placeholder="Who you spoke to, ticket numbers…" className={`${field} mt-1`} />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            try {
              sessionStorage.setItem(OPEN_KEY, JSON.stringify(c.audit));
            } catch {}
            router.push("/audit");
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-mint px-4 py-2.5 text-sm font-semibold text-black hover:brightness-110"
        >
          Open audit <ArrowRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => confirm("Delete this saved case from this browser?") && deleteCase(c.id)}
          className="inline-flex items-center gap-2 rounded-xl border border-line px-3 py-2.5 text-sm text-muted hover:border-coral/50 hover:text-coral"
        >
          <Trash2 className="h-4 w-4" /> Delete
        </button>
      </div>
    </article>
  );
}

export default function CasesApp() {
  // The raw string is the snapshot, so React only re-renders when storage actually changes.
  const raw = useSyncExternalStore(subscribeCases, readRaw, () => null);
  const cases = useMemo(() => parseCases(raw), [raw]);
  const file = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const totals = useMemo(
    () => ({
      open: cases.filter((c) => c.status !== "resolved" && c.status !== "closed").length,
      claimed: cases.reduce((s, c) => s + c.audit.totals.recoverable, 0),
      recovered: cases.reduce((s, c) => s + (c.recovered ?? 0), 0),
    }),
    [cases],
  );

  return (
    <>
      <Background3D mode="calm" />
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[5] bg-bg/70" />
      <main className="relative z-10 mx-auto max-w-5xl px-4 pt-28 pb-24">
        <p className="font-mono text-xs tracking-[0.3em] text-mint">MY CASES</p>
        <h1 className="font-display mt-3 text-4xl font-semibold tracking-tight md:text-5xl">Track every dispute.</h1>
        <p className="mt-4 max-w-xl text-ink-2">
          Cases are saved in this browser only. There are no accounts and nothing is uploaded. Clearing site data deletes them, so export a backup if they matter.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/audit" className="rounded-xl bg-mint px-4 py-2.5 text-sm font-semibold text-black hover:brightness-110">
            New audit
          </Link>
          <button type="button" disabled={!cases.length} onClick={() => download("billguard-cases.json", exportCases(), "application/json")} className="glass inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm hover:bg-white/5 disabled:opacity-40">
            <Download className="h-4 w-4" /> Export backup
          </button>
          <button type="button" onClick={() => file.current?.click()} className="glass inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm hover:bg-white/5">
            <FileUp className="h-4 w-4" /> Import backup
          </button>
          <input
            ref={file}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              try {
                const n = importCases(await f.text());
                setNote({ ok: true, text: `Imported ${n} case${n === 1 ? "" : "s"}.` });
              } catch (err) {
                setNote({ ok: false, text: err instanceof Error && !(err instanceof SyntaxError) ? err.message : "That isn't a BillGuard backup file." });
              }
            }}
          />
        </div>
        {note && <p className={`mt-3 text-sm ${note.ok ? "text-mint" : "text-coral"}`}>{note.text}</p>}

        {cases.length > 0 && (
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              ["Open cases", String(totals.open)],
              ["Total disputed", money(totals.claimed, "INR")],
              ["Recovered so far", money(totals.recovered, "INR")],
            ].map(([l, v]) => (
              <div key={l} className="glass rounded-3xl p-5">
                <p className="text-sm text-ink-2">{l}</p>
                <p className="font-display mt-1 text-3xl font-semibold">{v}</p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 grid gap-4">
          {cases.length ? (
            cases.map((c) => <CaseCard key={c.id} c={c} />)
          ) : (
            <p className="glass rounded-3xl p-10 text-center text-ink-2">No saved cases yet. Run an audit and press “Save case”, or mark a letter as sent.</p>
          )}
        </div>
      </main>
    </>
  );
}
