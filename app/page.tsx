"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Panels from "@/components/Panels";
import type { LoopResult } from "@/lib/worldline/types";

const WorldlineCanvas = dynamic(() => import("@/components/WorldlineCanvas"), { ssr: false });

type LoopData = LoopResult & { source?: string };

const STEP_LABELS = [
  "Run workflow", // 0 -> 1
  "Auto-bisect", // 1 -> 2
  "Fork timeline", // 2 -> 3
  "Re-simulate", // 3 -> 4
  "Diagnose", // 4 -> 5
  "Author repair", // 5 -> 6
  "Verify fix", // 6 -> 7
];
const MAX_STAGE = 7;

export default function Home() {
  const [data, setData] = useState<LoopData | null>(null);
  const [stage, setStage] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [live, setLive] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/loop")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!playing || stage >= MAX_STAGE) return;
    const t = setTimeout(() => setStage((s) => Math.min(s + 1, MAX_STAGE)), 2300);
    return () => clearTimeout(t);
  }, [playing, stage]);

  const start = useCallback(() => {
    setStage(1);
    setPlaying(true);
  }, []);

  const rerunLive = useCallback(async () => {
    setBusy(true);
    setPlaying(false);
    try {
      const r = await fetch("/api/loop", { method: "POST" });
      const d = await r.json();
      if (!d.error) {
        setData(d);
        setLive(true);
        setStage(1);
        setPlaying(true);
      }
    } finally {
      setBusy(false);
    }
  }, []);

  const tokens = data ? data.usage.input + data.usage.output : 0;

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      {/* 3D background */}
      <div className="absolute inset-0">
        {data && <WorldlineCanvas data={data} stage={stage} />}
      </div>
      {/* scrim for legibility */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-bg/80 via-transparent to-bg/40" />

      {/* brand */}
      <div className="absolute left-6 top-5 z-10">
        <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-accent">WorldLine</div>
        <div className="text-[12px] text-muted">counterfactual debugging for agents</div>
      </div>

      {/* live / source badge */}
      <div className="absolute right-6 top-5 z-10 text-right">
        <div className="font-mono text-[11px] tnum text-muted">
          {data ? (
            <>
              <span className={live ? "text-pass" : "text-muted"}>{live ? "● LIVE" : "● recorded"}</span> · opus-4.8 · {tokens.toLocaleString()} tok
            </>
          ) : (
            "loading…"
          )}
        </div>
      </div>

      {/* intro hero */}
      <AnimatePresence>
        {stage === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6 text-center"
          >
            <div className="max-w-2xl">
              <div className="mb-3 font-mono text-[12px] uppercase tracking-[0.3em] text-warn">a flight simulator for agent failures</div>
              <h1 className="text-balance text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
                Your agent failed.
                <br />
                <span className="text-muted">Which decision </span>
                <span className="text-pass">actually mattered?</span>
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-pretty text-[15px] leading-relaxed text-muted">
                WorldLine forks a failed multi-agent run at the decision that caused it, re-simulates the future live,
                and lets Claude prove the repair. Tracing shows what happened — this shows what <em>would</em> have.
              </p>
              <button
                onClick={start}
                disabled={!data}
                className="mt-8 rounded-full bg-accent px-7 py-3 text-[15px] font-semibold text-bg transition hover:brightness-110 disabled:opacity-40"
              >
                {data ? "Run the workflow →" : "loading…"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* panels */}
      {data && stage >= 1 && (
        <div className="absolute right-5 top-20 z-10 max-h-[calc(100vh-9rem)] w-[380px] max-w-[90vw] overflow-y-auto pb-4">
          <Panels data={data} stage={stage} />
        </div>
      )}

      {/* control bar */}
      {data && stage >= 1 && (
        <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-line bg-panel/85 px-3 py-2 backdrop-blur-md">
          <button
            onClick={() => setPlaying((p) => !p)}
            disabled={stage >= MAX_STAGE}
            className="rounded-full px-3 py-1.5 text-[13px] font-medium text-fg hover:bg-line/60 disabled:opacity-40"
          >
            {playing ? "❚❚ Pause" : "▶ Play"}
          </button>
          <button
            onClick={() => {
              setPlaying(false);
              setStage((s) => Math.min(s + 1, MAX_STAGE));
            }}
            disabled={stage >= MAX_STAGE}
            className="rounded-full px-3 py-1.5 text-[13px] font-medium text-fg hover:bg-line/60 disabled:opacity-40"
          >
            {stage < MAX_STAGE ? `${STEP_LABELS[stage]} ›` : "done"}
          </button>
          <div className="mx-1 flex items-center gap-1">
            {Array.from({ length: MAX_STAGE }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full transition ${i < stage ? "bg-accent" : "bg-line"}`}
              />
            ))}
          </div>
          <button
            onClick={() => {
              setPlaying(false);
              setStage(0);
            }}
            className="rounded-full px-3 py-1.5 text-[13px] font-medium text-muted hover:bg-line/60"
          >
            ↺
          </button>
          <div className="mx-1 h-5 w-px bg-line" />
          <button
            onClick={rerunLive}
            disabled={busy}
            className="rounded-full bg-pass/15 px-3 py-1.5 text-[13px] font-medium text-pass hover:bg-pass/25 disabled:opacity-50"
          >
            {busy ? "running…" : "Re-run live"}
          </button>
        </div>
      )}
    </main>
  );
}
