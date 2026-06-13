"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { Line, Stars } from "@react-three/drei";
import { useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import * as THREE from "three";
import type { LoopResult } from "@/lib/worldline/types";

// Label-free by design: the 3D shows STRUCTURE (orbs + halos + edges + the fork);
// all text lives in the 2D readout. Nodes reveal in sequence (propagation), not
// a single state-swap. No per-frame <Html> => no jank, no overlapping labels.

const COL = { neutral: "#54657f", llm: "#5b8cff", culprit: "#ffd166", fail: "#ff5a52", pass: "#3ddc84", accent: "#5b8cff" };
const SP = 1.85;
const BR = 1.75;
const XOFF = -3.5 * SP;
const IDX: Record<string, number> = { intake: 0, fraud_check: 1, classify: 2, retrieve_policy: 3, eligibility: 4, amount: 5, decision: 6, outcome: 7 };
function P(id: string, branch = false): [number, number, number] {
  return [IDX[id] * SP + XOFF, branch ? BR : 0, 0];
}

function useHalo() {
  return useMemo(() => {
    if (typeof document === "undefined") return null;
    const s = 128;
    const c = document.createElement("canvas");
    c.width = c.height = s;
    const g = c.getContext("2d")!;
    const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grd.addColorStop(0, "rgba(255,255,255,1)");
    grd.addColorStop(0.22, "rgba(255,255,255,0.55)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, s, s);
    return new THREE.CanvasTexture(c);
  }, []);
}

interface NodeSpec {
  key: string;
  pos: [number, number, number];
  color: string;
  size: number;
  reveal: number;
  lit: number;
  delay: number;
  emphasis?: boolean;
}

function Node({ spec, stage, halo, t0 }: { spec: NodeSpec; stage: number; halo: THREE.Texture | null; t0: MutableRefObject<number> }) {
  const grp = useRef<THREE.Group>(null);
  const core = useRef<THREE.MeshStandardMaterial>(null);
  const hmat = useRef<THREE.SpriteMaterial>(null);
  useFrame(({ clock }) => {
    if (!grp.current) return;
    const active = stage >= spec.reveal && clock.elapsedTime - t0.current - spec.delay > 0;
    const lit = stage >= spec.lit;
    const want = active ? 1 : 0.0001;
    grp.current.scale.setScalar(grp.current.scale.x + (want - grp.current.scale.x) * 0.16);
    const pulse = spec.emphasis && stage >= 2 && stage <= 3 ? 0.6 + Math.sin(clock.elapsedTime * 3.2) * 0.5 : 0;
    const baseE = active && lit ? (spec.emphasis ? 2.0 : 1.15) : 0.06;
    if (core.current) core.current.emissiveIntensity += (baseE + pulse - core.current.emissiveIntensity) * 0.18;
    if (hmat.current) hmat.current.opacity += ((active && lit ? 0.75 : 0.1) + pulse * 0.25 - hmat.current.opacity) * 0.18;
  });
  return (
    <group ref={grp} position={spec.pos} scale={0.0001}>
      <mesh>
        <sphereGeometry args={[spec.size, 24, 24]} />
        <meshStandardMaterial ref={core} color={spec.color} emissive={spec.color} emissiveIntensity={0} roughness={0.25} metalness={0.1} />
      </mesh>
      {halo && (
        <sprite scale={[spec.size * 6, spec.size * 6, 1]}>
          <spriteMaterial ref={hmat} map={halo} color={spec.color} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
        </sprite>
      )}
    </group>
  );
}

function Edge({ a, b, color, reveal, stage }: { a: [number, number, number]; b: [number, number, number]; color: string; reveal: number; stage: number }) {
  if (stage < reveal) return null;
  return <Line points={[a, b]} color={color} lineWidth={2.2} transparent opacity={0.5} />;
}

function Scene({ data, stage }: { data: LoopResult; stage: number }) {
  const halo = useHalo();
  const group = useRef<THREE.Group>(null);
  const t0 = useRef(0);
  const last = useRef(-1);
  useFrame(({ clock }) => {
    if (last.current !== stage) {
      last.current = stage;
      t0.current = clock.elapsedTime;
    }
    if (group.current) group.current.rotation.y = Math.sin(clock.elapsedTime * 0.12) * 0.16;
  });

  const { nodes, edges } = useMemo(() => {
    const culprit = data.bisect.culpritId;
    const orig = ["intake", "fraud_check", "classify", "retrieve_policy", "eligibility", "amount", "decision"];
    const ruleIds = new Set(["retrieve_policy", "eligibility", "amount"]);
    const nodes: NodeSpec[] = orig.map((id, i) => ({
      key: id,
      pos: P(id),
      color: id === culprit ? COL.culprit : ruleIds.has(id) ? COL.neutral : COL.llm,
      size: ruleIds.has(id) ? 0.22 : 0.34,
      reveal: 1,
      lit: 1,
      delay: i * 0.06,
      emphasis: id === culprit,
    }));
    nodes.push({ key: "outcomeR", pos: P("outcome"), color: COL.fail, size: 0.42, reveal: 1, lit: 1, delay: 0.45 });
    const cf = ["retrieve_policy", "eligibility", "amount", "decision"];
    cf.forEach((id, i) => nodes.push({ key: "cf_" + id, pos: P(id, true), color: COL.pass, size: ruleIds.has(id) ? 0.22 : 0.34, reveal: 3, lit: 3, delay: i * 0.13 }));
    nodes.push({ key: "outcomeG", pos: P("outcome", true), color: COL.pass, size: 0.42, reveal: 3, lit: 4, delay: 0.55 });

    const edges: { a: [number, number, number]; b: [number, number, number]; color: string; reveal: number }[] = [];
    for (let i = 0; i < orig.length - 1; i++) edges.push({ a: P(orig[i]), b: P(orig[i + 1]), color: i >= 2 ? COL.fail : COL.neutral, reveal: 1 });
    edges.push({ a: P("decision"), b: P("outcome"), color: COL.fail, reveal: 1 });
    edges.push({ a: P("classify"), b: P("retrieve_policy", true), color: COL.pass, reveal: 3 });
    for (let i = 0; i < cf.length - 1; i++) edges.push({ a: P(cf[i], true), b: P(cf[i + 1], true), color: COL.pass, reveal: 3 });
    edges.push({ a: P("decision", true), b: P("outcome", true), color: COL.pass, reveal: 3 });
    return { nodes, edges };
  }, [data]);

  return (
    <>
      <ambientLight intensity={0.45} />
      <pointLight position={[0, 5, 9]} intensity={90} />
      <pointLight position={[-7, -3, 5]} intensity={28} color={COL.llm} />
      <Stars radius={70} depth={40} count={800} factor={2.6} fade speed={0.3} />
      <group ref={group}>
        {edges.map((e, i) => (
          <Edge key={i} {...e} stage={stage} />
        ))}
        {nodes.map((n) => (
          <Node key={n.key} spec={n} stage={stage} halo={halo} t0={t0} />
        ))}
      </group>
    </>
  );
}

export default function WorldlineCanvas({ data, stage }: { data: LoopResult; stage: number }) {
  return (
    <Canvas camera={{ position: [0, 1.7, 16], fov: 40 }} dpr={[1, 1.6]} gl={{ antialias: true }} frameloop="always">
      <color attach="background" args={["#070a12"]} />
      <Scene data={data} stage={stage} />
    </Canvas>
  );
}
