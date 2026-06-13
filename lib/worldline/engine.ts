// Execution engine: run the 7-step workflow, replay cached upstream state, and
// FORK at a decision node (re-running the downstream tail live). Five LLM
// decision nodes (intake, fraud_check, classify, decision are intervenable);
// only the Classifier is wrong — the auto-bisect rules out the innocents.
import { callJSON } from "./anthropic";
import type {
  Category,
  Configs,
  Outcome,
  PolicyRule,
  Run,
  Scenario,
  State,
  StepRecord,
  Usage,
} from "./types";

const POLICY_TABLE: Record<Category, PolicyRule> = {
  WITHIN_WINDOW_DEFECTIVE: { eligible: true, note: "Defective within the 30-day window — full refund." },
  OUT_OF_WINDOW: { eligible: false, note: "Return window (30 days) has passed." },
  FINAL_SALE: { eligible: false, note: "Final-sale item — non-refundable." },
  BUYER_REMORSE: { eligible: false, note: "Change-of-mind is not covered." },
};
const CATEGORIES = Object.keys(POLICY_TABLE);

function diffDays(a: string, b: string): number {
  return Math.round((+new Date(b) - +new Date(a)) / 86_400_000);
}

export interface Ctx {
  scenario: Scenario;
  configs: Configs;
}

interface StepDef {
  id: string;
  name: string;
  kind: "llm" | "rule";
  intervenable: boolean;
  exec(state: State, ctx: Ctx): Promise<{ output: State; live: boolean; usage?: Usage }>;
}

export const STEPS: StepDef[] = [
  {
    id: "intake",
    name: "Intake",
    kind: "llm",
    intervenable: true,
    async exec(_state, ctx) {
      const c = ctx.scenario.claim;
      const days = diffDays(c.purchaseDate, c.requestDate);
      const { data, usage } = await callJSON({
        system: ctx.configs.prompts.intake,
        user: `Claim:\n${JSON.stringify(c, null, 2)}\n\nReturn JSON {"defectClaimed": boolean, "finalSale": boolean}.`,
        schema: {
          type: "object",
          properties: { defectClaimed: { type: "boolean" }, finalSale: { type: "boolean" } },
          required: ["defectClaimed", "finalSale"],
          additionalProperties: false,
        },
        effort: "low",
      });
      return {
        output: { claim: c, daysSincePurchase: days, defectClaimed: data.defectClaimed, finalSale: data.finalSale },
        live: true,
        usage,
      };
    },
  },
  {
    id: "fraud_check",
    name: "Fraud Check",
    kind: "llm",
    intervenable: true,
    async exec(state, ctx) {
      const { data, usage } = await callJSON({
        system: ctx.configs.prompts.fraud_check,
        user:
          `Claim:\n${JSON.stringify(state.claim, null, 2)}\n` +
          `defectClaimed=${state.defectClaimed} finalSale=${state.finalSale} daysSincePurchase=${state.daysSincePurchase}\n\n` +
          `Return JSON {"fraudRisk":"LOW"|"MEDIUM"|"HIGH","reason":string}.`,
        schema: {
          type: "object",
          properties: { fraudRisk: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] }, reason: { type: "string" } },
          required: ["fraudRisk", "reason"],
          additionalProperties: false,
        },
        effort: "low",
      });
      return { output: { fraudRisk: data.fraudRisk, fraudReason: data.reason }, live: true, usage };
    },
  },
  {
    id: "classify",
    name: "Classifier",
    kind: "llm",
    intervenable: true,
    async exec(state, ctx) {
      const { data, usage } = await callJSON({
        system: ctx.configs.prompts.classify,
        user:
          `Claim:\n${JSON.stringify({ ...(state.claim as object), daysSincePurchase: state.daysSincePurchase, defectClaimed: state.defectClaimed, finalSale: state.finalSale }, null, 2)}\n\n` +
          `Return JSON {"category": one of ${JSON.stringify(CATEGORIES)}}.`,
        schema: {
          type: "object",
          properties: { category: { type: "string", enum: CATEGORIES } },
          required: ["category"],
          additionalProperties: false,
        },
        effort: "low",
      });
      return { output: { category: data.category }, live: true, usage };
    },
  },
  {
    id: "retrieve_policy",
    name: "Policy Retriever",
    kind: "rule",
    intervenable: false,
    async exec(state) {
      const rule = POLICY_TABLE[state.category as Category] ?? POLICY_TABLE.OUT_OF_WINDOW;
      return { output: { policyRule: rule }, live: false };
    },
  },
  {
    id: "eligibility",
    name: "Eligibility",
    kind: "rule",
    intervenable: false,
    async exec(state) {
      const r = state.policyRule as PolicyRule;
      return { output: { eligible: r.eligible, eligReason: r.note }, live: false };
    },
  },
  {
    id: "amount",
    name: "Amount",
    kind: "rule",
    intervenable: false,
    async exec(state) {
      const claim = state.claim as { amount: number };
      return { output: { amount: state.eligible ? claim.amount : 0 }, live: false };
    },
  },
  {
    id: "decision",
    name: "Decision",
    kind: "llm",
    intervenable: true,
    async exec(state, ctx) {
      const { data, usage } = await callJSON({
        system: ctx.configs.prompts.decision,
        user:
          `Eligibility: ${state.eligible} (${state.eligReason})\n` +
          `Computed amount: $${state.amount}\n` +
          `Claim category: ${state.category}\n\n` +
          `Return JSON {"decision":"APPROVE"|"DENY","rationale":string}.`,
        schema: {
          type: "object",
          properties: {
            decision: { type: "string", enum: ["APPROVE", "DENY"] },
            rationale: { type: "string" },
          },
          required: ["decision", "rationale"],
          additionalProperties: false,
        },
        effort: "low",
      });
      return { output: { decision: data.decision, rationale: data.rationale }, live: true, usage };
    },
  },
];

