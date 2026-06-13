# WorldLine — Rubric (model-gradeable PASS/FAIL)

Claude grades the build against these. Each criterion is PASS/FAIL with concrete evidence. "Done" = all CORE + GUARDRAIL criteria PASS.

## CORE — the product loop (must all PASS)
- **R1 — Backend loop runs end-to-end.** Running the proof script prints: original outcome `FAIL`; culprit node identified; a fork at the culprit flips the outcome to `PASS`; a structured repair object; verifier re-run asserts `PASS`. *Evidence: terminal output.*
- **R2 — Downstream re-sim is genuinely live.** The post-fork tail issues real Opus 4.8 (`claude-opus-4-8`) calls — not canned strings. *Evidence: non-zero token usage / request ids logged during fork + verify.*
- **R3 — Auto-bisect is real, not hardcoded.** The search tries interventions across candidate decision nodes; intervening at the culprit flips the outcome, intervening at non-culprit nodes does **not**. The culprit is *discovered*, not asserted. *Evidence: per-node intervention results table.*
- **R4 — Repair is verified by re-execution.** A full workflow re-run with the patched config at the culprit node yields `PASS`, asserted in code; a machine-readable eval result is emitted (`{passed, before, after, assertion}`). *Evidence: eval JSON.*
- **R5 — Demo flow present in UI.** Live URL shows: the worldline, the fork at the culprit, the red→green outcome flip, and diagnosis / repair / verification panels.

## QUALITY — separates good from winning
- **R6 — Verification ladder green.** `vitest` passes: (a) counterfactual-flip assertion, (b) repair-verification assertion, (c) ≥1 API test. *Evidence: test output.*
- **R7 — Live URL 200.** Production alias returns 200, publicly (no auth wall), and runs the golden scenario.
- **R8 — Three.js reveals real behavior.** The 3D shows the actual run structure + the counterfactual branch — not decoration. One cinematic interaction, not a graph editor.

- **R12 — Institutional memory / recurrence prevention.** A verified fix is stored as a lesson; a *different* agent about to repeat the same failure class is matched to that lesson and repaired with the verified fix without re-debugging. *Evidence: `npx tsx scripts/prove-memory.ts`, `POST /api/memory`, the live "Memory" section.*

## GUARDRAILS — disqualifiers / positioning (must all PASS)
- **R9 — Not a prohibited shape.** Interactive counterfactual simulator, not a dashboard-as-product, RAG, Streamlit, or any banned category.
- **R10 — Positioning is honest.** No "nobody has time travel/forking" claims anywhere; the "Existing tools vs WorldLine" table is present; uses "intervention-tested attribution," not "mathematical causality."
- **R11 — Only today's work, public-ready.** Product code is ours; vendored harness skills attributed in `.claude/skills/VENDORED.md`; `.env` never committed.

## Grading
Self-grade after build: list each criterion PASS/FAIL with the evidence pointer. Any CORE or GUARDRAIL FAIL = not done.
