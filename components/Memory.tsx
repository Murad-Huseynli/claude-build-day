"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface Lesson {
  id: string;
  title: string;
  failureClass: string;
  agent: string;
  rootCause: string;
  repairSummary: string;
  evidence: { before: string; after: string };
  tags: string[];
  mintedAt: string;
  protects: string[];
}
interface Prevention {
  agent: string;
  failed: { decision: string | null; amount: number };
  match: { lesson: Lesson | null; confidence: number; rationale: string };
  prevented: { decision: string | null; amount: number; pass: boolean } | null;
}
interface MemData {
  source?: string;
  lessons: Lesson[];
  prevention: Prevention;
}

const CLASS_DOT: Record<string, string> = {
  "wrong-policy-in-prompt": "bg-warn",
  "date-format-misparse": "bg-accent",
  misrouting: "bg-accent",
  "prompt-injection": "bg-fail",
  "retry-storm": "bg-pass",
};

export default function Memory() {
  const [data, setData] = useState<MemData | null>(null);
  const [live, setLive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sel, setSel] = useState<string | null>(null);

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
      {/* recurrence-prevention graph: failing agent -> matched lesson -> prevented */}
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
        <button
          onClick={checkLive}
          disabled={busy}
          className="rounded-full bg-pass/15 px-4 py-2 text-[13px] font-medium text-pass transition hover:bg-pass/25 disabled:opacity-50"
        >
          {busy ? "Checking live…" : "Check a new agent against memory →"}
        </button>
        <span className="font-mono text-[11px] text-muted">
          <span className={live ? "text-pass" : "text-muted"}>● {live ? "LIVE" : "recorded"}</span> · {data.lessons.length} lessons in fleet memory
        </span>
      </div>

      {/* the knowledge graph: accumulated lessons */}
      <div className="mt-10">
        <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">fleet knowledge graph</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.lessons.map((l) => {
            const isMatch = l.id === matchId;
            return (
              <button
                key={l.id}
                onClick={() => setSel(sel === l.id ? null : l.id)}
                className={`rounded-xl border p-4 text-left transition hover:border-fg/30 ${isMatch ? "border-warn/40 bg-warn/[0.05]" : "border-line bg-panel/50"}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${CLASS_DOT[l.failureClass] ?? "bg-muted"}`} />
                  <span className="font-mono text-[10px] text-muted">{l.id}</span>
                  {l.mintedAt === new Date().toISOString().slice(0, 10) && (
                    <span className="rounded bg-pass/15 px-1.5 py-0.5 font-mono text-[9px] text-pass">just added</span>
                  )}
                </div>
                <div className="mt-1.5 text-[13px] leading-snug text-fg/90">{l.title}</div>
                <div className="mt-2 font-mono text-[10px] text-muted">{l.agent} · protects {l.protects.length}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* lesson detail */}
      <AnimatePresence>
        {selLesson && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 rounded-xl border border-line bg-panel/70 p-5 backdrop-blur-md"
          >
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
