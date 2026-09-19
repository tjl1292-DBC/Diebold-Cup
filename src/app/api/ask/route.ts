import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { TOOLS, SYSTEM_PROMPT, runTool, type ToolResult } from "@/lib/ask-tools";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = "claude-opus-5";
const MAX_TURNS = 8;

export interface Evidence {
  tool: string;
  input: unknown;
  result: ToolResult;
}

export interface AskResponse {
  answer: string;
  evidence: Evidence[];
  error?: string;
}

/**
 * Simple abuse guard: per-visitor and site-wide limits kept in memory. On
 * Vercel each server instance keeps its own counters, so treat these as a
 * ceiling on runaway cost rather than a precise quota. Tune with env vars.
 */
const PER_IP_PER_HOUR = Number(process.env.ASK_PER_IP_PER_HOUR ?? 30);
const SITE_PER_DAY = Number(process.env.ASK_SITE_PER_DAY ?? 500);
const ipHits = new Map<string, number[]>();
let dayKey = "";
let dayCount = 0;

function rateLimited(req: Request): string | null {
  const now = Date.now();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
  const recent = (ipHits.get(ip) ?? []).filter((t) => now - t < 3_600_000);
  if (recent.length >= PER_IP_PER_HOUR) return "You've asked a lot in the last hour. Try again a little later.";
  recent.push(now);
  ipHits.set(ip, recent);
  if (ipHits.size > 5000) ipHits.clear();
  const today = new Date().toISOString().slice(0, 10);
  if (today !== dayKey) {
    dayKey = today;
    dayCount = 0;
  }
  if (dayCount >= SITE_PER_DAY) return "The question box has hit its daily limit. It resets tomorrow.";
  dayCount++;
  return null;
}

export async function POST(req: Request): Promise<NextResponse<AskResponse>> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ answer: "", evidence: [], error: "The question box is not switched on yet: ANTHROPIC_API_KEY is not set on the server." }, { status: 503 });
  }
  const limited = rateLimited(req);
  if (limited) return NextResponse.json({ answer: "", evidence: [], error: limited }, { status: 429 });
  let question = "";
  let history: Anthropic.MessageParam[] = [];
  try {
    const body = (await req.json()) as { question?: string; history?: Anthropic.MessageParam[] };
    question = String(body.question ?? "").trim().slice(0, 1000);
    history = Array.isArray(body.history) ? body.history.slice(-10) : [];
  } catch {
    return NextResponse.json({ answer: "", evidence: [], error: "Bad request." }, { status: 400 });
  }
  if (!question) return NextResponse.json({ answer: "", evidence: [], error: "Ask something first." }, { status: 400 });

  const client = new Anthropic();
  const messages: Anthropic.MessageParam[] = [...history, { role: "user", content: question }];
  const evidence: Evidence[] = [];

  try {
    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 4000,
        system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        tools: TOOLS,
        messages,
      });

      if (response.stop_reason === "refusal") {
        return NextResponse.json({ answer: "I can't help with that one.", evidence });
      }
      if (response.stop_reason === "pause_turn") {
        messages.push({ role: "assistant", content: response.content });
        continue;
      }
      const toolUses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
      if (response.stop_reason !== "tool_use" || toolUses.length === 0) {
        const answer = response.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("\n").trim();
        return NextResponse.json({ answer: answer || "I couldn't find that in the record.", evidence });
      }
      messages.push({ role: "assistant", content: response.content });
      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const use of toolUses) {
        try {
          const result = await runTool(use.name, use.input);
          evidence.push({ tool: use.name, input: use.input, result });
          results.push({ type: "tool_result", tool_use_id: use.id, content: JSON.stringify(result) });
        } catch (e) {
          results.push({ type: "tool_result", tool_use_id: use.id, is_error: true, content: `Tool failed: ${(e as Error).message}` });
        }
      }
      messages.push({ role: "user", content: results });
    }
    return NextResponse.json({ answer: "That took too many steps to answer. Try a narrower question.", evidence });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return NextResponse.json({ answer: "", evidence, error: "Too many questions at once. Try again in a minute." }, { status: 429 });
    if (e instanceof Anthropic.AuthenticationError) return NextResponse.json({ answer: "", evidence, error: "The server's API key was rejected." }, { status: 503 });
    if (e instanceof Anthropic.APIError) return NextResponse.json({ answer: "", evidence, error: `The model service returned an error (${e.status}).` }, { status: 502 });
    return NextResponse.json({ answer: "", evidence, error: "Something went wrong answering that." }, { status: 500 });
  }
}
