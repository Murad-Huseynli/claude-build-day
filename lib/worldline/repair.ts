// Diagnosis + repair (effort: max — highest-stakes reasoning) and verification.
import { runWorkflow, type Ctx } from "./engine";
import { callJSON } from "./anthropic";
import type { BisectResult, Repair, Run, Usage, VerifyResult } from "./types";

export async function diagnoseAndRepair(
  base: Run,
  bisect: BisectResult,
  ctx: Ctx,
  addUsage: (u: Usage) => void,
): Promise<Repair> {
  const nodeId = bisect.culpritId!;
  const ev = bisect.evidence.find((e) => e.nodeId === nodeId)!;
  const originalPrompt = ctx.configs.prompts[nodeId];
  const badOutput = base.records.find((r) => r.stepId === nodeId)?.output;

  const { data, usage } = await callJSON({
    system:
      `You are a senior reliability engineer. An agent step misbehaved because its PROMPT encodes a wrong policy. ` +
      `Rewrite the prompt to fix the root cause while preserving its structure and its JSON output contract. ` +
      `Change only what is needed to align it with the authoritative policy.`,
    user:
      `AUTHORITATIVE POLICY:\n${ctx.scenario.truePolicy}\n\n` +
      `CULPRIT STEP: ${ev.name} (${nodeId})\n` +
      `CURRENT PROMPT:\n"""${originalPrompt}"""\n\n` +
      `It produced ${JSON.stringify(badOutput)} but the correct output is ${JSON.stringify(ev.correctOutput)} because: ${ev.reason}\n\n` +
      `Return JSON {"rootCause":string,"patchedPrompt":string,"rationale":string}. ` +
      `patchedPrompt MUST be the full corrected system prompt.`,
    schema: {
      type: "object",
      properties: {
        rootCause: { type: "string" },
        patchedPrompt: { type: "string" },
        rationale: { type: "string" },
      },
      required: ["rootCause", "patchedPrompt", "rationale"],
      additionalProperties: false,
    },
    effort: "max",
    maxTokens: 2048,
  });
  addUsage(usage);

  return {
    nodeId,
    nodeName: ev.name,
    originalPrompt,
    patchedPrompt: data.patchedPrompt,
    rootCause: data.rootCause,
    rationale: data.rationale,
  };
}

/** Re-run the FULL workflow with the patched prompt and assert the outcome passes. */
export async function verifyRepair(
  repair: Repair,
  ctx: Ctx,
  base: Run,
  addUsage: (u: Usage) => void,
): Promise<VerifyResult> {
  const newCtx: Ctx = {
    scenario: ctx.scenario,
    configs: { prompts: { ...ctx.configs.prompts, [repair.nodeId]: repair.patchedPrompt } },
  };
  const verifiedRun = await runWorkflow(newCtx, "verify");
  for (const r of verifiedRun.records) if (r.usage) addUsage(r.usage);

  return {
    verifiedRun,
    eval: {
      passed: verifiedRun.outcome.pass,
      before: { decision: base.outcome.decision, amount: base.outcome.amount },
      after: { decision: verifiedRun.outcome.decision, amount: verifiedRun.outcome.amount },
      assertion: `decision==="APPROVE" && amount===${ctx.scenario.groundTruth.amount}`,
    },
  };
}
