# WorldLine

**A flight simulator for agent failures.** Fork any decision in a failed multi-agent run, re-simulate the future live, and let Claude **auto-find the decision that mattered** and **prove the repair** — then file it as **fleet memory** so the same failure class never ships twice.

🔗 **Live:** https://claude-build-day-alpha.vercel.app
🧪 Built at **Claude Build Day 2026** with **Claude Opus 4.8** (`claude-opus-4-8`).

> *Engineer's hook: git-bisect for agent decisions.*

---

## The problem

Multi-agent systems fail in non-deterministic, multi-step ways. When a 6-agent pipeline returns the wrong answer, *which decision* caused it? Tracing shows **what happened**; replay **repeats** it; forking lets you **explore one alternate path** — but you still have to guess which decision to change, and nothing proves the fix.

## What WorldLine adds (the honest wedge)

Replay and checkpoint-forking already exist — we don't claim otherwise.

| Capability | Tracing (LangSmith/Phoenix/Langfuse) | Replay (AgentOps) | Forking (LangGraph `updateState`) | **WorldLine** |
|---|:--:|:--:|:--:|:--:|
| Show what happened | ✓ | ✓ | ✓ | ✓ |
| Repeat a run | – | ✓ | ✓ | ✓ |
| Explore an alternate path | – | – | ✓ *(manual)* | ✓ |
| **Auto-find the culprit decision** | – | – | – | ✓ |
| **Author a repair** | – | – | – | ✓ |
| **Verify the repair flips the outcome** | – | – | – | ✓ |

WorldLine is the autonomous **product loop** on top of forking: **intervention-tested attribution → Claude-authored repair → automatic verification**, in a cinematic worldline visualization. (We say *"intervention-tested attribution"*, not *"mathematical causality."*)

## How it works

1. **Run** the golden 6-step refund-adjudication workflow → it **DENIES** a valid claim (FAIL).
2. **Auto-bisect:** Claude audits each agent decision against the authoritative policy; for any it flags wrong, WorldLine **forks** with the corrected value and re-simulates the tail **live on Opus 4.8** to test whether the outcome flips. The earliest wrong-and-flipping node is the **culprit**.
3. **Diagnose + repair:** Claude (effort `max`) explains the root cause and rewrites the culprit's prompt.
4. **Verify:** the full workflow re-runs with the patch and asserts `APPROVE / $240` → **PASS**.

The bug is realistic: the Classifier's prompt encodes a *wrong policy* ("same calendar month" instead of the true 30-day window). One bad classification cascades to the wrong denial; fixing it flips the outcome.

## Run it yourself

```bash
npm install
export ANTHROPIC_API_KEY=sk-ant-...      # your key

npm run prove     # terminal proof of the whole loop (live Opus 4.8)
npm test          # deterministic engine + API tests (no tokens)
npm run dev       # the cinematic UI at http://localhost:3000
```

`npm run record` recaptures the instant-demo default (`lib/worldline/recorded.ts`) from a fresh live run.

## Architecture

- `lib/worldline/engine.ts` — workflow run + **fork/replay** (cached upstream, live downstream).
- `lib/worldline/bisect.ts` — Claude-driven **auto-bisect** (intervention-tested attribution).
- `lib/worldline/repair.ts` — diagnosis + repair (effort `max`) + verifier.
- `app/api/loop/route.ts` — `GET` recorded (instant) · `POST` live re-run.
- `components/WorldlineCanvas.tsx` — r3f/drei dual-worldline 3D.
- `scripts/prove.ts` — terminal proof · `scripts/shot.mjs` — headless browser smoke.

## Verifiable "done"

Tests green · live URL 200 · the loop runs live on prod (`POST /api/loop`) · graded against [`rubric.md`](./rubric.md). See [`brief.md`](./brief.md) and [`demo-script.md`](./demo-script.md).

## Notes

Product code in this repo was built during Claude Build Day. Harness/tooling skills under `.claude/skills/` are attributed in `.claude/skills/VENDORED.md`. Sources for the positioning are in `brief.md`.
