# Claude Build Day — build harness

**Mission:** ship ONE working, **deployed** demo today. Optimize every decision against the rubric: **Impact 35 · Demo 35 · Opus 4.8 use 15 · Orchestration 15**.

This is NOT the FounderOS founder harness — no discovery/validation gates, no "PRD before code." Write product code from minute one. Reuse only the build-relevant skills below.

## The loop (this IS the Orchestration score — keep it simple + repeatable)
1. `brief.md` — problem, who it's for, what "done" looks like. Keep current.
2. `rubric.md` — gradeable PASS/FAIL criteria the model checks itself against.
3. Build the smallest thing that satisfies the rubric.
4. **Verify without a human:** tests pass **+** live URL responds **+** Claude grades the build against `rubric.md`. That triple is "done."
5. Iterate. A judge should be able to rerun this loop tomorrow on a new problem.

## Model
- Use **Opus 4.8** (`claude-opus-4-8`); adaptive thinking, effort `xhigh` for hard agentic steps.
- **Opus 4.8 use = 15%:** go beyond a basic call — tool use, structured outputs, subagents, MCP, or a model-graded verify loop. Surface a capability that surprises the judges.
- For any Claude API/SDK code, the `claude-api` skill is the source of truth for model IDs and params — never guess.

## Discipline (the good parts of FounderOS)
- **Verify APIs before use** (`anti-hallucination`, `api-verifier`). Never invent endpoints/params. Mark untested work UNVERIFIED.
- **Never claim it works without running it** — real command output or a real 200 from the live URL.
- Small diffs; fix the demo path first; keep a known-good fallback (`demo-coach`).

## Verification ladder (run as far as it exists)
typecheck/lint → unit tests → build → **smoke-test the live URL** → grade against `rubric.md`.

## Skills available here
- **Global (user-level):** `anti-hallucination`, `api-verifier`, `debugger`, `demo-coach`, `claude-api`.
- **Linked from FounderOS** (`.claude/skills/`): `run-and-verify`, `code-review`, `tdd-cycle`, `implementation-plan`.
- Self-verify with **Opus 4.8 + tests + rubric** — not an external model. This is an Anthropic event; show Opus 4.8 catching and fixing its own failure (Round-2 judges explicitly want that moment).

## Submission checklist (due 5:00 PM)
- [ ] Public GitHub repo — only code built today, clearly your work
- [ ] Live URL, deployed and responding
- [ ] `brief.md` + `rubric.md` + session log
- [ ] 1-minute demo video
- [ ] NOT on the prohibited list (no RAG / Streamlit / dashboard-as-main-feature / image analyzer / "AI for education" chatbot / personality or sports analyzer / medical or nutrition or mental-health bot / job screener)
