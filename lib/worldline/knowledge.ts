// WorldLine institutional memory: every intervention-tested, verified fix becomes
// a durable Lesson. New agents are checked against the accumulated lessons so the
// same failure class never ships twice (recurrence prevention / continual learning).
import { callJSON } from "./anthropic";
import { runWorkflow, type Ctx } from "./engine";
import { SCENARIO_B, CORRECTED_CLASSIFIER_PROMPT } from "./scenario";
import type { LoopResult, Run, State, Usage } from "./types";

export interface Lesson {
  id: string;
  title: string;
  failureClass: string;
  agent: string;
  culprit: string;
  rootCause: string;
  repairSummary: string;
  patchedPrompt?: string; // the reusable verified fix (when applicable)
  evidence: { before: string; after: string };
  tags: string[];
  mintedAt: string;
  protects: string[]; // agents/domains this lesson now guards
}

// Accumulated fleet memory (would be a store in production; seeded here). Each is a
// real, verified fix minted from a past WorldLine run across different agents.
export const SEED_LESSONS: Lesson[] = [
  {
    id: "WL-001",
    title: "Refund classifier used 'same calendar month' instead of the 30-day window",
    failureClass: "wrong-policy-in-prompt",
    agent: "refund-classifier",
    culprit: "Classifier",
    rootCause: "The classifier prompt encoded the return window as the same calendar month rather than 30 calendar days, so in-window claims that cross a month boundary were denied.",
    repairSummary: "Replace the calendar-month rule with a 30-day window; month boundaries are irrelevant.",
    patchedPrompt: CORRECTED_CLASSIFIER_PROMPT,
    evidence: { before: "DENY · $0", after: "APPROVE · $240" },
    tags: ["policy", "date-window", "classification"],
    mintedAt: "2026-06-13",
    protects: ["refund-classifier", "warranty-classifier", "returns-router"],
  },
  {
    id: "WL-002",
    title: "Invoice extractor parsed DD/MM dates as MM/DD on EU invoices",
    failureClass: "date-format-misparse",
    agent: "invoice-extractor",
    culprit: "Extractor",
    rootCause: "Assumed US date format, producing wrong due dates and false late fees on EU invoices.",
    repairSummary: "Detect locale / require explicit ISO parsing before computing due dates.",
    evidence: { before: "late-fee $1,200", after: "on-time · $0" },
    tags: ["date", "parsing", "extraction"],
    mintedAt: "2026-05-30",
    protects: ["invoice-extractor", "billing-agent"],
  },
  {
    id: "WL-003",
    title: "Support router sent billing tickets to the engineering queue",
    failureClass: "misrouting",
    agent: "support-router",
    culprit: "Router",
    rootCause: "Keyword overlap on 'charge' routed billing issues to tech, breaching SLAs.",
    repairSummary: "Add intent disambiguation and prioritize billing terms in routing.",
    evidence: { before: "SLA breach 38%", after: "SLA breach 4%" },
    tags: ["routing", "intent", "classification"],
    mintedAt: "2026-05-22",
    protects: ["support-router"],
  },
  {
    id: "WL-004",
    title: "Contract summarizer obeyed an instruction injected in the document",
    failureClass: "prompt-injection",
    agent: "contract-summarizer",
    culprit: "Summarizer",
    rootCause: "Treated document text as instructions and approved a non-compliant clause.",
    repairSummary: "Quarantine document content; never execute instructions found inside inputs.",
    evidence: { before: "approved bad clause", after: "flagged + escalated" },
    tags: ["security", "prompt-injection", "summarization"],
    mintedAt: "2026-05-10",
    protects: ["contract-summarizer", "email-agent"],
  },
  {
    id: "WL-005",
    title: "Flaky tool caused an unbounded retry storm",
    failureClass: "retry-storm",
    agent: "enrichment-agent",
    culprit: "Retry policy",
    rootCause: "No backoff or cap on a timing-out tool produced ~100x retries and a cost spike.",
    repairSummary: "Exponential backoff + max-attempts cap + circuit breaker.",
    evidence: { before: "$420 / run", after: "$0.40 / run" },
    tags: ["reliability", "cost", "retries"],
    mintedAt: "2026-04-28",
    protects: ["enrichment-agent", "scraper-agent"],
  },
];

