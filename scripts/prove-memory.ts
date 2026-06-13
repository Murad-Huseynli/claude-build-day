// Proves recurrence prevention: a different agent about to ship the same failure
// class is caught from memory and repaired with the verified fix — no re-debugging.
//   set -a; . ./.env; set +a; npx tsx scripts/prove-memory.ts
import { runPrevention, SEED_LESSONS } from "../lib/worldline/knowledge";

(async () => {
  const r = await runPrevention(SEED_LESSONS);
  console.log("NEW AGENT:", r.agent);
  console.log(`  would ship: ${r.failed.decision} · $${r.failed.amount}  (wrong)`);
  console.log("MEMORY MATCH:");
  console.log(`  lesson: ${r.match.lesson?.id} — ${r.match.lesson?.title}`);
  console.log(`  confidence: ${r.match.confidence}`);
  console.log(`  rationale: ${r.match.rationale}`);
  console.log("PREVENTION (verified fix applied from memory):");
  console.log(`  ${JSON.stringify(r.prevented)}`);
  console.log(`  tokens in/out: ${r.usage.input}/${r.usage.output}`);
  const ok = r.failed.decision === "DENY" && r.match.lesson?.id === "WL-001" && r.prevented?.pass === true;
  console.log("\n" + (ok ? "✅ RECURRENCE PREVENTED: new agent matched WL-001 → verified fix → PASS, no re-debug" : "❌ prevention assertion failed"));
  process.exit(ok ? 0 : 1);
})().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
