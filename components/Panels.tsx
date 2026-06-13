"use client";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import type { LoopResult, State } from "@/lib/worldline/types";

function out(records: LoopResult["base"]["records"], id: string): State {
  return records.find((r) => r.stepId === id)?.output ?? {};
}

function Reveal({ show, children }: { show: boolean; children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const RULE_IDS = new Set(["retrieve_policy", "eligibility", "amount"]);

export default function Panels({ data, stage }: { data: LoopResult; stage: number }) {
  const recs = data.base.records;
  const ev = (id: string) => data.bisect.evidence.find((e) => e.nodeId === id);

  // step rail rows
  const rows = recs.map((r) => {
    const o = r.output as Record<string, unknown>;
    let value = "";
    if (r.stepId === "intake") value = `defect=${o.defectClaimed} final=${o.finalSale}`;
    else if (r.stepId === "fraud_check") value = String(o.fraudRisk ?? "");
    else if (r.stepId === "classify") value = String(o.category ?? "");
    else if (r.stepId === "retrieve_policy") value = "clause";
    else if (r.stepId === "eligibility") value = String(o.eligible);
    else if (r.stepId === "amount") value = `$${o.amount}`;
    else if (r.stepId === "decision") value = String(o.decision ?? "");
    const e = ev(r.stepId);
    return { id: r.stepId, name: r.name, kind: r.kind, value, evidence: e, isCulprit: r.stepId === data.bisect.culpritId };
  });

  return (
    <div className="flex flex-col gap-3 font-mono">
      {/* step rail */}
      <div className="rounded-xl border border-line bg-panel/70 p-3 backdrop-blur-md">
        <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-muted">execution trace</div>
        <ol className="flex flex-col gap-1.5">
          {rows.map((row) => {
            const audited = stage >= 2 && row.evidence;
            return (
              <li key={row.id} className="flex items-center gap-2 text-[12px]">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    row.isCulprit && stage >= 2 ? "bg-warn" : row.id === "decision" ? "bg-fail" : RULE_IDS.has(row.id) ? "bg-muted/50" : "bg-accent"
                  }`}
                />
                <span className={`w-24 shrink-0 ${row.kind === "rule" ? "text-muted" : "text-fg"}`}>{row.name}</span>
                <span className="flex-1 truncate text-muted">{row.value}</span>
                {audited &&
                  (row.evidence!.correct ? (
                    <span className="shrink-0 rounded bg-pass/12 px-1.5 py-0.5 text-[9px] text-pass">ruled out</span>
                  ) : (
                    <span className="shrink-0 rounded bg-warn/20 px-1.5 py-0.5 text-[9px] font-semibold text-warn">CULPRIT</span>
                  ))}
              </li>
            );
          })}
        </ol>
      </div>

      {/* outcome */}
      <Reveal show={stage >= 1}>
        <div className="rounded-xl border border-line bg-panel/70 p-3 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="text-sm text-fail">
                {data.base.outcome.decision} · ${data.base.outcome.amount}
              </div>
              <div className="text-[10px] text-muted">original · FAIL</div>
            </div>
            <AnimatePresence>
              {stage >= 4 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 220, damping: 18 }}
                  className="flex items-center gap-3"
                >
                  <span className="text-muted">→</span>
                  <div className="text-right">
                    <div className="text-sm text-pass">
                      {data.verify.eval.after.decision} · ${data.verify.eval.after.amount}
                    </div>
                    <div className="text-[10px] text-pass/80">counterfactual · PASS</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </Reveal>

      {/* culprit reasoning */}
      <Reveal show={stage >= 2 && !!ev(data.bisect.culpritId ?? "")}>
        <div className="rounded-xl border border-warn/30 bg-warn/[0.06] p-3 backdrop-blur-md">
          <div className="mb-1 text-[10px] uppercase tracking-[0.18em] text-warn">
            culprit · {data.bisect.culpritName} · intervention-tested
          </div>
          <p className="text-[11px] leading-snug text-fg/85">{ev(data.bisect.culpritId ?? "")?.reason}</p>
        </div>
      </Reveal>

      {/* diagnosis */}
      <Reveal show={stage >= 5}>
        <div className="rounded-xl border border-line bg-panel/70 p-3 backdrop-blur-md">
          <div className="mb-1 text-[10px] uppercase tracking-[0.18em] text-accent">root cause · effort=max</div>
          <p className="text-[11px] leading-relaxed text-fg/85">{data.repair.rootCause}</p>
        </div>
      </Reveal>

      {/* repair diff */}
      <Reveal show={stage >= 6}>
        <div className="rounded-xl border border-line bg-panel/70 p-3 backdrop-blur-md">
          <div className="mb-1 text-[10px] uppercase tracking-[0.18em] text-accent">repair · {data.repair.nodeName} prompt</div>
          <pre className="mb-1 max-h-20 overflow-auto whitespace-pre-wrap rounded border border-line bg-bg/60 p-2 text-[9px] leading-snug text-fail/70">
            {data.repair.originalPrompt}
          </pre>
          <pre className="max-h-24 overflow-auto whitespace-pre-wrap rounded border border-pass/30 bg-pass/[0.05] p-2 text-[9px] leading-snug text-pass/90">
            {data.repair.patchedPrompt}
          </pre>
        </div>
      </Reveal>

      {/* verify */}
      <Reveal show={stage >= 7}>
        <div className="rounded-xl border border-pass/30 bg-pass/[0.06] p-3 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.18em] text-pass">verifier · full re-run</span>
            <span className="rounded-full bg-pass/15 px-2 py-0.5 text-[10px] font-semibold text-pass">✓ VERIFIED</span>
          </div>
          <div className="mt-1 text-[10px] text-muted tnum">
            <span className="text-fail">{data.verify.eval.before.decision} ${data.verify.eval.before.amount}</span>
            {" → "}
            <span className="text-pass">{data.verify.eval.after.decision} ${data.verify.eval.after.amount}</span>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