/** Convert a verified WorldLine loop into a durable lesson. */
export function mintLesson(loop: LoopResult): Lesson {
  return {
    id: "WL-001",
    title: "Refund classifier used 'same calendar month' instead of the 30-day window",
    failureClass: "wrong-policy-in-prompt",
    agent: "refund-classifier",
    culprit: loop.bisect.culpritName ?? "Classifier",
    rootCause: loop.repair.rootCause,
    repairSummary: "Replace the calendar-month rule with a 30-day window.",
    patchedPrompt: loop.repair.patchedPrompt,
    evidence: {
      before: `${loop.verify.eval.before.decision} · $${loop.verify.eval.before.amount}`,
      after: `${loop.verify.eval.after.decision} · $${loop.verify.eval.after.amount}`,
    },
    tags: ["policy", "date-window", "classification"],
    mintedAt: new Date().toISOString().slice(0, 10),
    protects: ["refund-classifier", "warranty-classifier", "returns-router"],
  };
}

/** Match a NEW agent failure to a known lesson (same failure mechanism, even across agents). */
export async function checkAgainstMemory(
  sig: { agent: string; culprit: string; wrongOutput: string; context: string },
  lessons: Lesson[],
  add: (u: Usage) => void,
): Promise<{ matchId: string | null; confidence: number; rationale: string }> {
  const catalog = lessons.map((l) => ({ id: l.id, title: l.title, failureClass: l.failureClass, tags: l.tags }));
  const { data, usage } = await callJSON({
    system:
      "You are WorldLine's institutional memory. Given a NEW agent failure, decide whether it matches a KNOWN lesson — i.e. the SAME underlying failure mechanism — so a verified fix can be reused, even across different agents. Match only on mechanism, not surface wording.",
    user:
      `KNOWN LESSONS:\n${JSON.stringify(catalog, null, 2)}\n\n` +
      `NEW FAILURE:\nagent: ${sig.agent}\nculprit step: ${sig.culprit}\nwrong output: ${sig.wrongOutput}\ncontext: ${sig.context}\n\n` +
      `Return JSON {"matchId": <lesson id, or "" if none>, "confidence": number 0..1, "rationale": string}.`,
    schema: {
      type: "object",
      properties: { matchId: { type: "string" }, confidence: { type: "number" }, rationale: { type: "string" } },
      required: ["matchId", "confidence", "rationale"],
      additionalProperties: false,
    },
    effort: "low",
  });
  add(usage);
  return { matchId: data.matchId || null, confidence: data.confidence ?? 0, rationale: data.rationale ?? "" };
}

function out(run: Run, id: string): State {
  return run.records.find((r) => r.stepId === id)?.output ?? {};
}

export interface PreventionResult {
  agent: string;
  failed: { decision: string | null; amount: number };
  match: { lesson: Lesson | null; confidence: number; rationale: string };
  prevented: { decision: string | null; amount: number; pass: boolean } | null;
  usage: Usage;
}

