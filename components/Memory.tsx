"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import KnowledgeGraph, { type GraphLesson } from "@/components/KnowledgeGraph";

interface Lesson extends GraphLesson {
  rootCause: string;
  repairSummary: string;
  evidence: { before: string; after: string };
  tags: string[];
  mintedAt: string;
}
interface Prevention {
  agent: string;
  failed: { decision: string | null; amount: number };
  match: { lesson: Lesson | null; confidence: number; rationale: string };
  prevented: { decision: string | null; amount: number; pass: boolean } | null;
}
interface GateCheck {
  lessonId: string;
  failureClass: string;
  risk: "none" | "low" | "high";
  why: string;
}
interface GateResult {
  candidate: { agent: string; label: string; promptSnippet: string };
  checks: GateCheck[];
  gate: "PASS" | "BLOCK";
  blockedBy: string[];
}
interface MemData {
  source?: string;
  lessons: Lesson[];
  prevention: Prevention;
  gate?: GateResult[];
}

export default function Memory() {
  const [data, setData] = useState<MemData | null>(null);
  const [live, setLive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [gen, setGen] = useState(0); // bump to replay the graph populate animation

  useEffect(() => {
    fetch("/api/memory").then((r) => r.json()).then(setData).catch(() => {});
  }, []);

  const checkLive = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/memory", { method: "POST" });
      const d = await r.json();
      if (!d.error) {
        setData(d);
        setLive(true);
        setGen((g) => g + 1);
      }
    } finally {
      setBusy(false);
    }
  };

  if (!data) return null;
  const p = data.prevention;
  const matchId = p.match.lesson?.id;
  const selLesson = data.lessons.find((l) => l.id === sel) ?? null;

  return (
    <div>
      {/* recurrence-prevention flow: failing agent → matched lesson → prevented */}
      <div className="grid items-stretch gap-3 md:grid-cols-[1fr_auto_1.1fr_auto_1fr]">
        <div className="rounded-xl border border-fail/30 bg-fail/[0.05] p-4">
          <div className="font-mono text-[10px] uppercase tracking-wider text-fail">new agent · {p.agent}</div>
          <div className="mt-2 font-mono text-sm text-fail">about to ship {p.failed.decision} · ${p.failed.amount}</div>
          <div className="mt-1 text-[12px] text-muted">a different team, the same failure class</div>
        </div>
        <div className="flex items-center justify-center font-mono text-[11px] text-muted">
          <span className="hidden md:block">matched&nbsp;→</span>
          <span className="md:hidden">↓ matched</span>
        </div>
        <div className="rounded-xl border border-warn/40 bg-warn/[0.07] p-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-warn">memory · {matchId}</span>
            <span className="font-mono text-[10px] text-warn">{Math.round(p.match.confidence * 100)}% match</span>
          </div>
          <div className="mt-2 text-[13px] leading-snug text-fg/90">{p.match.lesson?.title}</div>
          <div className="mt-1.5 line-clamp-3 text-[11px] leading-snug text-muted">{p.match.rationale}</div>
        </div>
        <div className="flex items-center justify-center font-mono text-[11px] text-muted">
          <span className="hidden md:block">fix&nbsp;→</span>
          <span className="md:hidden">↓ verified fix</span>
        </div>
        <div className="rounded-xl border border-pass/40 bg-pass/[0.06] p-4">
          <div className="font-mono text-[10px] uppercase tracking-wider text-pass">prevented</div>
          <div className="mt-2 font-mono text-sm text-pass">{p.prevented?.decision} · ${p.prevented?.amount}</div>
          <div className="mt-1 text-[12px] text-pass/80">verified fix applied from memory — no re-debugging</div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button onClick={checkLive} disabled={busy} className="rounded-full bg-pass/15 px-4 py-2 text-[13px] font-medium text-pass transition hover:bg-pass/25 disabled:opacity-50">
          {busy ? "Checking live…" : "Check a new agent against memory →"}
        </button>
        <button onClick={() => setGen((g) => g + 1)} className="rounded-full border border-line px-4 py-2 text-[13px] font-medium text-fg transition hover:border-fg/30">
          Replay memory growth
        </button>
        <span className="font-mono text-[11px] text-muted">
          <span className={live ? "text-pass" : "text-muted"}>● {live ? "LIVE" : "recorded"}</span> · {data.lessons.length} lessons in fleet memory
        </span>
      </div>

      {/* pre-ship gate: lessons become a CI regression suite */}
      {data.gate && data.gate.length > 0 && (
        <div className="mt-8">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">pre-ship gate · every lesson is a CI regression check</div>
          <div className="grid gap-3 md:grid-cols-2">
            {data.gate.map((g, i) => {
              const block = g.gate === "BLOCK";
              const reason = g.checks.find((c) => g.blockedBy.includes(c.lessonId));
              return (
                <div key={i} className={`rounded-xl border p-4 ${block ? "border-fail/30 bg-fail/[0.05]" : "border-pass/30 bg-pass/[0.05]"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] text-fg/80">{g.candidate.agent} · {g.candidate.label}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ${block ? "bg-fail/15 text-fail" : "bg-pass/15 text-pass"}`}>
                      {block ? "BLOCKED" : "CLEARED"}
                    </span>
                  </div>
                  <p className="mt-2 font-mono text-[11px] leading-snug text-muted">{g.candidate.promptSnippet}</p>
                  {block && reason && <p className="mt-2 text-[11px] leading-snug text-fail/90">reintroduces {reason.lessonId}: {reason.why}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* the live knowledge graph */}
      <div className="mt-8 rounded-2xl border border-line bg-panel/30 p-3">
        <KnowledgeGraph
          lessons={data.lessons}
          matchId={matchId}
          highlightAgent={p.agent}
          selectedId={sel}
          onSelect={(id) => setSel(sel === id ? null : id)}
          generation={gen}
        />
        <div className="px-2 pb-1 font-mono text-[10px] text-muted">click a lesson node to inspect it · the matched lesson pulses, its newly-protected agent lights green</div>
      </div>

      {/* lesson detail */}
      <AnimatePresence>
        {selLesson && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 rounded-xl border border-line bg-panel/70 p-5 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] text-muted">{selLesson.id} · {selLesson.failureClass}</span>
              <span className="font-mono text-[12px] tnum">
                <span className="text-fail">{selLesson.evidence.before}</span> → <span className="text-pass">{selLesson.evidence.after}</span>
              </span>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-fg/85">{selLesson.rootCause}</p>
            <p className="mt-2 text-[12px] text-muted"><span className="text-fg/70">Fix:</span> {selLesson.repairSummary}</p>
            <div className="mt-2 flex flex-wrap gap-1.5 font-mono text-[10px]">
              {selLesson.protects.map((a) => (
                <span key={a} className="rounded bg-line/60 px-1.5 py-0.5 text-muted">protects {a}</span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
