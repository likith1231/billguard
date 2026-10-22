"use client";

import { BookmarkCheck, Check, Copy, Download, Landmark, Loader2, Mail, Printer, Receipt, Send, Wand2 } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { saveCase } from "@/lib/cases";
import { emailSubject, gmailUrl, looksLikeEmail, mailtoUrl } from "@/lib/email";
import { money } from "@/lib/format";
import { LANGS, type Lang } from "@/lib/letter-i18n";
import { partyFor } from "@/lib/rules";
import type { AuditResult } from "@/lib/schema";
import { printView } from "./ReportPrint";

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
  const [source, setSource] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  const [to, setTo] = useState("");
  const [mailNote, setMailNote] = useState<string | null>(null);
  const [sentFor, setSentFor] = useState<Recipient | null>(null);
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
    setSource(null);
    setText("");
    try {
      const res = await fetch("/api/letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audit: result, recipient, findingIds: picked.map((f) => f.id), sender, lang }),
        signal: ctl.signal,
      });
      if (!res.ok || !res.body) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error ?? "Couldn't draft the letter.");
      }
      setSource(res.headers.get("X-Letter-Source"));
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

  // BillGuard has no mail server: the letter opens pre-filled in the user's own email app or Gmail.
  const subject = emailSubject(result, recipient, lang);
  async function openMail(kind: "app" | "gmail") {
    setMailNote(null);
    if (kind === "gmail") {
      window.open(gmailUrl(to, subject, text), "_blank", "noopener");
      return;
    }
    const { href, fits } = mailtoUrl(to, subject, text);
    if (!fits) {
      await navigator.clipboard.writeText(text).catch(() => {});
      setMailNote("The letter is long, so it was copied to your clipboard. Paste it into the email body.");
    }
    window.location.href = href;
  }

  function markSent() {
    saveCase(result, { status: recipient === "insurer" ? "sent_insurer" : "sent_hospital", sentOn: new Date().toISOString().slice(0, 10) });
    setSentFor(recipient);
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

          <div>
            <p className="text-sm font-medium">Language</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {LANGS.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setLang(l.id)}
                  aria-pressed={lang === l.id}
                  className={`rounded-xl border px-3 py-2.5 text-sm transition ${lang === l.id ? "border-mint/60 bg-mint/10 text-mint" : "border-line text-ink-2 hover:text-ink"}`}
                >
                  {l.label}
                </button>
              ))}
            </div>
            {lang !== "en" && (
              <p className="mt-2 text-xs text-muted">
                {result.mode === "live"
                  ? "Written by AI. Have someone who reads the language check it before you send."
                  : "Without an AI audit only the letter frame is translated; the details of each point stay in English. An AI audit writes the whole letter in the language."}
              </p>
            )}
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
          {!error && source === "template-signin" && (
            <p className="text-sm text-ink-2">
              This is the template letter. <Link href="/login?next=/audit" className="font-medium text-mint hover:underline">Sign in</Link> to have Claude write one around your exact findings.
            </p>
          )}
          {!error && source === "template-quota" && <p className="text-sm text-ink-2">You&apos;ve used today&apos;s AI-written letters, so this is the template letter. The AI count resets at midnight UTC.</p>}
        </div>

        <div style={{ perspective: 1400 }}>
          {text && !busy && (
            <div className="glass mb-4 rounded-3xl p-4 print:hidden">
              <div className="flex flex-wrap items-end gap-3">
                <label className="min-w-56 flex-1 text-xs text-muted">
                  Send to ({recipient === "insurer" ? "insurer's grievance email" : "hospital's billing email"})
                  <input
                    type="email"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    placeholder={recipient === "insurer" ? "grievance@insurer.com" : "billing@hospital.com"}
                    className="mt-1 w-full rounded-lg border border-line bg-white/[0.03] px-2.5 py-2 text-sm text-ink outline-none placeholder:text-muted/70 focus:border-mint/50"
                  />
                </label>
                <button type="button" disabled={!looksLikeEmail(to)} onClick={() => openMail("app")} className="inline-flex items-center gap-2 rounded-xl bg-mint px-4 py-2.5 text-sm font-semibold text-black enabled:hover:brightness-110 disabled:opacity-40">
                  <Mail className="h-4 w-4" /> Open in email app
                </button>
                <button type="button" disabled={!looksLikeEmail(to)} onClick={() => openMail("gmail")} className="glass inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm hover:bg-white/5 disabled:opacity-40">
                  <Send className="h-4 w-4" /> Gmail
                </button>
              </div>
              <p className="mt-2 text-xs text-muted">Your email app opens with the letter filled in. You press send, so nothing leaves BillGuard on its own. Attach the bill and insurer letter yourself.</p>
              {mailNote && <p className="mt-1 text-xs text-amber">{mailNote}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-3 text-sm">
                {sentFor === recipient ? (
                  <span className="inline-flex items-center gap-2 text-mint">
                    <BookmarkCheck className="h-4 w-4" /> Saved as sent. We&apos;ll remind you at 15 days.{" "}
                    <Link href="/cases" className="underline underline-offset-2">
                      View cases
                    </Link>
                  </span>
                ) : (
                  <button type="button" onClick={markSent} className="inline-flex items-center gap-2 text-ink-2 hover:text-mint">
                    <BookmarkCheck className="h-4 w-4" /> I sent this letter — track it
                  </button>
                )}
              </div>
            </div>
          )}
          <div
            className="relative min-h-[32rem] rounded-3xl border border-white/10 bg-[#f6f4ee] p-6 text-[#1b1d22] shadow-[0_40px_120px_-30px_rgba(77,255,181,0.35)] transition-transform duration-700 md:p-10"
            style={{ transform: text ? "rotateX(0deg)" : "rotateX(8deg) translateY(10px)" }}
          >
            {text ? (
              <>
                <div className="absolute top-4 right-4 flex gap-1.5 print:hidden">
                  {[
                    { label: copied ? "Copied" : "Copy", icon: copied ? Check : Copy, on: copy },
                    { label: "Download", icon: Download, on: download },
                    { label: "Print", icon: Printer, on: () => printView("letter") },
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
      {createPortal(<pre className="print-letter hidden bg-white p-4 font-mono text-[11pt] leading-relaxed whitespace-pre-wrap text-black">{text}</pre>, document.body)}
    </section>
  );
}