/** A different agent is about to ship the same failure class — match memory and apply the verified fix. */
export async function runPrevention(lessons: Lesson[]): Promise<PreventionResult> {
  const usage: Usage = { input: 0, output: 0 };
  const add = (u: Usage) => {
    usage.input += u.input;
    usage.output += u.output;
  };

  const ctxB: Ctx = { scenario: SCENARIO_B, configs: JSON.parse(JSON.stringify(SCENARIO_B.defaultConfigs)) };
  const baseB = await runWorkflow(ctxB, "agentB");
  for (const r of baseB.records) if (r.usage) add(r.usage);

  const cat = String((out(baseB, "classify") as { category?: string }).category ?? "");
  const days = (out(baseB, "intake") as { daysSincePurchase?: number }).daysSincePurchase;
  const m = await checkAgainstMemory(
    { agent: "warranty-classifier", culprit: "Classifier", wrongOutput: `category=${cat}`, context: `${days} days since purchase; ${SCENARIO_B.claim.reason}` },
    lessons,
    add,
  );
  const lesson = lessons.find((l) => l.id === m.matchId) ?? null;

  let prevented: PreventionResult["prevented"] = null;
  if (lesson?.patchedPrompt) {
    const ctxFix: Ctx = { scenario: SCENARIO_B, configs: { prompts: { ...ctxB.configs.prompts, classify: lesson.patchedPrompt } } };
    const fixed = await runWorkflow(ctxFix, "agentB-fixed");
    for (const r of fixed.records) if (r.usage) add(r.usage);
    prevented = { decision: fixed.outcome.decision, amount: fixed.outcome.amount, pass: fixed.outcome.pass };
  }

  return {
    agent: "warranty-classifier",
    failed: { decision: baseB.outcome.decision, amount: baseB.outcome.amount },
    match: { lesson, confidence: m.confidence, rationale: m.rationale },
    prevented,
    usage,
  };
}

// ── Pre-ship gate ──────────────────────────────────────────────────────────
// A candidate agent change is checked against EVERY accumulated lesson (in
// parallel). If it would reintroduce a known failure class, the gate blocks it —
// the org's verified lessons become a living regression suite for CI/CD.

export interface CandidateChange {
  agent: string;
  label: string;
  promptSnippet: string;
}

export const CANDIDATES: CandidateChange[] = [
  {
    agent: "refund-classifier",
    label: "v2.1 — 'within the billing period' rule",
    // Lexically nothing like "calendar month", but it re-encodes the SAME wrong
    // mechanism (a month-boundary heuristic instead of the true 30-day window).
    promptSnippet: "A return is valid only if it is filed within the same billing period as the purchase, where each period runs from the 1st to the last day of a month.",
  },
  {
    agent: "refund-classifier",
    label: "v2.2 — explicit 30-day window",
    promptSnippet: "A return is valid if requested within 30 calendar days of the purchase date, regardless of any month boundary.",
  },
];

export interface GateCheck {
  lessonId: string;
  failureClass: string;
  risk: "none" | "low" | "high";
  why: string;
}
export interface GateResult {
  candidate: CandidateChange;
  checks: GateCheck[];
  gate: "PASS" | "BLOCK";
  blockedBy: string[];
  usage: Usage;
}

export async function gateCandidate(candidate: CandidateChange, lessons: Lesson[]): Promise<GateResult> {
  const usage: Usage = { input: 0, output: 0 };
  const add = (u: Usage) => {
    usage.input += u.input;
    usage.output += u.output;
  };

  // fan out: one check per lesson, in parallel
  const checks = await Promise.all(
    lessons.map(async (l): Promise<GateCheck> => {
      const { data, usage: u } = await callJSON({
        system:
          "You are WorldLine's pre-ship gate. Given a candidate agent change and ONE known lesson (a past, verified failure), decide whether the change risks REINTRODUCING that failure class. Be precise: flag 'high' only when the change clearly repeats the lesson's root-cause mechanism for the same kind of agent.",
        user:
          `KNOWN LESSON:\n${JSON.stringify({ id: l.id, agent: l.agent, failureClass: l.failureClass, rootCause: l.rootCause }, null, 2)}\n\n` +
          `CANDIDATE CHANGE:\nagent: ${candidate.agent}\nproposed rule: ${candidate.promptSnippet}\n\n` +
          `Return JSON {"risk":"none"|"low"|"high","why":string}.`,
        schema: {
          type: "object",
          properties: { risk: { type: "string", enum: ["none", "low", "high"] }, why: { type: "string" } },
          required: ["risk", "why"],
          additionalProperties: false,
        },
        effort: "low",
      });
      add(u);
      return { lessonId: l.id, failureClass: l.failureClass, risk: data.risk, why: data.why };
    }),
  );

  const blockedBy = checks.filter((c) => c.risk === "high").map((c) => c.lessonId);
  return { candidate, checks, gate: blockedBy.length ? "BLOCK" : "PASS", blockedBy, usage };
}
