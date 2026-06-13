# WorldLine — Demo Script

**Live:** https://claude-build-day-alpha.vercel.app · **Repo:** github.com/Murad-Huseynli/claude-build-day

## The one-liner (say first)
> "Tracing tells you what happened. WorldLine tells you what *would* have happened — it forks a failed agent run at the decision that mattered, re-simulates the future live, and proves the fix."

## 3-minute live demo (beats)
1. **0:00 — Hook (15s).** Land on the hero: *"Your agent failed. Which decision actually mattered?"* "This is a refund pipeline — a 7-step agent run. It just denied a valid claim. Watch." Scroll to the simulator (auto-runs).
2. **0:15 — The failure (15s).** The red worldline draws: Intake → Fraud → Classifier → … → **DENY · $0 · FAIL**. "Seven steps, one wrong answer. Which one caused it? Today you'd read traces and guess."
3. **0:30 — Attribution = parallel intervention test + a decoy (35s).** Stage to **Auto-bisect**. "Claude intervention-tests *every* decision in parallel — you can see the forked probes." Point to the counter: **4 tested · 3 ruled innocent · 1 culprit.** "Naive last-touch blame points at the **Decision** agent — it's literally what denied the claim. But force it to APPROVE and the payout's still **$0** — the money's wrong upstream. Exonerated. The three innocents stay red; only correcting the **Classifier** flips the outcome. That's causal attribution, not a guess."
4. **1:05 — The fork (20s).** Stage to **Fork** + **Re-simulate**: the **green** branch peels off the Classifier; the tail re-runs **live on Opus 4.8**; the outcome flips **red → green: APPROVE · $240 · PASS**.
5. **1:25 — Repair + the trust anchor (30s).** Stage to **Diagnose / Repair / Verify**: "Claude (effort=max) names the root cause — *'same calendar month'* instead of the real 30-day window — and rewrites the prompt." Show the red/green diff, then the **deterministic assertion** `decision==="APPROVE" && amount===240`: "Ground truth is this code assertion on the live re-run — **not a model grading itself.** RED before, GREEN after."
6. **1:55 — Institutional memory: the same mistake never ships twice (45s).** Scroll to **Memory**. "That verified fix becomes a durable lesson. Here's a *different* agent — a warranty desk — about to ship the same failure class. Its prompt says **'billing cycle'**, not 'calendar month' — different words. WorldLine matches on the **mechanism**, not text, and applies the verified fix: **$520 wrongful denial prevented**, no re-debugging." Then the **pre-ship gate**: "Every lesson becomes a CI check. This candidate reworded the bug as **'within the billing period'** — lexically nothing like the original. **BLOCKED.** The clean 30-day rule clears." Point to the **ROI** panel: "Opus-max debugs once; every prevention and gate after is near-free."
7. **2:40 — It's real, not a movie (15s).** Click **Re-run live** → badge flips to **● LIVE · opus-4.8**, the whole loop recomputes on the deployed backend. "Everything you saw just ran live."
8. **2:55 — Close (5s).** "Tracing shows what happened. WorldLine is the causal loop on top — and it makes your whole fleet stop repeating itself."

## 1-minute video outline (submission)
- 0:00–0:07 hero + one-liner.
- 0:07–0:20 Run → red FAIL worldline → the parallel probes + **4 tested · 3 innocent · 1 culprit** (decoy exonerated).
- 0:20–0:33 green fork → red→green flip → prompt diff + **assertion** ✓ verified.
- 0:33–0:50 Memory: divergent-wording prevention (**$520 caught**) + gate **BLOCKS** the reworded regression.
- 0:50–1:00 **Re-run live** badge + "8/8 tests, live URL, public repo."

## Judging narrative (what we gave the model + the self-fix moment)
- **Brief + rubric** (`brief.md`, `rubric.md`) define the problem and gradeable PASS/FAIL "done."
- **The self-fix moment IS the product:** Claude catches the bad decision (`bisect`), fixes it (`repair`), and **proves** it (`verify`) — and our build was self-graded against `rubric.md` by an independent judge.
- **Rerunnable:** `npm run prove` / `npm test` reproduce it; another team can point the loop at a new workflow tomorrow.

## Fallback (if live fails on stage)
The UI loads a **real recorded run** instantly (`GET /api/loop`) — the full demo works with **zero live calls**. "Re-run live" is the optional proof; if the network is bad, the recorded run is genuine and complete. Backup: `npm run prove` in a terminal.
