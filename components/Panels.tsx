"use client";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import type { LoopResult } from "@/lib/worldline/types";

function Reveal({ show, children }: { show: boolean; children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-panel/80 p-4 backdrop-blur-md">{children}</div>
  );
}

function Eyebrow({ children, color = "text-muted" }: { children: React.ReactNode; color?: string }) {
  return <div className={`mb-2 font-mono text-[10px] uppercase tracking-[0.18em] ${color}`}>{children}</div>;
}

export default function Panels({ data, stage }: { data: LoopResult; stage: number }) {
  const culprit = data.bisect.evidence.find((e) => e.nodeId === data.bisect.culpritId);
  const flipped = stage >= 4;

  return (
    <div className="flex flex-col gap-3">
      {/* Outcome */}
      <Reveal show={stage >= 1}>
        <Card>
          <Eyebrow>Outcome</Eyebrow>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="font-mono text-sm text-fail">
                {data.base.outcome.decision} · ${data.base.outcome.amount}
              </div>
              <div className="text-[11px] text-muted">original run · FAIL</div>
            </div>
            <AnimatePresence>
              {flipped && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 220, damping: 18 }}
                  className="flex items-center gap-3"
                >
                  <span className="text-muted">→</span>
                  <div className="text-right">
                    <div className="font-mono text-sm text-pass">
                      {data.verify.eval.after.decision} · ${data.verify.eval.after.amount}
                    </div>
                    <div className="text-[11px] text-pass/80">counterfactual · PASS</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Card>
      </Reveal>

      {/* Auto-bisect */}
      <Reveal show={stage >= 2}>
        <Card>
          <Eyebrow color="text-warn">Auto-bisect · intervention-tested attribution</Eyebrow>
          <div className="flex flex-col gap-2">
            {data.bisect.evidence.map((e) => {
              const isCulprit = e.nodeId === data.bisect.culpritId;
              return (
                <div key={e.nodeId} className="text-[12px]">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{e.name}</span>
                    {e.correct ? (
                      <span className="rounded bg-pass/15 px-1.5 py-0.5 font-mono text-[10px] text-pass">audited OK</span>
                    ) : (
                      <span className="rounded bg-fail/15 px-1.5 py-0.5 font-mono text-[10px] text-fail">WRONG</span>
                    )}
                    {e.intervened && (
                      <span className="font-mono text-[10px] text-muted">
                        → intervened → {e.flipped ? <span className="text-pass">FLIPPED ✅</span> : "no flip"}
                      </span>
                    )}
                    {isCulprit && <span className="rounded bg-warn/20 px-1.5 py-0.5 font-mono text-[10px] text-warn">CULPRIT</span>}
                  </div>
                  <div className="mt-0.5 text-[11px] leading-snug text-muted">{e.reason}</div>
                </div>
              );
            })}
          </div>
        </Card>
      </Reveal>

      {/* Diagnosis */}
      <Reveal show={stage >= 5 && !!culprit}>
        <Card>
          <Eyebrow color="text-accent">Root cause · Claude (effort=max)</Eyebrow>
          <p className="text-[12px] leading-relaxed text-fg/90">{data.repair.rootCause}</p>
        </Card>
      </Reveal>

      {/* Repair */}
      <Reveal show={stage >= 6}>
        <Card>
          <Eyebrow color="text-accent">Repair · {data.repair.nodeName} prompt</Eyebrow>
          <div className="space-y-2">
            <div>
              <div className="mb-1 font-mono text-[10px] text-fail">− original</div>
              <pre className="max-h-24 overflow-auto whitespace-pre-wrap rounded border border-line bg-bg/60 p-2 font-mono text-[10px] leading-snug text-muted">
                {data.repair.originalPrompt}
              </pre>
            </div>
            <div>
              <div className="mb-1 font-mono text-[10px] text-pass">+ patched</div>
              <pre className="max-h-28 overflow-auto whitespace-pre-wrap rounded border border-pass/30 bg-pass/5 p-2 font-mono text-[10px] leading-snug text-fg/90">
                {data.repair.patchedPrompt}
              </pre>
            </div>
          </div>
        </Card>
      </Reveal>

      {/* Verify */}
      <Reveal show={stage >= 7}>
        <Card>
          <div className="flex items-center justify-between">
            <Eyebrow color="text-pass">Verifier · re-ran full workflow</Eyebrow>
            <span className="rounded-full bg-pass/15 px-2 py-0.5 font-mono text-[11px] font-semibold text-pass">
              ✓ REPAIR VERIFIED
            </span>
          </div>
          <div className="mt-1 font-mono text-[11px] text-muted tnum">
            <div>
              before: <span className="text-fail">{data.verify.eval.before.decision} ${data.verify.eval.before.amount}</span>
              {"  →  "}
              after: <span className="text-pass">{data.verify.eval.after.decision} ${data.verify.eval.after.amount}</span>
            </div>
            <div className="mt-1 text-[10px] text-muted/80">assert: {data.verify.eval.assertion}</div>
          </div>
        </Card>
      </Reveal>
    </div>
  );
}
