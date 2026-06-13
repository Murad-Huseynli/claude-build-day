import { NextResponse } from "next/server";
import { RECORDED_LESSONS, RECORDED_PREVENTION, RECORDED_GATE } from "@/lib/worldline/recorded-memory";
import { runPrevention, gateCandidate, CANDIDATES } from "@/lib/worldline/knowledge";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** Instant default: lessons + a recorded recurrence-prevention run + a recorded pre-ship gate. */
export async function GET() {
  return NextResponse.json({ source: "recorded", lessons: RECORDED_LESSONS, prevention: RECORDED_PREVENTION, gate: RECORDED_GATE });
}

/** Live: re-run prevention + the pre-ship gate (parallel checks across every lesson). */
export async function POST() {
  try {
    const [prevention, gate] = await Promise.all([
      runPrevention(RECORDED_LESSONS),
      Promise.all(CANDIDATES.map((c) => gateCandidate(c, RECORDED_LESSONS))),
    ]);
    return NextResponse.json({ source: "live", lessons: RECORDED_LESSONS, prevention, gate });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
