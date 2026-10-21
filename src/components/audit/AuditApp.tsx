"use client";

import { AnimatePresence, motion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import Background3D from "@/components/ui/Background3D";
import type { RateContext } from "@/lib/benchmarks";
import { manualSummary } from "@/lib/manual";
import { buildAudit } from "@/lib/rules";
import type { AuditResult, Extraction } from "@/lib/schema";
import Results from "./Results";
import Scanning from "./Scanning";
import Uploader, { type Files } from "./Uploader";

type State = { phase: "idle" } | { phase: "scanning" } | { phase: "done"; result: AuditResult } | { phase: "error"; message: string };

const KEY = "billguard:last-audit";
const RATES_KEY = "billguard:rates";

export default function AuditApp() {
  const params = useSearchParams();
  const [state, setState] = useState<State>({ phase: "idle" });
  const ran = useRef(false);
  const [manual, setManual] = useState(false);
  const [rates, setRatesState] = useState<RateContext>({});
  const ratesRef = useRef(rates);
  const setRates = (r: RateContext) => {
    ratesRef.current = r;
    setRatesState(r);
    try {
      localStorage.setItem(RATES_KEY, JSON.stringify(r));
    } catch {}
  };

  const run = useCallback(async (files: Files | null, notes = "") => {
    setState({ phase: "scanning" });
    window.scrollTo({ top: 0, behavior: "smooth" });
    const fd = new FormData();
    if (!files) fd.set("demo", "1");
    else {
      files.bill.forEach((f) => fd.append("bill", f));
      files.insurer_letter.forEach((f) => fd.append("insurer_letter", f));
      files.policy.forEach((f) => fd.append("policy", f));
      if (notes) fd.set("notes", notes);
      const r = ratesRef.current;
      if (r.city) fd.set("city", r.city);
      if (r.custom?.length) fd.set("rates", JSON.stringify(r.custom));
    }
    try {
      const res = await fetch("/api/audit", { method: "POST", body: fd });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `Audit failed (${res.status})`);
      const result = body as AuditResult;
      try {
        sessionStorage.setItem(KEY, JSON.stringify(result));
      } catch {}
      setState({ phase: "done", result });
    } catch (e) {
      setState({ phase: "error", message: e instanceof Error ? e.message : "Audit failed" });
    }
  }, []);

  // Manual entry runs the rules engine locally; the pause lets the scan animation play.
  const runManual = useCallback(async (x: Extraction) => {
    setState({ phase: "scanning" });
    window.scrollTo({ top: 0, behavior: "smooth" });
    await new Promise((r) => setTimeout(r, 1400));
    const audit = buildAudit(x, "manual", ratesRef.current);
    audit.extraction.summary = manualSummary(x, audit.findings.length, audit.totals.recoverable);
    try {
      sessionStorage.setItem(KEY, JSON.stringify(audit));
    } catch {}
    setState({ phase: "done", result: audit });
  }, []);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    try {
      const saved = localStorage.getItem(RATES_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setRates(JSON.parse(saved));
    } catch {}
    // Runs once after hydration: either start the sample audit or restore this tab's last result.
    if (params.get("sample") === "1") {
      run(null);
      return;
    }
    try {
      const saved = sessionStorage.getItem(KEY);
      if (saved) setState({ phase: "done", result: JSON.parse(saved) });
    } catch {}
  }, [params, run]);

  const reset = () => {
    setManual(false);
    try {
      sessionStorage.removeItem(KEY);
    } catch {}
    setState({ phase: "idle" });
  };

  const mode = state.phase === "scanning" ? "scan" : state.phase === "done" ? "done" : "calm";

  return (
    <>
      <Background3D mode={mode} />
      {(state.phase === "done" || (manual && state.phase !== "scanning")) && <div aria-hidden className="pointer-events-none fixed inset-0 z-[5] bg-bg/70" />}
      <main className="relative z-10 mx-auto max-w-6xl px-4 pt-28 pb-24">
        <AnimatePresence mode="wait">
          {state.phase === "idle" || state.phase === "error" ? (
            <motion.div key="up" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20, filter: "blur(6px)" }}>
              <Uploader onRun={run} onManual={runManual} onModeChange={(m) => setManual(m === "manual")} rates={rates} onRates={setRates} error={state.phase === "error" ? state.message : null} />
            </motion.div>
          ) : state.phase === "scanning" ? (
            <motion.div key="scan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Scanning />
            </motion.div>
          ) : (
            <motion.div key="res" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
              <Results result={state.result} onReset={reset} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </>
  );
}
