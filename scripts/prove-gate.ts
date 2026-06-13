// Proves the pre-ship gate: a candidate change is checked against every lesson in
// parallel and blocked if it would reintroduce a known failure.
//   set -a; . ./.env; set +a; npx tsx scripts/prove-gate.ts
import { gateCandidate, CANDIDATES, SEED_LESSONS } from "../lib/worldline/knowledge";

(async () => {
  for (const c of CANDIDATES) {
    const r = await gateCandidate(c, SEED_LESSONS);
    console.log(`\nCANDIDATE: ${c.agent} · ${c.label}`);
    console.log(`  GATE: ${r.gate}${r.blockedBy.length ? "  blocked by " + r.blockedBy.join(", ") : ""}`);
    for (const ch of r.checks.filter((x) => x.risk !== "none")) console.log(`   - ${ch.lessonId} (${ch.failureClass}): ${ch.risk} — ${ch.why}`);
  }
  // assert: the regressing candidate is blocked by WL-001, the clean one passes
  const bad = await gateCandidate(CANDIDATES[0], SEED_LESSONS);
  const good = await gateCandidate(CANDIDATES[1], SEED_LESSONS);
  const ok = bad.gate === "BLOCK" && bad.blockedBy.includes("WL-001") && good.gate === "PASS";
  console.log("\n" + (ok ? "✅ GATE PROVEN: regression blocked by WL-001, clean change passes" : "❌ gate assertion failed"));
  process.exit(ok ? 0 : 1);
})().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
