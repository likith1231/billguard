"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Float, Lightformer, MeshTransmissionMaterial, Sparkles } from "@react-three/drei";
import { Bloom, ChromaticAberration, EffectComposer, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

export type SceneMode = "hero" | "calm" | "scan" | "done";

const MINT = new THREE.Color("#4dffb5");
const CORAL = new THREE.Color("#ff5d73");
const SHIELD_BG = new THREE.Color("#0c1a24");
const SHEET_W = 2.2;
const SHEET_H = 3.1;

/* ------------------------------------------------------------------ */
/* Bill sheet texture: a holographic invoice drawn on a 2D canvas      */
/* ------------------------------------------------------------------ */

type SheetSpec = { title: string; rows: number; flagged: number[]; seed: number };

function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

function makeSheetTexture(spec: SheetSpec) {
  const W = 512;
  const H = Math.round((W * SHEET_H) / SHEET_W);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const r = rng(spec.seed);

  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "rgba(20,32,60,0.92)");
  bg.addColorStop(1, "rgba(8,12,28,0.92)");
  g.fillStyle = bg;
  g.beginPath();
  g.roundRect(4, 4, W - 8, H - 8, 22);
  g.fill();
  g.strokeStyle = "rgba(77,255,181,0.55)";
  g.lineWidth = 3;
  g.stroke();

  g.fillStyle = "rgba(77,255,181,0.95)";
  g.font = "700 30px monospace";
  g.fillText(spec.title, 36, 64);
  g.fillStyle = "rgba(180,200,230,0.55)";
  g.font = "18px monospace";
  g.fillText(`NO. ${Math.floor(r() * 90000 + 10000)}   ·   IP/26`, 36, 96);
  g.fillRect(36, 116, W - 72, 2);

  const top = 150;
  const rowH = (H - top - 120) / spec.rows;
  for (let i = 0; i < spec.rows; i++) {
    const y = top + i * rowH;
    const flagged = spec.flagged.includes(i);
    if (flagged) {
      g.fillStyle = "rgba(255,93,115,0.18)";
      g.fillRect(24, y - 6, W - 48, rowH - 6);
      g.fillStyle = "rgba(255,93,115,1)";
      g.fillRect(24, y - 6, 5, rowH - 6);
    }
    g.fillStyle = flagged ? "rgba(255,170,180,0.95)" : "rgba(200,215,240,0.55)";
    const w = 120 + r() * 170;
    g.beginPath();
    g.roundRect(44, y + 4, w, 12, 6);
    g.fill();
    g.fillStyle = flagged ? "rgba(255,93,115,0.95)" : "rgba(200,215,240,0.35)";
    g.beginPath();
    g.roundRect(44, y + 24, w * 0.45, 8, 4);
    g.fill();
    g.fillStyle = flagged ? "rgba(255,120,135,1)" : "rgba(220,230,250,0.75)";
    g.font = "600 20px monospace";
    const amt = (Math.floor(r() * 9000) + 300).toLocaleString("en-IN");
    g.textAlign = "right";
    g.fillText(`₹${amt}`, W - 44, y + 22);
    g.textAlign = "left";
  }

  g.fillStyle = "rgba(77,255,181,0.25)";
  g.fillRect(36, H - 100, W - 72, 2);
  g.fillStyle = "rgba(77,255,181,1)";
  g.font = "700 26px monospace";
  g.fillText("TOTAL", 36, H - 56);
  g.textAlign = "right";
  g.fillText("₹1,73,500", W - 36, H - 56);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return { tex, rowY: (i: number) => SHEET_H / 2 - ((top + i * rowH + rowH / 2 - 6) / H) * SHEET_H };
}

/* ------------------------------------------------------------------ */

type Shared = { mode: SceneMode; scroll: React.RefObject<number>; reduced: boolean };

