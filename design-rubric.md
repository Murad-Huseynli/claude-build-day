# WorldLine — Design Rubric (visual "done", graded from screenshots)

Graded by **vision** critics (Opus 4.8 reading the PNGs + external `codex exec -i`) against fresh screenshots at **desktop (1512px)** and **mobile (390px)**, for the landing/narrative and each simulator stage. A criterion PASSES only if a senior product-design team would ship it. Done = **all PASS on both critics + human taste sign-off.**

## D1 — No broken layout (hard gate)
- No overlapping or colliding text anywhere — **especially the 3D node labels**.
- No clipped/overflowing text; long labels wrap or resize cleanly.
- Consistent alignment to a grid; nothing visually "floating" or misplaced.

## D2 — Typographic system
- Deliberate hierarchy: display / headline / body / mono, with intentional scale, weight, tracking.
- Distinctive, not templated; tight tracking on display; readable measure on body.

## D3 — Narrative journey (not a bare landing + button)
- The page tells the use-case story in sequenced sections: **hook → the problem → the failing run → the loop (auto-bisect → fork → red→green flip → diagnose → repair → verify) → "existing tools vs WorldLine" → proof (live) → CTA/footer.**
- The interactive simulator is **integrated into the story** with guiding copy at each step — not a lone button to a bare animation.

## D4 — 3D & motion quality
- Nodes look **intentional and refined** (not default low-poly blobs): cohesive material, depth, considered glow/lighting.
- Motion is purposeful and smooth (entrances, transitions, the fork/flip); respects `prefers-reduced-motion`; no jank or pop-in.
- Camera framing is composed; the worldline reads clearly at a glance.

## D5 — Production polish (anti-AI-slop)
- Spacing rhythm, alignment, and color discipline. **No** purple gradients, decorative blobs, cards-inside-cards, oversized vague hero copy, or generic stock atmospheres.
- Real hover / active / focus states on every control.
- Feels like a funded startup's product site, not a generated template.

## D6 — Responsive
- Deliberate at 1512 and 390; no overflow; controls, labels, and the canvas adapt (don't just shrink).

## D7 — Coherent brand
- Consistent palette + voice; one memorable signature detail that makes it unmistakably WorldLine.

## D8 — Motion fidelity (judged from FILMSTRIPS + frame-time telemetry, not stills)
- Entrances and transitions use deliberate easing; **no abrupt pop-in** (judged across the frame sequence in `/tmp/wl/*filmstrip*`).
- The fork and the red→green flip read as a **smooth, staged reveal**, not an instant swap.
- During transitions: avg frame-time ≤ ~20ms (≈50fps+), **near-zero jank frames** (>50ms), per `report.json`. Respects `prefers-reduced-motion`.

## D9 — Interaction states
- Every control has visible **hover / active / focus-visible** states (captured before/after).
- Scroll-driven reveals (if used) trigger smoothly; the 3D responds to drag without breaking or freezing.

## D10 — Stability & performance (hard gate)
- **Zero console errors.** CLS < 0.05. No long tasks that freeze interaction.
- The **deterministic text-overlap report is EMPTY at every captured state** (this is how D1 is enforced objectively — `report.json.overlaps`).

## Grade format
For each D#: `PASS | FAIL` + the specific evidence (frame filenames and/or `report.json` fields) + the concrete fix if FAIL. List fixes in priority order.
**Hard gates (auto-FAIL):** any non-empty `overlaps` report (D1/D10), any console error (D10), or visible pop-in across a filmstrip (D8). Done = all D# PASS on both the Opus and codex critics **and** all hard gates clear **and** your taste sign-off.
