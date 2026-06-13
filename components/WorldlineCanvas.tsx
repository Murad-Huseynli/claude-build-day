"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { Line, Html, Stars, OrbitControls } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { LoopResult, Run, State } from "@/lib/worldline/types";

const S = 2.4; // x spacing
const B = 1.7; // branch height
const XOFF = -7.2;
const C = { fail: "#ff5a52", warn: "#ffd166", pass: "#3ddc84", node: "#5b8cff", neutral: "#7c8aa0", accent: "#5b8cff" };

function out(run: Run, id: string): State {
  return run.records.find((r) => r.stepId === id)?.output ?? {};
}
function P(x: number, y: number): [number, number, number] {
  return [x * S + XOFF, y * B, 0];
}

interface NodeSpec {
  key: string;
  pos: [number, number, number];
  title: string;
  sub?: string;
  color: string;
  reveal: number;
  emphasis?: boolean;
  lit?: number; // stage at which it "lights up" (for the green outcome flip)
}

function WorldNode({ spec, stage }: { spec: NodeSpec; stage: number }) {
  const group = useRef<THREE.Group>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const active = stage >= spec.reveal;
  const litNow = spec.lit === undefined ? active : stage >= spec.lit;
  useFrame((state) => {
    if (!group.current) return;
    const target = active ? 1 : 0.0001;
    const s = group.current.scale.x + (target - group.current.scale.x) * 0.18;
    group.current.scale.setScalar(s);
    if (mat.current) {
      const pulse = spec.emphasis && stage >= 2 && stage <= 3 ? 0.9 + Math.sin(state.clock.elapsedTime * 4) * 0.6 : 0;
      const base = litNow ? (spec.emphasis ? 2.2 : 1.25) : 0.04;
      const tgt = base + pulse;
      mat.current.emissiveIntensity += (tgt - mat.current.emissiveIntensity) * 0.2;
    }
  });
  return (
    <group ref={group} position={spec.pos} scale={0.0001}>
      <mesh>
        <icosahedronGeometry args={[0.4, 1]} />
        <meshStandardMaterial ref={mat} color={spec.color} emissive={spec.color} emissiveIntensity={0} roughness={0.35} metalness={0.15} />
      </mesh>
      {active && (
        <Html center distanceFactor={13} position={[0, 1.0, 0]}>
          <div className="pointer-events-none select-none whitespace-nowrap text-center leading-tight">
            <div className="text-[12px] font-semibold tracking-wide text-fg/90">{spec.title}</div>
            {spec.sub && (
              <div className="font-mono text-[11px] tnum" style={{ color: spec.color }}>
                {spec.sub}
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

function Edge({ a, b, color, reveal, stage }: { a: [number, number, number]; b: [number, number, number]; color: string; reveal: number; stage: number }) {
  if (stage < reveal) return null;
  return <Line points={[a, b]} color={color} lineWidth={2.4} transparent opacity={0.7} />;
}

function Scene({ data, stage }: { data: LoopResult; stage: number }) {
  const { nodes, edges, forkLabel } = useMemo(() => {
    const base = data.base;
    const cf = data.bisect.forkRun!;
    const culprit = data.bisect.culpritId;
    const origCat = String((out(base, "classify") as { category?: string }).category ?? "");
    const cfCat = String((out(cf, "classify") as { category?: string }).category ?? "");
    const origDec = String((out(base, "decision") as { decision?: string }).decision ?? "");
    const cfDec = String((out(cf, "decision") as { decision?: string }).decision ?? "");

    const nodes: NodeSpec[] = [
      { key: "intake", pos: P(0, 0), title: "Intake", sub: `${(out(base, "intake") as { daysSincePurchase?: number }).daysSincePurchase}d`, color: C.neutral, reveal: 1 },
      { key: "classify", pos: P(1, 0), title: "Classifier", sub: origCat, color: culprit === "classify" ? C.warn : C.node, reveal: 1, emphasis: culprit === "classify" },
      { key: "retrieve", pos: P(2, 0), title: "Policy", color: C.neutral, reveal: 1 },
      { key: "elig", pos: P(3, 0), title: "Eligibility", sub: "false", color: C.neutral, reveal: 1 },
      { key: "amount", pos: P(4, 0), title: "Amount", sub: "$0", color: C.neutral, reveal: 1 },
      { key: "decision", pos: P(5, 0), title: "Decision", sub: origDec, color: C.fail, reveal: 1 },
      { key: "outcomeR", pos: P(6, 0), title: "Outcome", sub: `${base.outcome.decision} · $${base.outcome.amount} · FAIL`, color: C.fail, reveal: 1 },
      // counterfactual branch (appears at fork)
      { key: "cfRetrieve", pos: P(2, 1), title: "Policy", color: C.pass, reveal: 3 },
      { key: "cfElig", pos: P(3, 1), title: "Eligibility", sub: "true", color: C.pass, reveal: 3 },
      { key: "cfAmount", pos: P(4, 1), title: "Amount", sub: "$240", color: C.pass, reveal: 3 },
      { key: "cfDecision", pos: P(5, 1), title: "Decision", sub: cfDec, color: C.pass, reveal: 3 },
      { key: "outcomeG", pos: P(6, 1), title: "Outcome", sub: `${cf.outcome.decision} · $${cf.outcome.amount} · PASS`, color: C.pass, reveal: 3, lit: 4 },
    ];

    const edges = [
      { a: P(0, 0), b: P(1, 0), color: C.neutral, reveal: 1 },
      { a: P(1, 0), b: P(2, 0), color: C.fail, reveal: 1 },
      { a: P(2, 0), b: P(3, 0), color: C.fail, reveal: 1 },
      { a: P(3, 0), b: P(4, 0), color: C.fail, reveal: 1 },
      { a: P(4, 0), b: P(5, 0), color: C.fail, reveal: 1 },
      { a: P(5, 0), b: P(6, 0), color: C.fail, reveal: 1 },
      // fork upward from the culprit (classify)
      { a: P(1, 0), b: P(2, 1), color: C.pass, reveal: 3 },
      { a: P(2, 1), b: P(3, 1), color: C.pass, reveal: 3 },
      { a: P(3, 1), b: P(4, 1), color: C.pass, reveal: 3 },
      { a: P(4, 1), b: P(5, 1), color: C.pass, reveal: 3 },
      { a: P(5, 1), b: P(6, 1), color: C.pass, reveal: 3 },
    ];

    return { nodes, edges, forkLabel: { pos: P(1.5, 0.55) as [number, number, number], cfCat } };
  }, [data]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 6, 10]} intensity={120} />
      <pointLight position={[-8, -4, 6]} intensity={40} color={C.accent} />
      <Stars radius={90} depth={50} count={2200} factor={3.2} fade speed={0.4} />
      {edges.map((e, i) => (
        <Edge key={i} {...e} stage={stage} />
      ))}
      {nodes.map((n) => (
        <WorldNode key={n.key} spec={n} stage={stage} />
      ))}
      {stage >= 3 && (
        <Html center distanceFactor={13} position={forkLabel.pos}>
          <div className="pointer-events-none whitespace-nowrap rounded-md border border-pass/40 bg-pass/10 px-2 py-0.5 font-mono text-[10px] text-pass">
            fork → {forkLabel.cfCat}
          </div>
        </Html>
      )}
      <OrbitControls
        enablePan={false}
        enableZoom
        minDistance={10}
        maxDistance={26}
        target={[0, 0.8, 0]}
        autoRotate
        autoRotateSpeed={0.35}
        maxPolarAngle={Math.PI / 1.7}
      />
    </>
  );
}

export default function WorldlineCanvas({ data, stage }: { data: LoopResult; stage: number }) {
  return (
    <Canvas camera={{ position: [0, 2.4, 18], fov: 42 }} dpr={[1, 2]} gl={{ antialias: true }}>
      <color attach="background" args={["#05070d"]} />
      <fog attach="fog" args={["#05070d", 18, 38]} />
      <Scene data={data} stage={stage} />
    </Canvas>
  );
}
