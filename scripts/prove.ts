// Terminal proof of the WorldLine loop. Run:
//   set -a; . ./.env; set +a; npx tsx scripts/prove.ts
import { runFullLoop } from "../lib/worldline/loop";

(async () => {
  const r = await runFullLoop();

  console.log("══════════════════════════════════════════════════════════════");
  console.log("ORIGINAL RUN (default/buggy classifier prompt)");
  console.log("══════════════════════════════════════════════════════════════");
  for (const x of r.base.records) {
    console.log(`  ${x.name.padEnd(18)} ${JSON.stringify(x.output)}${x.live ? "  [live]" : ""}`);
  }
  console.log(`  → OUTCOME: ${r.base.outcome.decision} $${r.base.outcome.amount} → ${r.base.outcome.pass ? "PASS" : "FAIL"}`);

  console.log("\n══════════════════════════════════════════════════════════════");
  console.log("AUTO-BISECT (intervention-tested attribution)");
  console.log("══════════════════════════════════════════════════════════════");
  for (const e of r.bisect.evidence) {
    const verdict = e.correct ? "audited OK" : "audited WRONG";
    const test = e.intervened ? ` → intervened → ${e.flipped ? "FLIPPED outcome ✅" : "no flip"}` : "";
    console.log(`  ${e.name.padEnd(12)} ${verdict}${test}`);
    if (e.reason) console.log(`               ↳ ${e.reason}`);
  }
  console.log(`  → CULPRIT: ${r.bisect.culpritName} (${r.bisect.culpritId})`);

  console.log("\n══════════════════════════════════════════════════════════════");
  console.log("DIAGNOSIS + REPAIR (Claude, effort=max)");
  console.log("══════════════════════════════════════════════════════════════");
  console.log("  root cause : " + r.repair.rootCause);
  console.log("  rationale  : " + r.repair.rationale);
  console.log("  patched prompt (head):\n    " + r.repair.patchedPrompt.replace(/\n/g, "\n    ").slice(0, 280) + " …");

  console.log("\n══════════════════════════════════════════════════════════════");
  console.log("VERIFY (re-run full workflow with the patch)");
  console.log("══════════════════════════════════════════════════════════════");
  console.log("  eval: " + JSON.stringify(r.verify.eval));

  console.log(`\n  TOKENS: in=${r.usage.input} out=${r.usage.output}`);

  const ok =
    r.base.outcome.pass === false &&
    r.bisect.culpritId === "classify" &&
    r.verify.eval.passed === true;
  console.log(
    "\n" +
      (ok
        ? "✅ LOOP PROVEN:  FAIL → culprit=Classifier → repair authored → verified PASS"
        : "❌ LOOP ASSERTION FAILED"),
  );
  process.exit(ok ? 0 : 1);
})().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
