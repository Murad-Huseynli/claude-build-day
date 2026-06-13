// Thin Anthropic helper: structured JSON via output_config.format with a
// robust fallback + loose parse. Server-side only (reads ANTHROPIC_API_KEY).
import Anthropic from "@anthropic-ai/sdk";
import type { Usage } from "./types";

const client = new Anthropic();
export const MODEL = "claude-opus-4-8";
export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

export async function callJSON(opts: {
  system: string;
  user: string;
  schema: Record<string, unknown>;
  effort?: Effort;
  maxTokens?: number;
}): Promise<{ data: any; usage: Usage }> {
  const base = {
    model: MODEL,
    max_tokens: opts.maxTokens ?? 1024,
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
  };
  try {
    const resp: any = await (client.messages.create as any)({
      ...base,
      output_config: {
        format: { type: "json_schema", schema: opts.schema },
        effort: opts.effort ?? "low",
      },
    });
    return extract(resp);
  } catch {
    // Fallback: no output_config; instruct strict JSON in the prompt.
    const resp: any = await (client.messages.create as any)({
      ...base,
      system:
        opts.system +
        "\n\nRespond with ONLY a single valid JSON object matching this JSON schema (no prose, no markdown):\n" +
        JSON.stringify(opts.schema),
    });
    return extract(resp);
  }
}

function extract(resp: any): { data: any; usage: Usage } {
  const text: string = (resp.content || [])
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("");
  return {
    data: parseLoose(text),
    usage: {
      input: resp.usage?.input_tokens ?? 0,
      output: resp.usage?.output_tokens ?? 0,
    },
  };
}

function parseLoose(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    /* fall through */
  }
  const m = text.match(/\{[\s\S]*\}/);
  if (m) {
    try {
      return JSON.parse(m[0]);
    } catch {
      /* fall through */
    }
  }
  throw new Error("Could not parse JSON from model: " + text.slice(0, 300));
}
