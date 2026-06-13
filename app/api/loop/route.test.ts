import { describe, it, expect, vi } from "vitest";

// Mock the live loop so the API test never hits the network.
vi.mock("@/lib/worldline/loop", () => ({
  runFullLoop: vi.fn(async () => ({ marker: "live-run", verify: { eval: { passed: true } } })),
}));

import { GET, POST } from "@/app/api/loop/route";

describe("/api/loop", () => {
  it("GET returns the recorded loop with the golden culprit + passing verify", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.source).toBe("recorded");
    expect(json.bisect.culpritId).toBe("classify");
    expect(json.verify.eval.passed).toBe(true);
  });

  it("POST runs the live loop and returns it", async () => {
    const res = await POST();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.source).toBe("live");
    expect(json.marker).toBe("live-run");
  });
});
