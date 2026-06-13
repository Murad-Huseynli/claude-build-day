// Deterministic test of the institutional-memory recurrence-prevention loop
// (LLM mocked). The live behavior is proven by scripts/prove-memory.ts.
import { vi, describe, it, expect } from "vitest";

vi.mock("./anthropic", () => ({
  MODEL: "claude-opus-4-8",
  callJSON: vi.fn(async ({ system, user }: { system: string; user: string }) => {
    if (user.includes('"matchId"')) {
      return { data: { matchId: "WL-001", confidence: 0.9, rationale: "same date-window failure class" }, usage: { input: 1, output: 1 } };
    }
    if (user.includes('{"category"')) {
      const buggy = /same calendar month/i.test(system);
      return { data: { category: buggy ? "OUT_OF_WINDOW" : "WITHIN_WINDOW_DEFECTIVE" }, usage: { input: 1, output: 1 } };
    }
    if (user.includes('"fraudRisk"')) {
      return { data: { fraudRisk: "LOW", reason: "ok" }, usage: { input: 1, output: 1 } };
    }
    if (user.includes('"defectClaimed"')) {
      return { data: { defectClaimed: true, finalSale: false }, usage: { input: 1, output: 1 } };
    }
    if (user.includes('"decision"')) {
      const elig = /Eligibility:\s*true/.test(user);
      return { data: { decision: elig ? "APPROVE" : "DENY", rationale: "t" }, usage: { input: 1, output: 1 } };
    }
    throw new Error("unexpected mocked call");
  }),
}));

import { runPrevention, SEED_LESSONS } from "./knowledge";

describe("institutional memory", () => {
  it("recurrence prevention: a different agent is matched to memory and repaired without re-debugging", async () => {
    const r = await runPrevention(SEED_LESSONS);
    expect(r.failed.decision).toBe("DENY"); // would have shipped the bug
    expect(r.match.lesson?.id).toBe("WL-001"); // matched the known failure class
    expect(r.prevented?.pass).toBe(true); // verified fix applied
    expect(r.prevented?.amount).toBe(520);
  });
});
