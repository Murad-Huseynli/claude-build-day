# WorldLine — Demo Script

**Live:** https://claude-build-day-alpha.vercel.app · **Repo:** github.com/Murad-Huseynli/claude-build-day

## The one-liner (say first)
> "Tracing tells you what happened. WorldLine tells you what *would* have happened — it forks a failed agent run at the decision that mattered, re-simulates the future live, and proves the fix."

## 3-minute live demo (beats)
1. **0:00 — Hook (15s).** Land on the hero: *"Your agent failed. Which decision actually mattered?"* "This is a refund pipeline — 6 agents. It just denied a valid claim. Watch." Click **Run the workflow**.
2. **0:15 — The failure (20s).** The red worldline draws: Intake → Classifier → … → **DENY · $0 · FAIL**. "Six steps, one wrong answer. Which one caused it? Today you'd read traces and guess."
3. **0:35 — Auto-bisect (30s).** Stage to **Auto-bisect**. "Claude audits each decision against the policy. It clears the final Decision agent — *it correctly applied its input* — and flags the **Classifier** as wrong, then **forks and re-simulates** to confirm that fixing it actually flips the outcome. That's intervention-tested attribution, not a guess."
4. **1:05 — The fork (25s).** Stage to **Fork** + **Re-simulate**: the **green** counterfactual branch peels off the Classifier; the tail re-runs **live on Opus 4.8**; the outcome flips **red → green: APPROVE · $240 · PASS**.
5. **1:30 — Diagnosis + repair (35s).** Stage to **Diagnose / Author repair**: "Claude finds the root cause — the prompt encoded *'same calendar month'* instead of the real 30-day window — and rewrites the prompt." Show the red/green prompt diff.
6. **2:05 — Proof (25s).** Stage to **Verify**: "It re-runs the *entire* workflow with the patch and asserts the outcome. ✓ REPAIR VERIFIED — before DENY/$0, after APPROVE/$240." This is the self-verifying loop.
7. **2:30 — It's real, not a movie (20s).** Click **Re-run live** → the badge flips to **● LIVE · opus-4.8 · ~7k tok**, the whole loop recomputes on the deployed backend. "Everything you saw just ran live."
8. **2:50 — Close (10s).** "LangGraph and AgentOps already do replay and forking. WorldLine is the loop on top: auto-find the culprit, author the repair, prove it. Git-bisect for agent decisions."

## 1-minute video outline (submission)
- 0:00–0:08 hero + one-liner.
- 0:08–0:25 Run → red FAIL worldline.
- 0:25–0:40 auto-bisect flags Classifier → green fork → red→green flip.
- 0:40–0:52 diagnosis + prompt diff + **✓ REPAIR VERIFIED**.
- 0:52–1:00 **Re-run live** badge + "tests green, live URL, public repo."

## Judging narrative (what we gave the model + the self-fix moment)
- **Brief + rubric** (`brief.md`, `rubric.md`) define the problem and gradeable PASS/FAIL "done."
- **The self-fix moment IS the product:** Claude catches the bad decision (`bisect`), fixes it (`repair`), and **proves** it (`verify`) — and our build was self-graded against `rubric.md` by an independent judge.
- **Rerunnable:** `npm run prove` / `npm test` reproduce it; another team can point the loop at a new workflow tomorrow.

## Fallback (if live fails on stage)
The UI loads a **real recorded run** instantly (`GET /api/loop`) — the full demo works with **zero live calls**. "Re-run live" is the optional proof; if the network is bad, the recorded run is genuine and complete. Backup: `npm run prove` in a terminal.
