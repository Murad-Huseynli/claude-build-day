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

## Grade format
For each D#: `PASS | FAIL` + the specific screenshot evidence + the concrete fix if FAIL. List fixes in priority order. Do not pass D1 if any text overlaps.
