// WorldLine — shared types for the counterfactual debugging loop.

export type Category =
  | "WITHIN_WINDOW_DEFECTIVE"
  | "OUT_OF_WINDOW"
  | "FINAL_SALE"
  | "BUYER_REMORSE";

export interface Claim {
  orderId: string;
  customer: string;
  item: string;
  amount: number;
  purchaseDate: string; // ISO
  requestDate: string; // ISO
  reason: string;
}

export interface PolicyRule {
  eligible: boolean;
  note: string;
}

export interface Configs {
  /** Patchable per-step system prompts (only LLM steps have one). */
  prompts: Record<string, string>;
}

export interface Scenario {
  claim: Claim;
  truePolicy: string;
  groundTruth: { decision: "APPROVE" | "DENY"; amount: number };
  defaultConfigs: Configs;
}

export type State = Record<string, unknown>;
export interface Usage {
  input: number;
  output: number;
}

export interface StepRecord {
  stepId: string;
  name: string;
  kind: "llm" | "rule";
  output: State;
  live: boolean;
  cached?: boolean;
  forked?: boolean;
  usage?: Usage;
}

export interface Outcome {
  decision: "APPROVE" | "DENY" | null;
  amount: number;
  pass: boolean;
}

export interface Run {
  id: string;
  records: StepRecord[];
  finalState: State;
  outcome: Outcome;
}

export interface AuditEvidence {
  nodeId: string;
  name: string;
  correct: boolean;
  reason: string;
  correctOutput?: State;
  intervened: boolean;
  flipped: boolean;
}

export interface BisectResult {
  evidence: AuditEvidence[];
  culpritId: string | null;
  culpritName: string | null;
  forkRun?: Run;
}

export interface Repair {
  nodeId: string;
  nodeName: string;
  originalPrompt: string;
  patchedPrompt: string;
  rootCause: string;
  rationale: string;
}

export interface EvalResult {
  passed: boolean;
  before: { decision: string | null; amount: number };
  after: { decision: string | null; amount: number };
  assertion: string;
}

export interface VerifyResult {
  verifiedRun: Run;
  eval: EvalResult;
}

export interface LoopResult {
  base: Run;
  bisect: BisectResult;
  repair: Repair;
  verify: VerifyResult;
  usage: Usage;
}
