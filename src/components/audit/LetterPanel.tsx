"use client";

import { Check, Copy, Download, Landmark, Loader2, Printer, Receipt, Wand2 } from "lucide-react";
import { useRef, useState } from "react";
import { money } from "@/lib/format";
import { partyFor } from "@/lib/rules";
import type { AuditResult } from "@/lib/schema";

type Recipient = "insurer" | "hospital";

export default function LetterPanel({
  result,
  selected,
  setSelected,
}: {
  result: AuditResult;
  selected: Set<string>;
  setSelected: (s: Set<string>) => void;
}) {
  const hasInsurer = result.findings.some((f) => partyFor(f) === "insurer");
  const [recipient, setRecipient] = useState<Recipient>(hasInsurer ? "insurer" : "hospital");
  const [sender, setSender] = useState(result.extraction.patient.name ?? "");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const abort = useRef<AbortController | null>(null);

  const forRecipient = result.findings.filter((f) => partyFor(f) === recipient);
  const picked = forRecipient.filter((f) => selected.has(f.id));
  const total = picked.reduce((s, f) => s + f.disputedAmount, 0);

  function pick(r: Recipient) {
    setRecipient(r);
    setText("");
    setSelected(new Set(result.findings.filter((f) => partyFor(f) === r).map((f) => f.id)));
  }

  async function generate() {
    abort.current?.abort();
    const ctl = new AbortController();
    abort.current = ctl;
    setBusy(true);
    setError(null);
    setText("");
    try {
      const res = await fetch("/api/letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audit: result, recipient, findingIds: picked.map((f) => f.id), sender }),
        signal: ctl.signal,
      });
      if (!res.ok || !res.body) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error ?? "Couldn't draft the letter.");
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        setText((t) => t + dec.decode(value, { stream: true }));
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function download() {
    const blob = new Blob([text], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `billguard-dispute-${recipient}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <section id="letter" className="mt-16 scroll-mt-28">
      <p className="font-mono text-xs tracking-[0.3em] text-mint">DISPUTE LETTER</p>
      <h2 className="font-display mt-2 text-3xl font-semibold tracking-tight">Turn findings into a letter.</h2>

      <div className="mt-6 grid gap-6 lg:grid-cols-[22rem_1fr]">
        <div className="glass h-fit space-y-5 rounded-3xl p-5">
          <div>
            <p className="text-sm font-medium">Send to</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(
                [
                  ["insurer", "Insurer", Landmark],
                  ["hospital", "Hospital", Receipt],
                ] as const
              ).map(([r, l, Icon]) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => pick(r)}
                  className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition ${recipient === r ? "border-mint/60 bg-mint/10 text-mint" : "border-line text-ink-2 hover:text-ink"}`}
                >
                  <Icon className="h-4 w-4" /> {l}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="text-sm font-medium">Your name</span>
            <input
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              placeholder="Name to sign with"
              className="mt-2 w-full rounded-xl border border-line bg-white/[0.03] px-3 py-2.5 text-sm outline-none focus:border-mint/50"
            />
          </label>

          <div>
            <p className="text-sm font-medium">
              Points to include <span className="text-muted">({picked.length})</span>
            </p>
            <ul className="scrollbar-thin mt-2 max-h-64 space-y-1 overflow-y-auto pr-1">
              {forRecipient.length === 0 && <li className="text-sm text-muted">No findings to raise with the {recipient}.</li>}
              {forRecipient.map((f) => {
                const on = selected.has(f.id);
                return (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => {
                        const n = new Set(selected);
                        if (on) n.delete(f.id);
                        else n.add(f.id);
                        setSelected(n);
                      }}
                      className="flex w-full items-start gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-white/5"
                    >
                      <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border ${on ? "border-mint bg-mint text-black" : "border-line-2"}`}>
                        {on && <Check className="h-3 w-3" strokeWidth={3} />}
                      </span>
                      <span className="min-w-0 flex-1 text-ink-2">{f.title}</span>
                      <span className="font-mono text-xs">{money(f.disputedAmount, result.extraction.currency)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="flex items-center justify-between border-t border-line pt-4 text-sm">
            <span className="text-muted">Total requested</span>
            <span className="font-display text-xl font-semibold text-mint">{money(total, result.extraction.currency)}</span>
          </div>

          <button
            type="button"
            disabled={!picked.length || busy}
            onClick={generate}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-mint px-4 py-3 font-semibold text-black transition enabled:hover:brightness-110 disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            {busy ? "Drafting…" : text ? "Redraft letter" : "Draft letter"}
          </button>
          {error && <p className="text-sm text-coral">{error}</p>}
        </div>

        <div style={{ perspective: 1400 }}>
          <div
            className="print-area relative min-h-[32rem] rounded-3xl border border-white/10 bg-[#f6f4ee] p-6 text-[#1b1d22] shadow-[0_40px_120px_-30px_rgba(77,255,181,0.35)] transition-transform duration-700 md:p-10"
            style={{ transform: text ? "rotateX(0deg)" : "rotateX(8deg) translateY(10px)" }}
          >
            {text ? (
              <>
                <div className="absolute top-4 right-4 flex gap-1.5 print:hidden">
                  {[
                    { label: copied ? "Copied" : "Copy", icon: copied ? Check : Copy, on: copy },
                    { label: "Download", icon: Download, on: download },
                    { label: "Print", icon: Printer, on: () => window.print() },
                  ].map((b) => (
                    <button
                      key={b.label}
                      type="button"
                      onClick={b.on}
                      disabled={busy}
                      title={b.label}
                      aria-label={b.label}
                      className="grid h-9 w-9 place-items-center rounded-lg bg-black/5 text-black/70 transition hover:bg-black/10 disabled:opacity-40"
                    >
                      <b.icon className="h-4 w-4" />
                    </button>
                  ))}
                </div>
                {busy ? (
                  <pre className="caret font-mono text-[13px] leading-relaxed whitespace-pre-wrap">{text}</pre>
                ) : (
                  <textarea
                    aria-label="Dispute letter (editable)"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="h-[60rem] max-h-[80vh] w-full resize-none bg-transparent font-mono text-[13px] leading-relaxed outline-none"
                  />
                )}
              </>
            ) : (
              <div className="grid h-full min-h-[28rem] place-items-center text-center text-black/50">
                <div>
                  <Wand2 className="mx-auto h-8 w-8" />
                  <p className="mt-3 font-medium">Your letter will appear here</p>
                  <p className="mt-1 text-sm">Pick a recipient and the points to raise, then draft it. You can edit the text before sending.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
