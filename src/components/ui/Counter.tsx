"use client";

import { animate, useInView } from "motion/react";
import { useEffect, useRef } from "react";

/** Counts up to `value` when scrolled into view. */
export default function Counter({ value, prefix = "", decimals = 0, duration = 1.6 }: { value: number; prefix?: string; decimals?: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView || !ref.current) return;
    const el = ref.current;
    const c = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        el.textContent = prefix + v.toLocaleString("en-IN", { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
      },
    });
    return () => c.stop();
  }, [inView, value, prefix, decimals, duration]);

  return <span ref={ref}>{prefix}0</span>;
}
