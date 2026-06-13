// Auto-bisect: Claude audits every intervenable (LLM) decision node against the
// authoritative policy IN PARALLEL; for any it flags wrong, we FORK with the
// corrected value and test whether the outcome flips. Culprit = earliest wrong
// node whose correction flips the outcome. Intervention-tested attribution.
import { STEPS, forkRun, type Ctx } from "./engine";
import { callJSON } from "./anthropic";
import type { AuditEvidence, BisectResult, Run, State, Usage } from "./types";

/** The state visible to a node = merge of all outputs recorded before it. */
function inputStateFor(run: Run, nodeId: string): State {
  let s: State = {};
  for (const r of run.records) {
    if (r.stepId === nodeId) break;
    s = { ...s, ...r.output };
  }
  return s;
}

async function auditNode(base: Run, ctx: Ctx, stepId: string, name: string): Promise<{ ev: AuditEvidence; usage: Usage }> {
  const rec = base.records.find((r) => r.stepId === stepId)!;
  const input = inputStateFor(base, stepId);
  const { data, usage } = await callJSON({
    system:
      `You audit ONE step of a refund-adjudication agent pipeline against the authoritative policy. ` +
      `Decide whether the step's OUTPUT is correct GIVEN ITS INPUT. ` +
      `A step is NOT at fault if it correctly applied a (possibly wrong) upstream result — only flag it if ITS OWN output is wrong given its input and the policy.\n\n` +
      `AUTHORITATIVE POLICY:\n${ctx.scenario.truePolicy}`,
    user:
      `STEP: ${name} (${stepId})\n` +
      `INPUT STATE:\n${JSON.stringify(input, null, 2)}\n` +
      `STEP OUTPUT:\n${JSON.stringify(rec.output, null, 2)}\n\n` +
      `Return JSON {"correct":boolean,"reason":string,"correctOutput":string}. ` +
      `correctOutput = a JSON object string in the SAME SHAPE as STEP OUTPUT giving the corrected value; use "" if correct.`,
    schema: {
      type: "object",
      properties: { correct: { type: "boolean" }, reason: { type: "string" }, correctOutput: { type: "string" } },
      required: ["correct", "reason", "correctOutput"],
      additionalProperties: false,
    },
    effort: "medium",
  });

  let corrected: State | undefined;
  if (!data.correct && data.correctOutput && data.correctOutput.trim() && data.correctOutput.trim() !== "{}") {
    try {
      corrected = JSON.parse(data.correctOutput);
    } catch {
      corrected = undefined;
    }
  }
  return {
    ev: { nodeId: stepId, name, correct: !!data.correct, reason: data.reason ?? "", correctOutput: corrected, intervened: false, flipped: false },
    usage,
  };
}

/** A plausible counterfactual to probe an audited-correct node with (to show it does NOT flip). */
function probeValue(stepId: string, output: Record<string, unknown>): State | null {
  if (stepId === "decision") return { decision: output.decision === "DENY" ? "APPROVE" : "DENY", rationale: "counterfactual probe" };
  if (stepId === "fraud_check") return { fraudRisk: "HIGH", fraudReason: "counterfactual probe" };
  if (stepId === "intake") return { ...output, finalSale: true };
  return null;
}

/** A short human label for the counterfactual value injected at a node. */
function probeLabel(stepId: string, value: State): string {
  if (stepId === "classify") return `category → ${value.category}`;
  if (stepId === "decision") return `force ${value.decision}`;
  if (stepId === "fraud_check") return `fraudRisk → ${value.fraudRisk}`;
  if (stepId === "intake") return `finalSale → ${value.finalSale}`;
  return "counterfactual";
}

export async function autoBisect(base: Run, ctx: Ctx, addUsage: (u: Usage) => void, probeAll = false): Promise<BisectResult> {
  const candidates = STEPS.filter((s) => s.intervenable && base.records.some((r) => r.stepId === s.id));

  // 1) Audit every candidate node in PARALLEL.
  const audited = await Promise.all(candidates.map((s) => auditNode(base, ctx, s.id, s.name)));
  for (const a of audited) addUsage(a.usage);
  const evidence = audited.map((a) => a.ev);

  // 2) Intervention-test each candidate. Wrong nodes get their corrected value; with
  //    probeAll, audited-correct nodes are also probed with a plausible alternative to
  //    SHOW they don't flip the outcome (the explored dead-ends).
  let culpritId: string | null = null;
  let culpritName: string | null = null;
  let forkRunRes: Run | undefined;
  for (const step of candidates) {
    const ev = evidence.find((e) => e.nodeId === step.id)!;
    const recOut = (base.records.find((r) => r.stepId === step.id)?.output ?? {}) as Record<string, unknown>;
    const value = ev.correctOutput ?? (probeAll ? probeValue(step.id, recOut) : null);
    if (!value) continue;
    ev.intervened = true;
    ev.probedTo = probeLabel(step.id, value);
    const forked = await forkRun(base, ctx, step.id, value, "bisect-" + step.id);
    for (const r of forked.records) if (r.usage) addUsage(r.usage);
    ev.flipped = forked.outcome.pass;
    ev.result = { decision: forked.outcome.decision, amount: forked.outcome.amount };
    // only a node that was audited WRONG and flips the outcome is the culprit
    if (forked.outcome.pass && ev.correctOutput && !culpritId) {
      culpritId = step.id;
      culpritName = step.name;
      forkRunRes = forked;
    }
  }

  return { evidence, culpritId, culpritName, forkRun: forkRunRes };
}
