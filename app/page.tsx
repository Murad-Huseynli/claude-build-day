"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import Panels from "@/components/Panels";
import type { LoopResult } from "@/lib/worldline/types";

const WorldlineCanvas = dynamic(() => import("@/components/WorldlineCanvas"), { ssr: false });
type LoopData = LoopResult & { source?: string };

const STEP_LABELS = ["Run workflow", "Auto-bisect", "Fork timeline", "Re-simulate", "Diagnose", "Author repair", "Verify fix"];
const MAX_STAGE = 7;

const STAGE_COPY: Record<number, { k: string; t: string }> = {
  1: { k: "01 · the failure", t: "A 7-agent refund pipeline denies a valid claim. Six steps, one wrong answer." },
  2: { k: "02 · auto-bisect", t: "Claude audits every decision against policy — and rules out the innocents." },
  3: { k: "03 · fork", t: "The timeline forks at the culprit; the future re-simulates live." },
  4: { k: "04 · flip", t: "Same claim, one decision changed — the outcome flips red → green." },
  5: { k: "05 · diagnose", t: "Claude names the root cause: a wrong policy baked into the prompt." },
  6: { k: "06 · repair", t: "Claude rewrites the offending prompt." },
  7: { k: "07 · verify", t: "The whole workflow re-runs with the patch and proves the fix." },
};

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-accent">{children}</div>;
}

