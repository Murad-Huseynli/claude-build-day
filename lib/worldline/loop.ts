// The full WorldLine loop: run -> auto-bisect -> diagnose/repair -> verify.
import { SCENARIO } from "./scenario";
import { runWorkflow, type Ctx } from "./engine";
import { autoBisect } from "./bisect";
import { diagnoseAndRepair, verifyRepair } from "./repair";
import type { LoopResult, Usage } from "./types";

export function freshCtx(): Ctx {
  return { scenario: SCENARIO, configs: JSON.parse(JSON.stringify(SCENARIO.defaultConfigs)) };
}

export async function runFullLoop(opts?: { probeAll?: boolean }): Promise<LoopResult> {
  const usage: Usage = { input: 0, output: 0 };
  const add = (u: Usage) => {
    usage.input += u.input;
    usage.output += u.output;
  };

  const ctx = freshCtx();

  const base = await runWorkflow(ctx, "base");
  for (const r of base.records) if (r.usage) add(r.usage);

  const bisect = await autoBisect(base, ctx, add, opts?.probeAll);
  if (!bisect.culpritId) throw new Error("auto-bisect found no culprit intervention");

  const repair = await diagnoseAndRepair(base, bisect, ctx, add);
  const verify = await verifyRepair(repair, ctx, base, add);

  return { base, bisect, repair, verify, usage };
}
