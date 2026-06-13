// The golden scenario: a refund-adjudication pipeline whose Classifier prompt
// encodes a SUBTLY WRONG policy ("same calendar month" instead of the true
// 30-day window). Several other agents (intake, fraud-check, decision) are
// plausible suspects but are correct — the auto-bisect rules them out.
import type { Scenario } from "./types";

export const INTAKE_PROMPT = `You extract structured facts from a refund claim.
Return JSON {"defectClaimed": boolean, "finalSale": boolean}.
- defectClaimed: true if the customer states the item was defective/broken/not working.
- finalSale: true only if the item is explicitly marked final sale.`;

export const FRAUD_PROMPT = `You assess fraud risk for a refund claim.
Return JSON {"fraudRisk": "LOW" | "MEDIUM" | "HIGH", "reason": string}.
Flag HIGH only with concrete signals (mismatched identity, repeat abuse, impossible timeline). A single ordinary defective-item claim within a normal timeframe is LOW.`;

// BUG lives here: "same calendar month" is not the real policy (30 days is).
export const BUGGY_CLASSIFIER_PROMPT = `You classify a refund claim into exactly one category.
Categories: WITHIN_WINDOW_DEFECTIVE, OUT_OF_WINDOW, FINAL_SALE, BUYER_REMORSE.

Return-window policy (apply literally):
- A return is valid ONLY if the request is made in the SAME CALENDAR MONTH as the purchase. If the request month differs from the purchase month, classify OUT_OF_WINDOW.
- If the item is marked final sale, classify FINAL_SALE.
- If the reason is change-of-mind with no defect, classify BUYER_REMORSE.
- Otherwise classify WITHIN_WINDOW_DEFECTIVE.`;

export const DECISION_PROMPT = `You are the final refund adjudicator.
Given the eligibility result and the computed amount, decide APPROVE or DENY.
Rule: APPROVE only if eligible is true AND amount > 0; otherwise DENY.
Provide a one-sentence, customer-facing rationale.`;

export const TRUE_POLICY = `Authoritative refund policy:
- The return window is 30 CALENDAR DAYS from the purchase date (NOT "same calendar month").
- An item defective on arrival, within the 30-day window, receives a FULL refund (category WITHIN_WINDOW_DEFECTIVE).
- Final-sale items are non-refundable (FINAL_SALE).
- Change-of-mind with no defect is not covered (BUYER_REMORSE).
- Requests made after 30 days are OUT_OF_WINDOW.`;

export const SCENARIO: Scenario = {
  claim: {
    orderId: "A-4471",
    customer: "Northwind Traders",
    item: "Standard Widget (not final sale)",
    amount: 240,
    purchaseDate: "2026-05-28",
    requestDate: "2026-06-10", // 13 days later — within the true 30-day window
    reason: "Arrived defective — the unit will not power on.",
  },
  truePolicy: TRUE_POLICY,
  groundTruth: { decision: "APPROVE", amount: 240 },
  defaultConfigs: {
    prompts: {
      intake: INTAKE_PROMPT,
      fraud_check: FRAUD_PROMPT,
      classify: BUGGY_CLASSIFIER_PROMPT,
      decision: DECISION_PROMPT,
    },
  },
};

// The verified fix WorldLine authors for the classifier bug — stored as a reusable
// lesson asset so a DIFFERENT agent with the same failure class can be repaired
// from memory without re-debugging.
export const CORRECTED_CLASSIFIER_PROMPT = `You classify a refund/warranty claim into exactly one category.
Categories: WITHIN_WINDOW_DEFECTIVE, OUT_OF_WINDOW, FINAL_SALE, BUYER_REMORSE.

Return-window policy (apply literally):
- The return window is 30 CALENDAR DAYS from the purchase date. Crossing a month boundary does NOT make a request out of window — only more than 30 days does.
- If the item is marked final sale, classify FINAL_SALE.
- If the reason is change-of-mind with no defect, classify BUYER_REMORSE.
- Otherwise, if defective within the 30-day window, classify WITHIN_WINDOW_DEFECTIVE.`;

// A SECOND agent (warranty desk) carrying the SAME failure CLASS but with
// DIFFERENT surface wording — "billing cycle" instead of "calendar month". This is
// the whole point of causal memory: the match is on the failure MECHANISM (a
// month-boundary heuristic standing in for the true 30-day window), not the text.
export const BUGGY_WARRANTY_PROMPT = `You classify a warranty claim into exactly one category.
Categories: WITHIN_WINDOW_DEFECTIVE, OUT_OF_WINDOW, FINAL_SALE, BUYER_REMORSE.

Coverage-window policy (apply literally):
- A claim is covered ONLY if it is filed in the SAME BILLING CYCLE as the purchase. A new billing cycle begins on the 1st of each month. If the claim falls in a later billing cycle than the purchase, classify OUT_OF_WINDOW.
- If the item is marked final sale, classify FINAL_SALE.
- If the reason is change-of-mind with no defect, classify BUYER_REMORSE.
- Otherwise classify WITHIN_WINDOW_DEFECTIVE.`;

export const SCENARIO_B: Scenario = {
  claim: {
    orderId: "W-8830",
    customer: "Cobalt Logistics",
    item: "Industrial sensor (warranty, not final sale)",
    amount: 520,
    purchaseDate: "2026-05-30",
    requestDate: "2026-06-12", // 13 days — within the 30-day window, crosses a month boundary
    reason: "Dead on arrival under warranty — sensor will not initialize.",
  },
  truePolicy: TRUE_POLICY,
  groundTruth: { decision: "APPROVE", amount: 520 },
  defaultConfigs: {
    prompts: {
      intake: INTAKE_PROMPT,
      fraud_check: FRAUD_PROMPT,
      classify: BUGGY_WARRANTY_PROMPT, // different wording, SAME failure class as WL-001
      decision: DECISION_PROMPT,
    },
  },
};