export default function Home() {
  const [data, setData] = useState<LoopData | null>(null);
  const [stage, setStage] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [live, setLive] = useState(false);
  const [busy, setBusy] = useState(false);
  const simRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    fetch("/api/loop").then((r) => r.json()).then(setData).catch(() => {});
  }, []);

  // auto-start the run when the simulator scrolls into view (once)
  useEffect(() => {
    const el = simRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => {
        if (es[0].isIntersecting && !started.current && data) {
          started.current = true;
          setStage(1);
          setPlaying(true);
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [data]);

  useEffect(() => {
    if (!playing || stage >= MAX_STAGE) return;
    const t = setTimeout(() => setStage((s) => Math.min(s + 1, MAX_STAGE)), 2400);
    return () => clearTimeout(t);
  }, [playing, stage]);

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
  const copy = STAGE_COPY[Math.max(1, stage)] ?? STAGE_COPY[1];

  return (
    <div className="relative min-h-screen scroll-smooth">
      {/* ambient backdrop */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(900px_500px_at_70%_-10%,rgba(91,140,255,0.10),transparent),radial-gradient(700px_500px_at_10%_110%,rgba(61,220,132,0.06),transparent)]" />

      {/* nav */}
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-line/60 bg-bg/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <a href="#top" className="font-mono text-[12px] font-semibold uppercase tracking-[0.3em] text-fg">
            World<span className="text-accent">Line</span>
          </a>
          <div className="flex items-center gap-5 text-[13px] text-muted">
            <a href="#how" className="hidden transition hover:text-fg sm:block">How it works</a>
            <a href="#compare" className="hidden transition hover:text-fg sm:block">Compare</a>
            <a href="https://github.com/Murad-Huseynli/claude-build-day" className="hidden transition hover:text-fg sm:block">GitHub</a>
            <span className="font-mono text-[11px] tnum text-muted">
              <span className={live ? "text-pass" : "text-muted"}>● {live ? "LIVE" : "recorded"}</span> · {tokens.toLocaleString()} tok
            </span>
          </div>
        </div>
      </nav>

      {/* hero */}
      <section id="top" className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 text-center">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <Eyebrow>A flight simulator for agent failures</Eyebrow>
          <h1 className="mx-auto mt-5 max-w-3xl text-balance text-5xl font-semibold leading-[1.08] tracking-tight md:text-6xl">
            <span className="block">Your agent failed.</span>
            <span className="block">
              <span className="text-muted">Which decision</span> <span className="text-pass">actually mattered?</span>
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-pretty text-[15px] leading-relaxed text-muted md:text-lg">
            WorldLine forks a failed multi-agent run at the decision that caused it, re-simulates the future live, and
            lets Claude prove the repair. Tracing shows what happened — this shows what <em>would</em> have.
          </p>
          <div className="mt-9 flex items-center justify-center gap-3">
            <a href="#sim" className="rounded-full bg-accent px-6 py-3 text-[15px] font-semibold text-bg transition hover:brightness-110">
              Run the simulation ↓
            </a>
            <a href="#how" className="rounded-full border border-line px-6 py-3 text-[15px] font-medium text-fg transition hover:border-fg/30 hover:bg-panel">
              How it works
            </a>
          </div>
        </motion.div>
      </section>

      {/* problem */}
      <Section id="problem">
        <Eyebrow>The problem</Eyebrow>
        <div className="mt-4 grid gap-6 md:grid-cols-[1.2fr_1fr] md:gap-12">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
            Multi-agent failures aren&apos;t reproducible — and you can&apos;t tell which decision caused them.
          </h2>
          <p className="text-[15px] leading-relaxed text-muted">
            The same input yields different paths, so failures are hard to reproduce and harder to attribute. When a
            6-agent pipeline returns the wrong answer, which step broke it? Today you read traces and guess. Replay and
            forking exist — but you still pick the checkpoint, and nothing proves the fix.
          </p>
        </div>
      </Section>

      {/* simulator */}
      <section id="sim" ref={simRef} className="mx-auto max-w-6xl scroll-mt-20 px-6 py-20">
        <Eyebrow>See it think</Eyebrow>
        <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
          Watch Claude debug a failed agent run — live.
        </h2>

        <div className="mt-8 grid items-start gap-5 lg:grid-cols-[1.4fr_1fr]">
          {/* canvas */}
          <div className="relative h-[52vh] min-h-[360px] overflow-hidden rounded-2xl border border-line bg-[#070a12] lg:h-[64vh]">
            {data ? <WorldlineCanvas data={data} stage={stage} /> : <div className="flex h-full items-center justify-center text-sm text-muted">loading…</div>}
            {/* stage caption */}
            {stage >= 1 && (
              <motion.div
                key={stage}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg/90 to-transparent p-5"
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">{copy.k}</div>
                <div className="mt-1 max-w-md text-[14px] text-fg/90">{copy.t}</div>
              </motion.div>
            )}
          </div>

          {/* readout */}
          <div>{data && <Panels data={data} stage={stage} />}</div>
        </div>

        {/* controls */}
        {data && (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                started.current = true;
                if (stage === 0) setStage(1);
                setPlaying((p) => !p);
              }}
              disabled={stage >= MAX_STAGE}
              className="rounded-full border border-line bg-panel px-4 py-2 text-[13px] font-medium text-fg transition hover:border-fg/30 disabled:opacity-40"
            >
              {playing ? "❚❚ Pause" : "▶ Play"}
            </button>
            <button
              onClick={() => {
                setPlaying(false);
                setStage((s) => Math.min(s + 1, MAX_STAGE));
              }}
              disabled={stage >= MAX_STAGE}
              className="rounded-full border border-line bg-panel px-4 py-2 text-[13px] font-medium text-fg transition hover:border-fg/30 disabled:opacity-40"
            >
              {stage < MAX_STAGE ? `${STEP_LABELS[stage]} ›` : "done"}
            </button>
            <div className="mx-1 flex items-center gap-1">
              {Array.from({ length: MAX_STAGE }).map((_, i) => (
                <span key={i} className={`h-1.5 w-1.5 rounded-full transition ${i < stage ? "bg-accent" : "bg-line"}`} />
              ))}
            </div>
            <button onClick={() => { setPlaying(false); setStage(0); started.current = false; }} className="rounded-full px-3 py-2 text-[13px] text-muted hover:text-fg">↺ reset</button>
            <div className="grow" />
            <button
              onClick={rerunLive}
              disabled={busy}
              className="rounded-full bg-pass/15 px-4 py-2 text-[13px] font-medium text-pass transition hover:bg-pass/25 disabled:opacity-50"
            >
              {busy ? "running live…" : "⟲ Re-run live on Opus 4.8"}
            </button>
          </div>
        )}
      </section>

      {/* how it works */}
      <Section id="how">
        <Eyebrow>How it works</Eyebrow>
        <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">The loop on top of forking.</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { n: "01", t: "Audit", d: "Claude reviews every agent decision against the policy, in parallel — and rules out the ones that merely applied bad input." },
            { n: "02", t: "Fork", d: "At each suspect, inject the corrected decision and re-simulate the tail live. The one that flips the outcome is the culprit." },
            { n: "03", t: "Repair", d: "Claude (effort=max) explains the root cause and rewrites the offending prompt." },
            { n: "04", t: "Verify", d: "The full workflow re-runs with the patch; a code assertion proves the outcome flipped." },
          ].map((s) => (
            <div key={s.n} className="rounded-xl border border-line bg-panel/60 p-5">
              <div className="font-mono text-[12px] text-accent">{s.n}</div>
              <div className="mt-2 text-lg font-semibold">{s.t}</div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{s.d}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* compare */}
      <Section id="compare">
        <Eyebrow>Existing tools vs WorldLine</Eyebrow>
        <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">Replay and forking exist. We build the loop on top.</h2>
        <div className="mt-8 overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead className="bg-panel/60 font-mono text-[11px] uppercase tracking-wider text-muted">
              <tr>
                <th className="p-3 font-medium">Capability</th>
                <th className="p-3 font-medium">Tracing</th>
                <th className="p-3 font-medium">Replay</th>
                <th className="p-3 font-medium">Forking</th>
                <th className="p-3 font-medium text-accent">WorldLine</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {[
                ["Show what happened", true, true, true, true],
                ["Repeat a run", false, true, true, true],
                ["Explore an alternate path", false, false, true, true],
                ["Auto-find the culprit decision", false, false, false, true],
                ["Author a repair", false, false, false, true],
                ["Verify the repair flips the outcome", false, false, false, true],
              ].map((row) => (
                <tr key={row[0] as string}>
                  <td className="p-3 text-fg/90">{row[0] as string}</td>
                  {(row.slice(1) as boolean[]).map((v, i) => (
                    <td key={i} className={`p-3 ${i === 3 ? "text-pass" : "text-muted"}`}>{v ? "✓" : "–"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 max-w-3xl text-[13px] leading-relaxed text-muted">
          LangGraph time-travel (<code className="text-fg/80">updateState</code> + resume) and AgentOps already support
          replay and forking from checkpoints — we don&apos;t claim otherwise. WorldLine&apos;s wedge is the autonomous
          loop on top: <span className="text-fg/90">intervention-tested attribution → repair → verification</span>.
        </p>
      </Section>

      {/* proof / cta */}
      <Section id="proof">
        <div className="rounded-2xl border border-line bg-panel/60 p-8 text-center md:p-12">
          <Eyebrow>Not a movie</Eyebrow>
          <h2 className="mx-auto mt-4 max-w-xl text-3xl font-semibold tracking-tight md:text-4xl">
            Everything you saw runs live on Opus&nbsp;4.8.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-[14px] text-muted">
            Hit re-run and the whole loop — audit, fork, repair, verify — recomputes on the deployed backend.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <button onClick={rerunLive} disabled={busy} className="rounded-full bg-accent px-6 py-3 text-[15px] font-semibold text-bg transition hover:brightness-110 disabled:opacity-50">
              {busy ? "running live…" : "⟲ Re-run the loop live"}
            </button>
            <a href="https://github.com/Murad-Huseynli/claude-build-day" className="rounded-full border border-line px-6 py-3 text-[15px] font-medium text-fg transition hover:border-fg/30">
              View the code
            </a>
          </div>
        </div>
      </Section>

      <footer className="border-t border-line/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-8 text-[12px] text-muted sm:flex-row sm:items-center sm:justify-between">
          <span className="font-mono uppercase tracking-[0.3em] text-fg/70">WorldLine</span>
          <span className="font-mono">npm run prove · npm test · built with Opus 4.8</span>
        </div>
      </footer>
    </div>
  );
}

function Section({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto max-w-6xl scroll-mt-20 px-6 py-20"
    >
      {children}
    </motion.section>
  );
}