export function evalOutcome(state: State, scenario: Scenario): Outcome {
  const pass = state.decision === "APPROVE" && state.amount === scenario.groundTruth.amount;
  return { decision: (state.decision as Outcome["decision"]) ?? null, amount: (state.amount as number) ?? 0, pass };
}

async function execFrom(ctx: Ctx, seed: State, startIndex: number): Promise<{ records: StepRecord[]; finalState: State }> {
  let state: State = { ...seed };
  const records: StepRecord[] = [];
  for (let i = startIndex; i < STEPS.length; i++) {
    const step = STEPS[i];
    const { output, live, usage } = await step.exec(state, ctx);
    state = { ...state, ...output };
    records.push({ stepId: step.id, name: step.name, kind: step.kind, output, live, usage });
  }
  return { records, finalState: state };
}

export async function runWorkflow(ctx: Ctx, id = "run"): Promise<Run> {
  const { records, finalState } = await execFrom(ctx, {}, 0);
  return { id, records, finalState, outcome: evalOutcome(finalState, ctx.scenario) };
}

/** Fork: reuse cached outputs before `forkId`, inject `forkOutput`, re-run the tail live. */
export async function forkRun(base: Run, ctx: Ctx, forkId: string, forkOutput: State, id = "fork"): Promise<Run> {
  const forkIndex = STEPS.findIndex((s) => s.id === forkId);
  if (forkIndex < 0) throw new Error("unknown fork node: " + forkId);

  let seed: State = {};
  const cached: StepRecord[] = [];
  for (let i = 0; i < forkIndex; i++) {
    const r = base.records.find((x) => x.stepId === STEPS[i].id)!;
    seed = { ...seed, ...r.output };
    cached.push({ ...r, cached: true, live: false });
  }
  seed = { ...seed, ...forkOutput };
  const forkRec: StepRecord = {
    stepId: forkId,
    name: STEPS[forkIndex].name,
    kind: STEPS[forkIndex].kind,
    output: forkOutput,
    live: false,
    forked: true,
  };
  const tail = await execFrom(ctx, seed, forkIndex + 1);
  return {
    id,
    records: [...cached, forkRec, ...tail.records],
    finalState: tail.finalState,
    outcome: evalOutcome(tail.finalState, ctx.scenario),
  };
}