function Sheet({
  spec,
  position,
  rotation,
  index,
  beamY,
  shared,
}: {
  spec: SheetSpec;
  position: [number, number, number];
  rotation: [number, number, number];
  index: number;
  beamY: React.RefObject<number>;
  shared: Shared;
}) {
  const { tex, rowY } = useMemo(() => makeSheetTexture(spec), [spec]);
  const group = useRef<THREE.Group>(null);
  const pins = useRef<(THREE.Mesh | null)[]>([]);
  const pulse = useRef<number[]>(spec.flagged.map(() => 0));

  useEffect(() => () => tex.dispose(), [tex]);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const p = shared.scroll.current ?? 0;
    const spread = shared.mode === "scan" ? 0.15 : shared.mode === "done" ? 0.9 : 0.35 + p * 0.9;
    const tx = position[0] + (index - 1) * spread;
    const tz = position[2] - (shared.mode === "done" ? 1.2 : 0);
    g.position.x = THREE.MathUtils.damp(g.position.x, tx, 3, dt);
    g.position.z = THREE.MathUtils.damp(g.position.z, tz, 3, dt);
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, rotation[1] + (index - 1) * 0.12 * (1 + p), 3, dt);

    // Pins only light up on the front sheet, as the beam crosses each flagged row.
    spec.flagged.forEach((row, k) => {
      const m = pins.current[k];
      if (!m) return;
      if (index === 2 && Math.abs((beamY.current ?? 99) - rowY(row)) < 0.06) pulse.current[k] = 1;
      const target = shared.mode === "done" || shared.mode === "hero" ? Math.max(pulse.current[k], 0.6) : pulse.current[k];
      pulse.current[k] = Math.max(0, pulse.current[k] - dt * 0.35);
      const s = THREE.MathUtils.damp(m.scale.x, target, 8, dt);
      m.scale.setScalar(s);
    });
  });

  return (
    <group ref={group} position={position} rotation={rotation}>
      <mesh>
        <planeGeometry args={[SHEET_W, SHEET_H]} />
        <meshBasicMaterial map={tex} transparent side={THREE.DoubleSide} toneMapped={false} opacity={0.96} depthWrite={false} />
      </mesh>
      {spec.flagged.map((row, k) => (
        <mesh
          key={row}
          ref={(m) => {
            pins.current[k] = m;
          }}
          position={[SHEET_W / 2 + 0.08, rowY(row), 0.05]}
          scale={0}
        >
          <sphereGeometry args={[0.07, 24, 24]} />
          <meshBasicMaterial color={CORAL} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function ScanBeam({ beamY, shared }: { beamY: React.RefObject<number>; shared: Shared }) {
  const ref = useRef<THREE.Group>(null);
  const t = useRef(0);
  const glowTex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 4;
    c.height = 128;
    const g = c.getContext("2d")!;
    const grd = g.createLinearGradient(0, 0, 0, 128);
    grd.addColorStop(0, "rgba(77,255,181,0)");
    grd.addColorStop(0.5, "rgba(77,255,181,0.55)");
    grd.addColorStop(1, "rgba(77,255,181,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 4, 128);
    return new THREE.CanvasTexture(c);
  }, []);

  // Publishes the beam height through a ref each frame for the sheets' pins (idiomatic R3F).
  // eslint-disable-next-line react-hooks/immutability
  useFrame((_, dt) => {
    if (!ref.current) return;
    const speed = shared.reduced ? 0 : shared.mode === "scan" ? 2.2 : shared.mode === "done" ? 0 : 0.7;
    t.current += dt * speed;
    const y = Math.sin(t.current) * (SHEET_H / 2 - 0.15);
    ref.current.position.y = y;
    // eslint-disable-next-line react-hooks/immutability
    beamY.current = y;
    const vis = shared.mode === "done" ? 0 : 1;
    ref.current.scale.x = Math.max(0.0001, THREE.MathUtils.damp(ref.current.scale.x, vis, 4, dt));
  });

  return (
    <group ref={ref} position={[0, 0, 0.32]}>
      <mesh>
        <planeGeometry args={[SHEET_W + 0.7, 0.025]} />
        <meshBasicMaterial color={MINT} toneMapped={false} />
      </mesh>
      <mesh>
        <planeGeometry args={[SHEET_W + 0.7, 0.5]} />
        <meshBasicMaterial map={glowTex} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

function shieldGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0, 1.2);
  s.bezierCurveTo(0.45, 1.02, 0.8, 0.98, 1.0, 0.98);
  s.lineTo(1.0, 0.15);
  s.bezierCurveTo(1.0, -0.55, 0.55, -1.0, 0, -1.3);
  s.bezierCurveTo(-0.55, -1.0, -1.0, -0.55, -1.0, 0.15);
  s.lineTo(-1.0, 0.98);
  s.bezierCurveTo(-0.8, 0.98, -0.45, 1.02, 0, 1.2);
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.28,
    bevelEnabled: true,
    bevelThickness: 0.12,
    bevelSize: 0.1,
    bevelSegments: 10,
    curveSegments: 48,
  });
  geo.center();
  return geo;
}

function Shield({ shared }: { shared: Shared }) {
  const ref = useRef<THREE.Group>(null);
  const check = useRef<THREE.MeshBasicMaterial>(null);
  const ring = useRef<THREE.Group>(null);
  const geo = useMemo(() => shieldGeometry(), []);
  const tube = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(
      [new THREE.Vector3(-0.42, 0.02, 0), new THREE.Vector3(-0.12, -0.3, 0), new THREE.Vector3(0.48, 0.38, 0)],
      false,
      "catmullrom",
      0.05,
    );
    return new THREE.TubeGeometry(curve, 64, 0.075, 16, false);
  }, []);

  useFrame((state, dt) => {
    const g = ref.current;
    if (!g) return;
    const p = shared.scroll.current ?? 0;
    const t = state.clock.elapsedTime;
    const spin = shared.reduced ? 0 : Math.sin(t * 0.5) * 0.35;
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, spin + p * Math.PI * 1.2, 2.5, dt);
    const targetScale = shared.mode === "scan" ? 0.45 : shared.mode === "done" ? 0.95 : 0.78;
    g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, targetScale, 3, dt));
    const tz = shared.mode === "scan" ? -1.4 : 1.1;
    g.position.z = THREE.MathUtils.damp(g.position.z, tz, 3, dt);
    if (check.current) {
      const base = shared.mode === "scan" ? 0.35 : 1;
      check.current.color.copy(MINT).multiplyScalar(base * (1.4 + Math.sin(t * 2.2) * 0.4));
    }
    if (ring.current && !shared.reduced) {
      ring.current.rotation.z += dt * 0.4;
      ring.current.rotation.x = Math.sin(t * 0.3) * 0.3 + 1.2;
    }
  });

  return (
    <group ref={ref} position={[1.05, -0.45, 1.1]} scale={0.78}>
      <mesh geometry={geo}>
        <MeshTransmissionMaterial
          samples={6}
          resolution={512}
          thickness={0.55}
          roughness={0.06}
          ior={1.35}
          chromaticAberration={0.08}
          anisotropicBlur={0.2}
          distortion={0.15}
          distortionScale={0.4}
          temporalDistortion={0.08}
          backside
          backsideThickness={0.3}
          color="#eafff6"
          background={SHIELD_BG}
          attenuationColor="#b7ffe3"
          attenuationDistance={2.5}
        />
      </mesh>
      <mesh geometry={tube} position={[0, 0, 0.02]}>
        <meshBasicMaterial ref={check} color={MINT} toneMapped={false} />
      </mesh>
      <group ref={ring}>
        <mesh>
          <torusGeometry args={[1.55, 0.008, 8, 160]} />
          <meshBasicMaterial color="#8b7bff" toneMapped={false} transparent opacity={0.8} />
        </mesh>
        {[0, 1, 2, 3, 4].map((i) => {
          const a = (i / 5) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 1.55, Math.sin(a) * 1.55, 0]} rotation={[a, a, 0]}>
              <boxGeometry args={[0.09, 0.09, 0.09]} />
              <meshBasicMaterial color={i % 2 ? "#5ad7ff" : "#4dffb5"} toneMapped={false} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

const SHEETS: SheetSpec[] = [
  { title: "POLICY", rows: 9, flagged: [5], seed: 11 },
  { title: "INSURER", rows: 8, flagged: [2, 6], seed: 29 },
  { title: "HOSPITAL BILL", rows: 10, flagged: [2, 5, 8], seed: 7 },
];

function Rig({ shared }: { shared: Shared }) {
  const group = useRef<THREE.Group>(null);
  const narrow = useThree((s) => s.viewport.width < 7.5);

  useFrame(({ camera, pointer, viewport }, dt) => {
    const g = group.current;
    if (!g) return;
    const p = shared.scroll.current ?? 0;
    const heroX = narrow ? 0 : viewport.width * (shared.mode === "calm" ? 0.26 : 0.17);
    const tx = shared.mode === "scan" ? 0 : heroX + p * (narrow ? 0 : viewport.width * 0.12);
    const ty = shared.mode === "scan" ? 0.35 : (narrow ? 1.25 : -0.1) + p * 0.6;
    g.position.x = THREE.MathUtils.damp(g.position.x, tx, 2.5, dt);
    g.position.y = THREE.MathUtils.damp(g.position.y, ty, 2.5, dt);
    const s = narrow ? (shared.mode === "scan" ? 0.7 : 0.55) : shared.mode === "calm" ? 0.85 : 1;
    g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, s, 3, dt));
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, -0.08 + p * 0.25, 2.5, dt);

    const k = shared.reduced ? 0 : 1;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, pointer.x * 0.7 * k, 2, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, pointer.y * 0.45 * k, 2, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, 8 + p * 1.2, 2, dt);
    camera.lookAt(0, 0, 0);
  });

  const beamY = useRef(0);
  return (
    <group ref={group} scale={narrow ? 0.72 : 1}>
      <Float speed={shared.reduced ? 0 : 1.4} rotationIntensity={0.25} floatIntensity={0.6}>
        <group rotation={[0, -0.35, 0]}>
          {SHEETS.map((spec, i) => (
            <Sheet
              key={spec.title}
              spec={spec}
              index={i}
              position={[-0.5 + i * 0.28, 0.1 - i * 0.08, -0.7 + i * 0.35]}
              rotation={[0, 0.25, 0.04 * (1 - i)]}
              beamY={beamY}
              shared={shared}
            />
          ))}
          <group position={[-0.5 + 2 * 0.28, 0.1 - 2 * 0.08, -0.7 + 2 * 0.35]} rotation={[0, 0.25, 0]}>
            <ScanBeam beamY={beamY} shared={shared} />
          </group>
        </group>
        <Shield shared={shared} />
      </Float>
    </group>
  );
}

