// Deterministic test of the institutional-memory recurrence-prevention loop
// (LLM mocked). The live behavior is proven by scripts/prove-memory.ts.
import { vi, describe, it, expect } from "vitest";

vi.mock("./anthropic", () => ({
  MODEL: "claude-opus-4-8",
  callJSON: vi.fn(async ({ system, user }: { system: string; user: string }) => {
    if (user.includes('"matchId"')) {
      return { data: { matchId: "WL-001", confidence: 0.9, rationale: "same date-window failure class" }, usage: { input: 1, output: 1 } };
    }
    if (user.includes('"risk"')) {
      // only inspect the candidate's proposed rule (the lesson's rootCause also mentions the phrase).
      // The gate must catch the month-boundary MECHANISM, however it's worded — not a literal string.
      const rule = user.split("proposed rule:")[1] ?? "";
      const regress = /billing period|billing cycle|calendar month|same month/i.test(rule) && /wrong-policy-in-prompt/.test(user);
      return { data: { risk: regress ? "high" : "none", why: "t" }, usage: { input: 1, output: 1 } };
    }
    if (user.includes('{"category"')) {
      const buggy = /same calendar month|billing cycle/i.test(system);
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

import { runPrevention, gateCandidate, CANDIDATES, SEED_LESSONS } from "./knowledge";

describe("institutional memory", () => {
  it("recurrence prevention: a different agent is matched to memory and repaired without re-debugging", async () => {
    const r = await runPrevention(SEED_LESSONS);
    expect(r.failed.decision).toBe("DENY"); // would have shipped the bug
    expect(r.match.lesson?.id).toBe("WL-001"); // matched the known failure class
    expect(r.prevented?.pass).toBe(true); // verified fix applied
    expect(r.prevented?.amount).toBe(520);
  });

  it("pre-ship gate blocks a candidate that reintroduces a known lesson, clears a safe one", async () => {
    const bad = await gateCandidate(CANDIDATES[0], SEED_LESSONS);
    expect(bad.gate).toBe("BLOCK");
    expect(bad.blockedBy).toContain("WL-001");
    const good = await gateCandidate(CANDIDATES[1], SEED_LESSONS);
    expect(good.gate).toBe("PASS");
  });
});
