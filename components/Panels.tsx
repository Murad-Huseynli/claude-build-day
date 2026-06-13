"use client";
import { motion, AnimatePresence } from "motion/react";
import type { LoopResult } from "@/lib/worldline/types";

const RULE_IDS = new Set(["retrieve_policy", "eligibility", "amount"]);

function stepValue(id: string, o: Record<string, unknown>): string {
  switch (id) {
    case "intake": return `defect=${o.defectClaimed} · final=${o.finalSale}`;
    case "fraud_check": return String(o.fraudRisk ?? "");
    case "classify": return String(o.category ?? "");
    case "retrieve_policy": return "policy clause";
    case "eligibility": return String(o.eligible);
    case "amount": return `$${o.amount}`;
    case "decision": return String(o.decision ?? "");
    default: return "";
  }
}

export default function Panels({ data, stage }: { data: LoopResult; stage: number }) {
  const recs = data.base.records;
  const evOf = (id: string) => data.bisect.evidence.find((e) => e.nodeId === id);
  const culprit = evOf(data.bisect.culpritId ?? "");

  // intervention-tested attribution stats (the parallel search, made visible)
  const tested = data.bisect.evidence.filter((e) => e.intervened);
  const innocents = tested.filter((e) => !e.flipped);
  const decoy = evOf("decision"); // the last-touch suspect — looks guilty, isn't

  // single inspector "phase" driven by stage
  const phase = stage >= 7 ? "verify" : stage >= 6 ? "repair" : stage >= 5 ? "diagnose" : stage >= 4 ? "flip" : stage >= 2 ? "culprit" : "run";

  return (
    <div className="flex flex-col gap-4">
      {/* outcome bar */}
      <div className="flex items-center gap-3 rounded-xl border border-line bg-panel/70 px-4 py-3 font-mono backdrop-blur-md">
        <div>
          <div className="text-[14px] text-fail">{data.base.outcome.decision} · ${data.base.outcome.amount}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted">original · fail</div>
        </div>
        <AnimatePresence>
          {stage >= 4 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 18 }}
              className="ml-auto flex items-center gap-3"
            >
              <span className="text-muted">→</span>
              <div className="text-right">
                <div className="text-[14px] text-pass">{data.verify.eval.after.decision} · ${data.verify.eval.after.amount}</div>
                <div className="text-[10px] uppercase tracking-wider text-pass/80">counterfactual · pass</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* persistent execution trace (the legend) */}
      <div className="rounded-xl border border-line bg-panel/60 p-3 backdrop-blur-md">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">execution trace</div>
        <ol className="flex flex-col gap-1.5 font-mono">
          {recs.map((r) => {
            const e = evOf(r.stepId);
            const audited = stage >= 2 && e;
            const isCulprit = r.stepId === data.bisect.culpritId;
            return (
              <li key={r.stepId} className="flex items-center gap-2 text-[12.5px]">
                <span className={`h-2 w-2 shrink-0 rounded-full ${isCulprit && stage >= 2 ? "bg-warn" : r.stepId === "decision" ? "bg-fail" : RULE_IDS.has(r.stepId) ? "bg-muted/40" : "bg-accent"}`} />
                <span className={`w-[88px] shrink-0 ${r.kind === "rule" ? "text-muted" : "text-fg/90"}`}>{r.name}</span>
                <span className="flex-1 truncate text-muted">{stepValue(r.stepId, r.output as Record<string, unknown>)}</span>
                {audited && (e!.correct
                  ? <span className="shrink-0 text-[10px] text-pass/70">ruled out</span>
                  : <span className="shrink-0 rounded bg-warn/20 px-1.5 py-0.5 text-[10px] font-semibold text-warn">CULPRIT</span>)}
              </li>
            );
          })}
        </ol>
      </div>

      {/* single contextual inspector */}
      <div className="min-h-[140px] rounded-xl border border-line bg-panel/70 p-4 backdrop-blur-md">
        <AnimatePresence mode="wait">
          <motion.div
            key={phase}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
          >
            {phase === "run" && (
              <Inspector label="running" accent="text-muted">
                <p className="text-[13px] leading-relaxed text-muted">Seven agents adjudicate the claim. The pipeline returns a wrong denial — which decision caused it?</p>
              </Inspector>
            )}
            {phase === "culprit" && (
              <Inspector label="attribution · every decision intervention-tested in parallel" accent="text-warn">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[11px]">
                  <span className="text-fg/80">{tested.length} tested</span>
                  <span className="text-muted">·</span>
                  <span className="text-pass/70">{innocents.length} ruled innocent</span>
                  <span className="text-muted">·</span>
                  <span className="rounded bg-warn/20 px-1.5 py-0.5 font-semibold text-warn">1 culprit</span>
                </div>
                {/* the real, auditable intervention table — each probe's actual outcome */}
                <ul className="mt-2 font-mono text-[10.5px]">
                  {tested.map((e) => (
                    <li key={e.nodeId} className="flex items-center gap-2 border-t border-line/40 py-1">
                      <span className="w-[62px] shrink-0 text-fg/80">{e.name}</span>
                      <span className="flex-1 truncate text-muted">{e.probedTo}</span>
                      <span className="shrink-0 tnum text-muted">⇒ {e.result?.decision} ${e.result?.amount}</span>
                      {e.flipped ? (
                        <span className="shrink-0 rounded bg-warn/20 px-1 font-semibold text-warn">CULPRIT</span>
                      ) : (
                        <span className="shrink-0 text-pass/70">ruled out</span>
                      )}
                    </li>
                  ))}
                </ul>
                {decoy && decoy.intervened && !decoy.flipped && (
                  <p className="mt-2 text-[11.5px] leading-snug text-muted">
                    Even forcing the <span className="text-fg/80">Decision</span> agent to APPROVE pays <span className="text-fail">$0</span> — the money is wrong upstream. Only the <span className="text-warn">{data.bisect.culpritName}</span> flips the outcome.
                  </p>
                )}
              </Inspector>
            )}
            {phase === "flip" && (
              <Inspector label="counterfactual confirmed" accent="text-pass">
                <p className="text-[13px] leading-relaxed text-fg/85">Same claim, one decision changed at the Classifier — the future re-simulated live and the outcome flipped to <span className="text-pass">APPROVE · $240</span>.</p>
              </Inspector>
            )}
            {phase === "diagnose" && (
              <Inspector label="root cause · Claude effort=max" accent="text-accent">
                <p className="text-[13px] leading-relaxed text-fg/85">{data.repair.rootCause}</p>
              </Inspector>
            )}
            {phase === "repair" && (
              <Inspector label={`repair · ${data.repair.nodeName} prompt`} accent="text-accent">
                <pre className="mb-1.5 max-h-20 overflow-auto whitespace-pre-wrap rounded border border-line bg-bg/60 p-2 font-mono text-[10.5px] leading-snug text-fail/70">{data.repair.originalPrompt}</pre>
                <pre className="max-h-24 overflow-auto whitespace-pre-wrap rounded border border-pass/30 bg-pass/[0.05] p-2 font-mono text-[10.5px] leading-snug text-pass/90">{data.repair.patchedPrompt}</pre>
              </Inspector>
            )}
            {phase === "verify" && (
              <Inspector label="verifier · deterministic code assertion" accent="text-pass">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[12px] text-muted tnum">
                    <span className="text-fail">{data.verify.eval.before.decision} ${data.verify.eval.before.amount}</span>
                    {" → "}
                    <span className="text-pass">{data.verify.eval.after.decision} ${data.verify.eval.after.amount}</span>
                  </span>
                  <span className="rounded-full bg-pass/15 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-pass">✓ verified</span>
                </div>
                <pre className="mt-2 overflow-auto whitespace-pre-wrap rounded border border-pass/30 bg-bg/60 p-2 font-mono text-[10.5px] leading-snug text-fg/80">{data.verify.eval.assertion}</pre>
                <p className="mt-1.5 text-[11px] leading-snug text-muted">
                  Ground truth is this assertion on the live re-run — <span className="text-fg/70">not a model grading itself</span>. <span className="text-fail/80">RED</span> before the repair, <span className="text-pass/80">GREEN</span> after.
                </p>
              </Inspector>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function Inspector({ label, accent, children }: { label: string; accent: string; children: React.ReactNode }) {
  return (
    <>
      <div className={`mb-2 font-mono text-[10px] uppercase tracking-[0.18em] ${accent}`}>{label}</div>
      {children}
    </>
  );
}
