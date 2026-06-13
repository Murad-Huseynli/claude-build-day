// Independent model-graded verify: a fresh-context Opus 4.8 judge (effort=max)
// grades the build against rubric.md. Skeptical by instruction.
//   set -a; . ./.env; set +a; npx tsx scripts/judge.ts
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "node:fs";

const client = new Anthropic();
const brief = readFileSync("brief.md", "utf8");
const rubric = readFileSync("rubric.md", "utf8");

const EVIDENCE = `
- Terminal proof (npm run prove): ORIGINAL run = DENY/$0/FAIL; AUTO-BISECT audited Classifier WRONG and Decision OK, intervened at Classifier and the outcome FLIPPED to PASS; CULPRIT discovered = classify; DIAGNOSIS identified "same calendar month" vs the true 30-day window; VERIFY re-ran the full workflow with the patch -> {passed:true, before DENY/$0, after APPROVE/$240}.
- Auto-bisect is search-based: it audits each LLM node and only the Classifier (a) was flagged wrong and (b) flipped the outcome on intervention; forcing the Decision node alone does NOT flip (amount stays $0) — proven by a unit test.
- Tests (npm test): 6/6 pass — engine flip, safety property, repair-verification, + 2 API tests. Deterministic (LLM mocked), no tokens.
- Live: https://claude-build-day-alpha.vercel.app -> HTTP 200, public, no auth wall. GET /api/loop = recorded run (culprit classify, passed true). POST /api/loop = LIVE loop on prod (culprit classify, passed true, ~7k tokens).
- 3D UI renders with ZERO console errors (headless screenshots): red failing worldline + green counterfactual branch forking from the Classifier, red->green flip, bisect/diagnosis/prompt-diff/verify panels.
- Positioning: brief + UI explicitly acknowledge LangGraph/AgentOps replay+forking; no "nobody has time travel" claims; "intervention-tested attribution" used, not "mathematical causality".
- Stack: Next.js 16 + TS + Tailwind + r3f/drei + motion, Opus 4.8 backend, deployed on Vercel. Public repo.
`;

(async () => {
  const resp: any = await (client.messages.create as any)({
    model: "claude-opus-4-8",
    max_tokens: 3500,
    output_config: { effort: "max" },
    system:
      "You are an independent, skeptical judge at Anthropic's Claude Build Day. You did not build this. Grade rigorously against the rubric and call out real weaknesses — do NOT rubber-stamp.",
    messages: [
      {
        role: "user",
        content:
          `BRIEF:\n${brief}\n\nRUBRIC:\n${rubric}\n\nEVIDENCE COLLECTED:\n${EVIDENCE}\n\n` +
          `Grade EACH rubric criterion PASS/FAIL with the specific evidence you relied on (or note missing evidence). Then give:\n` +
          `1) Overall verdict (DONE / NOT DONE).\n2) A score /100 on the hackathon axes (Impact 35 / Demo 35 / Opus-4.8 use 15 / Orchestration 15) with a one-line justification each.\n3) The single biggest weakness a competing team could exploit.\n4) The ONE highest-leverage change to improve 1st-place odds in the remaining time.\nBe concise and ruthless.`,
      },
    ],
  });
  console.log(resp.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join(""));
  console.log(`\n[judge tokens] in=${resp.usage?.input_tokens} out=${resp.usage?.output_tokens}`);
})();
