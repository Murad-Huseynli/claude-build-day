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

export async function autoBisect(base: Run, ctx: Ctx, addUsage: (u: Usage) => void): Promise<BisectResult> {
  const candidates = STEPS.filter((s) => s.intervenable && base.records.some((r) => r.stepId === s.id));

  // 1) Audit every candidate node in PARALLEL.
  const audited = await Promise.all(candidates.map((s) => auditNode(base, ctx, s.id, s.name)));
  for (const a of audited) addUsage(a.usage);
  const evidence = audited.map((a) => a.ev);

  // 2) For each wrong node (in pipeline order), fork with the correction and test the flip.
  let culpritId: string | null = null;
  let culpritName: string | null = null;
  let forkRunRes: Run | undefined;
  for (const step of candidates) {
    const ev = evidence.find((e) => e.nodeId === step.id)!;
    if (!ev.correctOutput) continue;
    ev.intervened = true;
    const forked = await forkRun(base, ctx, step.id, ev.correctOutput, "bisect-" + step.id);
    for (const r of forked.records) if (r.usage) addUsage(r.usage);
    ev.flipped = forked.outcome.pass;
    if (forked.outcome.pass && !culpritId) {
      culpritId = step.id;
      culpritName = step.name;
      forkRunRes = forked;
    }
  }

  return { evidence, culpritId, culpritName, forkRun: forkRunRes };
}
