"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

const STEPS = [
  "Reading every page of the bill",
  "Extracting line items, quantities and rates",
  "Matching deductions to bill lines",
  "Reading the policy wording",
  "Checking duplicates and package bundling",
  "Comparing rates with benchmarks and MRP",
  "Testing each deduction against the policy",
  "Ranking findings and quoting evidence",
];

export default function Scanning() {
  const [i, setI] = useState(0);
  const [pct, setPct] = useState(4);

  useEffect(() => {
    const a = setInterval(() => setI((x) => Math.min(STEPS.length - 1, x + 1)), 3800);
    // Asymptotic progress: we don't know the real duration, so ease toward 95%.
    const b = setInterval(() => setPct((p) => p + (95 - p) * 0.035), 300);
    return () => {
      clearInterval(a);
      clearInterval(b);
    };
  }, []);

  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-end pb-8 text-center">
      <div className="glass-strong w-full max-w-md rounded-3xl p-6" role="status" aria-live="polite">
        <p className="font-mono text-xs tracking-[0.3em] text-mint">AUDITING</p>
        <div className="relative mt-3 h-7 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.p
              key={i}
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -24, opacity: 0 }}
              className="font-display absolute inset-x-0 text-lg font-medium"
            >
              {STEPS[i]}…
            </motion.p>
          </AnimatePresence>
        </div>
        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/5">
          <div className="h-full rounded-full bg-gradient-to-r from-mint to-violet transition-[width] duration-300" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-3 text-xs text-muted">A detailed audit of a long bill can take a minute or two.</p>
      </div>
    </div>
  );
}
