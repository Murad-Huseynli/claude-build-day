// Deterministic engine tests (LLM mocked — fast, no tokens). The live model is
// proven separately by scripts/prove.ts. These lock the fork/replay mechanics:
// the counterfactual flip and the repair-verification re-run.
import { vi, describe, it, expect } from "vitest";

vi.mock("./anthropic", () => ({
  MODEL: "claude-opus-4-8",
  callJSON: vi.fn(async ({ system, user }: { system: string; user: string }) => {
    if (user.includes('"category"')) {
      const buggy = /same calendar month/i.test(system);
      return { data: { category: buggy ? "OUT_OF_WINDOW" : "WITHIN_WINDOW_DEFECTIVE" }, usage: { input: 1, output: 1 } };
    }
    if (user.includes('"decision"')) {
      const eligible = /Eligibility:\s*true/.test(user);
      return { data: { decision: eligible ? "APPROVE" : "DENY", rationale: "test" }, usage: { input: 1, output: 1 } };
    }
    throw new Error("unexpected mocked call");
  }),
}));

import { runWorkflow, forkRun, type Ctx } from "./engine";
import { SCENARIO } from "./scenario";

function ctx(): Ctx {
  return { scenario: SCENARIO, configs: JSON.parse(JSON.stringify(SCENARIO.defaultConfigs)) };
}

describe("WorldLine engine", () => {
  it("buggy run fails (DENY / $0)", async () => {
    const run = await runWorkflow(ctx());
    expect(run.outcome.pass).toBe(false);
    expect(run.outcome.decision).toBe("DENY");
    expect(run.outcome.amount).toBe(0);
  });

  it("counterfactual flip: forking the Classifier to the correct category flips the outcome to PASS", async () => {
    const base = await runWorkflow(ctx());
    const forked = await forkRun(base, ctx(), "classify", { category: "WITHIN_WINDOW_DEFECTIVE" });
    expect(forked.outcome.pass).toBe(true);
    expect(forked.outcome.decision).toBe("APPROVE");
    expect(forked.outcome.amount).toBe(240);
    expect(forked.records.find((r) => r.stepId === "classify")?.forked).toBe(true);
    // upstream cached, tail re-run live
    expect(forked.records.find((r) => r.stepId === "intake")?.cached).toBe(true);
    expect(forked.records.find((r) => r.stepId === "decision")?.live).toBe(true);
  });

  it("safety property: forcing the Decision node alone does NOT flip (amount stays $0)", async () => {
    const base = await runWorkflow(ctx());
    const forked = await forkRun(base, ctx(), "decision", { decision: "APPROVE", rationale: "forced" });
    expect(forked.outcome.pass).toBe(false);
  });

  it("repair verification: re-running with a corrected classifier prompt passes", async () => {
    const c = ctx();
    c.configs.prompts.classify = 'Classify using the 30 calendar day window. Return JSON {"category": ...}';
    const run = await runWorkflow(c);
    expect(run.outcome.pass).toBe(true);
    expect(run.outcome.amount).toBe(240);
  });
});
