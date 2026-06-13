# WorldLine — Build Day Session Log

**Date:** 2026-06-13 · **Built with:** Claude Code + Claude **Opus 4.8** (`claude-opus-4-8`)
**Live:** https://claude-build-day-alpha.vercel.app · **Repo:** https://github.com/Murad-Huseynli/claude-build-day

> This is a curated log of how the build was orchestrated and self-verified. For the full verbatim transcript, run `/export session-log.md` in Claude Code (it will overwrite this file) and re-commit.

---

## What we built
**WorldLine** — counterfactual debugging **+ institutional memory** for multi-agent AI reliability. When an agent pipeline fails, WorldLine has Claude **intervention-test every decision in parallel** to find the *causal* culprit (ruling out plausible decoys), **author a repair**, **prove it flips the outcome with a deterministic code assertion**, then file the verified fix as a durable **lesson** so the whole agent fleet stops repeating it — applied pre-emptively at runtime (recurrence prevention) and in CI (a pre-ship regression gate).

The reliability lifecycle, all real and demoed: **Detect → Attribute → Repair → Verify → Remember → Prevent → Gate.**

---

## The orchestration loop (the part judged as "Orchestration")
We kept a deliberately simple, repeatable loop and ran it every iteration:

1. **`brief.md`** — problem, who it's for, what "done" means. Kept current.
2. **`rubric.md`** — gradeable PASS/FAIL criteria the model checks itself against.
3. **Build the smallest thing that satisfies the rubric.**
4. **Verify without a human (the "triple"):** tests pass **+** live URL responds **+** Claude grades the build against `rubric.md`.
5. **Iterate.**

A separate **visual self-verify loop** (`scripts/probe.mjs`) drove the live site with Playwright and captured what stills miss — animation filmstrips, frame-time/jank, layout shift, real page-console errors, and a deterministic text-overlap report — graded against `design-rubric.md` (D1–D10) by Opus **and** an external non-Claude vision critic (`codex`) for an independent second opinion.

---

## How Opus 4.8 was used (beyond a basic call)
- **Structured outputs** — every pipeline/audit/repair call uses `output_config.format = json_schema` with strict schemas, so outputs are machine-checkable, not parsed from prose.
- **Effort, tuned per step** — `low` for the fast pipeline agents, `medium` for the per-node policy audit, **`max` for the repair author** (the hardest reasoning step).
- **Parallel, multi-call agentic work** — the auto-bisect **audits every decision node in parallel**; the pre-ship gate fans out **one regression check per accumulated lesson in parallel**; idea-stage and the final review used **parallel independent critic agents**.
- **Intervention-tested attribution** — Claude doesn't just *guess* a culprit: it forks the run at each decision, injects a counterfactual, **re-simulates the downstream live**, and keeps only the intervention that actually flips the outcome.
- **Model-graded verify loop, anchored by deterministic ground truth** — the loop is graded against a rubric *and* by Claude, but the **reliability claim rests on a code assertion** (`decision==="APPROVE" && amount===240`), explicitly *not* a model grading itself.
- **The self-fix moment IS the product** — Claude catches its own bad decision (Attribute), fixes it (Repair), and proves it (Verify) — the exact "model catches and fixes its own failure" beat.

---

## Verification ladder (run as far as it exists, every iteration)
`typecheck (tsc) → unit tests (vitest) → production build (next build) → smoke-test the LIVE URL (200 + API payload checks) → grade vs rubric.md (Opus) → independent external critic (codex) → visual probe (Playwright telemetry)`

**Final verified state:** 8/8 tests · clean build · live URL 200 with working live loop · probe gates green (0 console errors, CLS ≈ 0.0005, ~14 ms desktop / 12 ms mobile frame-time, 0 jank, no text overlaps).

---

## Key decisions & self-corrections (discipline)
- **Honest positioning.** An early draft overclaimed novelty ("nobody forks/replays agent runs"). We checked it against primary docs (LangGraph `updateState`+resume, AgentOps), found the claim false, and **repositioned** to the defensible wedge: *intervention-tested attribution + verified repair + pre-emptive prevention*. Saved as a standing rule: verify competitive claims before asserting them.
- **Never claim it works without running it.** Every "done" is backed by real command output or a real 200 from the live URL.
- **A ruthless final "council" → synthesis → fix → re-grade.** Three independent Opus critics (VC/market, principal engineer, Round-2 judge) reviewed with no sugarcoating. All three converged on the same gaps; we shipped fixes for every convergent item and re-verified:
  - **Confounded-decoy attribution** — the last-touch *Decision* agent looks guilty; forcing it to `APPROVE` still pays **$0** (exonerated by real compute); only the upstream Classifier flips. Surfaced as an **auditable intervention table** (each probe's real outcome) + a "4 tested · 3 innocent · 1 culprit" counter and visible dead-end branches in the 3D worldline.
  - **Causal memory, not string-matching** — the second agent's bug was **reworded** ("billing cycle" vs "calendar month"); it still matches the lesson **on mechanism** (proven live, 0.78), and the pre-ship gate **BLOCKS a lexically-divergent** "billing period" regression (real Opus saw through the rewording).
  - **Assertion as the trust anchor**, separate from any self-grade; **ROI asymmetry** panel (debug once with Opus-max, prevent recurrences free).
- **Scope discipline.** Kept to **one** polished killer scenario with a known-good recorded fallback; the external critic's "prove a second domain end-to-end live" was logged as the honest next build rather than risking the demo at the deadline.

---

## Stack
Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind v4 · react-three-fiber / drei / three (the 3D worldline) · motion · Anthropic SDK (`claude-opus-4-8`) · deployed on Vercel. Backend loops are reproducible from a terminal: `npm run prove`, `npm run prove:memory`, `npm run prove:gate`; `npm test` runs the deterministic suite.

---

## Artifacts in this repo
`brief.md` · `rubric.md` · `design-rubric.md` · `demo-script.md` · `vo-script.md` · `README.md` · the WorldLine engine/loop/knowledge backend under `lib/worldline/` · the UI under `app/` + `components/` · the self-verify harness under `scripts/`.
