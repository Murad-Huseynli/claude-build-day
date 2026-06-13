# WorldLine — Brief

**One-liner:** WorldLine is a *flight simulator for agent failures*. Fork any decision in a failed multi-agent run, re-simulate the future live, and let Claude **auto-find the decision that mattered** and **prove the repair**.
*(Engineer hook: "git-bisect for agent decisions.")*

## Problem
Multi-agent systems fail in non-deterministic, multi-step ways: the same input yields different paths, so failures are hard to reproduce and harder to attribute. When a 6-agent pipeline returns the wrong answer, *which decision* caused it? Today teams read traces and guess.

## Who / ROI
AI-engineering and platform teams shipping multi-agent systems. ROI: hours→minutes of debugging, a *provable* fix before merge, fewer production failures.

## The product loop
1. Load a failed multi-agent run (recorded as a causal checkpoint graph).
2. Visualize it as a 3D **worldline**.
3. **Auto-bisect:** Claude/search intervenes across candidate decision nodes and finds the single intervention that flips the outcome → the **culprit**, with counterfactual evidence.
4. The timeline **forks** at the culprit; the post-fork tail **re-simulates live** through the backend (real Opus 4.8 calls downstream, cached state upstream).
5. Final outcome flips **red → green**.
6. Claude explains the **root cause**.
7. Claude proposes a **prompt/policy repair** (structured patch).
8. A **verifier** re-runs the whole scenario with the repair and asserts the outcome passes.
9. UI shows a clean **"repair verified"** result.

## Existing tools vs WorldLine
Replay and forking already exist — we build the *product loop* on top.

| Capability | Tracing (LangSmith / Phoenix / Langfuse) | Replay (AgentOps) | Forking (LangGraph `updateState`) | **WorldLine** |
|---|:--:|:--:|:--:|:--:|
| Show what happened | ✓ | ✓ | ✓ | ✓ |
| Repeat a run | – | ✓ | ✓ | ✓ |
| Explore an alternate path | – | – | ✓ *(manual: human picks checkpoint + edit)* | ✓ |
| **Auto-find the culprit decision** | – | – | – | ✓ |
| **Author a repair** | – | – | – | ✓ |
| **Verify the repair flips the outcome** | – | – | – | ✓ |

**Positioning honesty:** LangGraph time-travel (`updateState` + resume) and AgentOps time-travel **already** support replay/forking from checkpoints — we do **not** claim otherwise. WorldLine's wedge is the autonomous loop on top: **intervention-tested attribution + Claude-authored repair + automatic verification + cinematic worldline visualization.** We say *"intervention-tested attribution"* and *"counterfactual evidence,"* never *"mathematical causality."*

## "Done" — verifiable without a human
- **Terminal:** the loop runs end-to-end — original outcome `FAIL` → culprit node identified → fork at culprit flips outcome → repair authored → verifier re-run asserts `PASS`.
- **Tests:** counterfactual-flip assertion + repair-verification assertion + API tests pass (`vitest`).
- **Live URL** responds (200) and runs the golden scenario.
- **`rubric.md`** graded PASS by the model.

## Scope (narrow killer — explicitly out of scope)
ONE golden scenario (refund/claim adjudication). Real fork/replay backend; genuinely live downstream re-sim on Opus 4.8; one cinematic 3D interaction. **Not** a generic platform, **not** a dashboard, **not** a graph editor, **not** framework integrations.

## Why not prohibited
It is an interactive **counterfactual debugging simulator** (intervene → re-simulate → verify), not a passive dashboard, not RAG, not Streamlit.

## Sources (verified against primary docs)
- LangGraph time-travel (replay + fork via `updateState`): https://docs.langchain.com/oss/javascript/langgraph/use-time-travel
- AgentOps time-travel debugging: https://www.agentops.ai/
- DoVer — intervention-driven auto-debugging for multi-agent systems: https://openreview.net/forum?id=mrEK16Jy6h
- Multi-agent failure attribution benchmark (2026): https://arxiv.org/abs/2603.25001
