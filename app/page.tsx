"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import Panels from "@/components/Panels";
import Memory from "@/components/Memory";
import type { LoopResult } from "@/lib/worldline/types";

const WorldlineCanvas = dynamic(() => import("@/components/WorldlineCanvas"), { ssr: false });
type LoopData = LoopResult & { source?: string };

const STEP_LABELS = ["Run workflow", "Auto-bisect", "Fork timeline", "Re-simulate", "Diagnose", "Author repair", "Verify fix"];
const MAX_STAGE = 7;

const STAGE_COPY: Record<number, { k: string; t: string }> = {
  1: { k: "01 · the failure", t: "A 7-step agent pipeline denies a valid claim — one wrong decision cascades to the rest." },
  2: { k: "02 · auto-bisect", t: "Claude intervention-tests every decision in parallel — and rules out the suspects that only look guilty." },
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
  const [vertical, setVertical] = useState(false);
  const simRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    fetch("/api/loop").then((r) => r.json()).then(setData).catch(() => {});
  }, []);

  // mobile gets a dedicated vertical worldline (fills the portrait viewport)
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const on = () => setVertical(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
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
            <a href="#memory" className="hidden transition hover:text-fg sm:block">Memory</a>
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
      <section id="top" className="mx-auto flex min-h-[90vh] max-w-5xl flex-col items-center justify-center px-6 pt-16 text-center">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <Eyebrow>A flight simulator for agent failures</Eyebrow>
          <h1 className="mx-auto mt-5 max-w-3xl text-balance font-serif text-5xl font-medium leading-[1.03] tracking-[-0.01em] md:text-7xl">
            <span className="block">Your agent failed.</span>
            <span className="block">
              <span className="text-muted">Which decision</span> <span className="text-pass">actually mattered?</span>
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-pretty text-[15px] leading-relaxed text-muted md:text-lg">
            WorldLine forks a failed multi-agent run at the decision that caused it, re-simulates the future live, proves
            the repair — then files it as <em>fleet memory</em> so the same failure never ships twice. Tracing shows what
            happened; WorldLine makes your agents stop repeating it.
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
          <h2 className="font-serif text-3xl font-medium leading-tight tracking-[-0.01em] md:text-4xl">
            Multi-agent failures aren&apos;t reproducible — and you can&apos;t tell which decision caused them.
          </h2>
          {/* serif heading marker */}
          <p className="text-[15px] leading-relaxed text-muted">
            The same input yields different paths, so failures are hard to reproduce and harder to attribute. When a
            7-step agent pipeline returns the wrong answer, which decision broke it? Today you read traces and guess. Replay and
            forking exist — but you still pick the checkpoint, and nothing proves the fix.
          </p>
        </div>
      </Section>

      {/* simulator */}
      <section id="sim" ref={simRef} className="mx-auto max-w-6xl scroll-mt-20 px-6 py-20">
        <Eyebrow>See it think</Eyebrow>
        <h2 className="mt-4 max-w-2xl font-serif text-3xl font-medium tracking-[-0.01em] md:text-4xl">
          Watch Claude debug a failed agent run — live.
        </h2>

        <div className="mt-8 grid items-start gap-5 lg:grid-cols-[1.4fr_1fr]">
          {/* canvas */}
          <div className="relative h-[68vh] min-h-[460px] overflow-hidden rounded-2xl border border-line bg-[#070a12] lg:h-[64vh]">
            {data ? <WorldlineCanvas data={data} stage={stage} vertical={vertical} /> : <div className="flex h-full items-center justify-center text-sm text-muted">loading…</div>}
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
              {playing ? "Pause" : "Play"}
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
            <button onClick={() => { setPlaying(false); setStage(0); started.current = false; }} className="rounded-full px-3 py-2 text-[13px] text-muted hover:text-fg">Reset</button>
            <div className="grow" />
            <button
              onClick={rerunLive}
              disabled={busy}
              className="rounded-full bg-pass/15 px-4 py-2 text-[13px] font-medium text-pass transition hover:bg-pass/25 disabled:opacity-50"
            >
              {busy ? "Running live…" : "Re-run live on Opus 4.8"}
            </button>
          </div>
        )}
      </section>

      {/* institutional memory */}
      <Section id="memory">
        <Eyebrow>Institutional memory</Eyebrow>
        <h2 className="mt-4 max-w-2xl font-serif text-3xl font-medium tracking-[-0.01em] md:text-4xl">The same mistake never ships twice.</h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
          Every intervention-tested fix becomes a durable lesson your whole fleet inherits. When any agent — even a
          different one — is about to repeat a known failure class, WorldLine catches it from memory and applies the
          verified fix before it ships. Observability shows what happened; this makes your agents get more reliable over time.
        </p>
        <div className="mt-8">
          <Memory />
        </div>
      </Section>

      {/* how it works */}
      <Section id="how">
        <Eyebrow>The reliability lifecycle</Eyebrow>
        <h2 className="mt-4 max-w-2xl font-serif text-3xl font-medium tracking-[-0.01em] md:text-4xl">Detect → repair → remember → prevent.</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { n: "01", t: "Detect", d: "A multi-agent run returns the wrong outcome. WorldLine treats the failure as a signal, not a dead end." },
            { n: "02", t: "Attribute", d: "Claude intervention-tests every decision in parallel — only the one whose correction flips the outcome is the culprit, even when last-touch blame points elsewhere." },
            { n: "03", t: "Repair", d: "Claude (effort=max) explains the root cause and rewrites the offending prompt or policy." },
            { n: "04", t: "Verify", d: "The full workflow re-runs with the patch; a code assertion proves the outcome flipped." },
            { n: "05", t: "Remember", d: "The verified fix becomes a durable lesson in fleet memory — failure class, root cause, proof, and the agents it protects." },
            { n: "06", t: "Prevent", d: "Any agent — even a different one — about to repeat that failure class is caught from memory and fixed before it ships." },
          ].map((s) => (
            <div key={s.n} className="rounded-lg border-l-2 border-accent/40 bg-panel/25 p-5">
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
        <h2 className="mt-4 max-w-2xl font-serif text-3xl font-medium tracking-[-0.01em] md:text-4xl">Replay and forking exist. We build the loop on top.</h2>
        <div className="mt-8 hidden overflow-x-auto rounded-xl border border-line md:block">
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
        {/* mobile: stacked instead of a horizontally-scrolled table */}
        <div className="mt-6 space-y-3 md:hidden">
          <div className="rounded-xl border border-pass/30 bg-pass/[0.05] p-4">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-pass">Only WorldLine</div>
            <ul className="space-y-1.5 text-[14px] text-fg/90">
              <li>Auto-finds the culprit decision</li>
              <li>Authors the repair</li>
              <li>Verifies the repair flips the outcome</li>
            </ul>
          </div>
          <div className="rounded-xl border border-line bg-panel/60 p-4">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted">Tracing · Replay · Forking</div>
            <p className="text-[13px] leading-relaxed text-muted">Show, repeat, or explore one alternate path — but you still pick the checkpoint, and nothing proves the fix.</p>
          </div>
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
          <h2 className="mx-auto mt-4 max-w-xl font-serif text-3xl font-medium tracking-[-0.01em] md:text-4xl">
            Everything you saw runs live on Opus&nbsp;4.8.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-[14px] text-muted">
            Hit re-run and the whole loop — audit, fork, repair, verify — recomputes on the deployed backend.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <button onClick={rerunLive} disabled={busy} className="rounded-full bg-accent px-6 py-3 text-[15px] font-semibold text-bg transition hover:brightness-110 disabled:opacity-50">
              {busy ? "Running live…" : "Re-run the loop live"}
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

// Always visible (never JS-gated to invisible); a CSS-only entrance gives motion
// without the risk of a blank section if the observer is slow or JS is disabled.
function Section({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section id={id} className="reveal mx-auto max-w-6xl scroll-mt-20 px-6 py-20">
      {children}
    </section>
  );
}
