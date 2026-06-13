import { NextResponse } from "next/server";
import { RECORDED } from "@/lib/worldline/recorded";
import { runFullLoop } from "@/lib/worldline/loop";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** Instant, reliable demo default — a real captured run. */
export async function GET() {
  return NextResponse.json({ source: "recorded", ...RECORDED });
}

/** Re-run the whole loop LIVE on Opus 4.8 (proves it's not an animation). */
export async function POST() {
  try {
    const result = await runFullLoop();
    return NextResponse.json({ source: "live", ...result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
