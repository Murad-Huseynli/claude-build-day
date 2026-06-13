// Auto-bisect: Claude audits each intervenable (LLM) decision node against the
// authoritative policy; for any node it flags wrong, we FORK with the corrected
// value and test whether the outcome flips. Culprit = earliest wrong node whose
// correction flips the outcome. Intervention-tested attribution (not "causality").
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

export async function autoBisect(base: Run, ctx: Ctx, addUsage: (u: Usage) => void): Promise<BisectResult> {
  const evidence: AuditEvidence[] = [];
  let culpritId: string | null = null;
  let culpritName: string | null = null;
  let forkRunRes: Run | undefined;

  for (const step of STEPS) {
    if (!step.intervenable) continue;
    const rec = base.records.find((r) => r.stepId === step.id);
    if (!rec) continue;

    const input = inputStateFor(base, step.id);
    const { data, usage } = await callJSON({
      system:
        `You audit ONE step of a refund-adjudication agent pipeline against the authoritative policy. ` +
        `Decide whether the step's OUTPUT is correct GIVEN ITS INPUT. ` +
        `A step is NOT at fault if it correctly applied a (possibly wrong) upstream result — only flag it if ITS OWN output is wrong given its input and the policy.\n\n` +
        `AUTHORITATIVE POLICY:\n${ctx.scenario.truePolicy}`,
      user:
        `STEP: ${step.name} (${step.id})\n` +
        `INPUT STATE:\n${JSON.stringify(input, null, 2)}\n` +
        `STEP OUTPUT:\n${JSON.stringify(rec.output, null, 2)}\n\n` +
        `Return JSON {"correct":boolean,"reason":string,"correctOutput":string}. ` +
        `correctOutput = a JSON object string in the SAME SHAPE as STEP OUTPUT giving the corrected value; use "" if correct.`,
      schema: {
        type: "object",
        properties: {
          correct: { type: "boolean" },
          reason: { type: "string" },
          correctOutput: { type: "string" },
        },
        required: ["correct", "reason", "correctOutput"],
        additionalProperties: false,
      },
      effort: "medium",
    });
    addUsage(usage);

    let corrected: State | undefined;
    if (!data.correct && data.correctOutput && data.correctOutput.trim() && data.correctOutput.trim() !== "{}") {
      try {
        corrected = JSON.parse(data.correctOutput);
      } catch {
        corrected = undefined;
      }
    }

    const ev: AuditEvidence = {
      nodeId: step.id,
      name: step.name,
      correct: !!data.correct,
      reason: data.reason ?? "",
      correctOutput: corrected,
      intervened: false,
      flipped: false,
    };

    if (corrected) {
      ev.intervened = true;
      const forked = await forkRun(base, ctx, step.id, corrected, "bisect-" + step.id);
      for (const r of forked.records) if (r.usage) addUsage(r.usage);
      ev.flipped = forked.outcome.pass;
      if (forked.outcome.pass && !culpritId) {
        culpritId = step.id;
        culpritName = step.name;
        forkRunRes = forked;
      }
    }
    evidence.push(ev);
  }

  return { evidence, culpritId, culpritName, forkRun: forkRunRes };
}
