# Rubric — Claude grades the build against this (PASS/FAIL + evidence per item)

> "Done" = every Functionality + Verifiable item PASSES. Re-grade after each iteration.
> Make each item checkable by the model without a human (a command, a URL, a file).

## Functionality
- [ ] Core happy-path works end-to-end on the LIVE URL
- [ ] <feature 1>
- [ ] <feature 2>

## Verifiable "done" (the Orchestration score lives here)
- [ ] Test suite passes — command: `<e.g. npm test>`
- [ ] Live URL returns 200 — `<url + path>`
- [ ] <domain check the model can run, e.g. "POST /x returns the expected shape">

## Opus 4.8 use (15%)
- [ ] Uses <capability> in a non-trivial way: <how>

## Demo path (35%)
- [ ] 60-second happy path is scripted and reproducible
- [ ] Known-good fallback recorded in case live fails

## Not disqualified
- [ ] Not on the prohibited-projects list
- [ ] Repo public; only today's work; contributions clearly identifiable
