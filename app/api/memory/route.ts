import { NextResponse } from "next/server";
import { RECORDED_LESSONS, RECORDED_PREVENTION } from "@/lib/worldline/recorded-memory";
import { runPrevention } from "@/lib/worldline/knowledge";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** Instant default: accumulated lessons + a real recorded recurrence-prevention run. */
export async function GET() {
  return NextResponse.json({ source: "recorded", lessons: RECORDED_LESSONS, prevention: RECORDED_PREVENTION });
}

/** Live: a new agent is checked against memory and repaired from the verified lesson. */
export async function POST() {
  try {
    const prevention = await runPrevention(RECORDED_LESSONS);
    return NextResponse.json({ source: "live", lessons: RECORDED_LESSONS, prevention });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
