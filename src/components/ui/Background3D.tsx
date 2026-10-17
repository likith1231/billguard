"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import type { SceneMode } from "@/components/three/Scene";

const Scene = dynamic(() => import("@/components/three/Scene"), { ssr: false });

/** Fixed full-viewport 3D layer with an aurora behind it. */
export default function Background3D({ mode = "hero", trackScroll = false }: { mode?: SceneMode; trackScroll?: boolean }) {
  const sceneLayer = useRef<HTMLDivElement>(null);

  // Past the hero, fade the 3D back so it stays ambient behind section text.
  useEffect(() => {
    if (!trackScroll) return;
    const onScroll = () => {
      const p = Math.min(1, window.scrollY / (window.innerHeight * 0.8));
      if (sceneLayer.current) sceneLayer.current.style.opacity = String(1 - p * 0.72);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [trackScroll]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
      <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_75%_30%,rgba(77,255,181,0.14),transparent_60%),radial-gradient(50%_45%_at_15%_80%,rgba(139,123,255,0.16),transparent_60%),radial-gradient(40%_40%_at_50%_0%,rgba(90,215,255,0.10),transparent_60%)]" />
      <div className="grid-fade absolute inset-0 opacity-60" />
      <div ref={sceneLayer} className="absolute inset-0">
        <Scene mode={mode} trackScroll={trackScroll} />
      </div>
    </div>
  );
}