export default function Scene({ mode = "hero", trackScroll = false }: { mode?: SceneMode; trackScroll?: boolean }) {
  const scroll = useRef(0);
  const reduced = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  useEffect(() => {
    if (!trackScroll) return;
    const onScroll = () => {
      scroll.current = Math.min(1.5, window.scrollY / window.innerHeight);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [trackScroll]);

  const shared: Shared = { mode, scroll, reduced };

  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0, 8], fov: 38 }}
      eventSource={typeof document !== "undefined" ? document.body : undefined}
      eventPrefix="client"
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.4} />
        <Environment resolution={256}>
          <Lightformer form="rect" intensity={4} color="#4dffb5" position={[-5, 2, -2]} scale={[8, 2, 1]} />
          <Lightformer form="rect" intensity={3} color="#8b7bff" position={[5, -1, -3]} scale={[8, 3, 1]} />
          <Lightformer form="ring" intensity={2.5} color="#ffffff" position={[0, 4, 4]} scale={3} />
          <Lightformer form="rect" intensity={1.5} color="#5ad7ff" position={[0, -4, 2]} scale={[10, 1, 1]} />
        </Environment>
        <Rig shared={shared} />
        <Sparkles count={140} scale={[16, 9, 6]} size={2.2} speed={reduced ? 0 : 0.25} opacity={0.55} color="#4dffb5" />
        <Sparkles count={70} scale={[16, 9, 6]} size={3} speed={reduced ? 0 : 0.18} opacity={0.4} color="#8b7bff" />
        <EffectComposer multisampling={4}>
          <Bloom mipmapBlur intensity={0.9} luminanceThreshold={0.35} luminanceSmoothing={0.2} />
          <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={new THREE.Vector2(0.0006, 0.0008)} />
          <Vignette eskil={false} offset={0.2} darkness={0.75} />
        </EffectComposer>
      </Suspense>
    </Canvas>
  );
}
