import Anthropic from "@anthropic-ai/sdk";
import { TOOLS, SYSTEM_PROMPT, runTool, type ToolResult } from "@/lib/ask-tools";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = "claude-opus-5";
const MAX_TURNS = 6;

export interface Evidence {
  tool: string;
  input: unknown;
  result: ToolResult;
}

/**
 * The response is a stream of newline-delimited JSON events:
 *   {type:"status", text}            what is being looked up
 *   {type:"evidence", tool, input, result}
 *   {type:"reset"}                    discard any text shown so far (a new turn began)
 *   {type:"text", delta}             a piece of the answer
 *   {type:"done"} | {type:"error", message}
 */

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

/** The key can be stored as ANTHROPIC_API_KEY or, as it was entered in the Vercel dashboard, DieboldGPT. */
function apiKey(): string | undefined {
  return process.env.ANTHROPIC_API_KEY || process.env.DieboldGPT || process.env.DIEBOLDGPT || undefined;
}

const TOOL_STATUS: Record<string, string> = {
  search_players: "Looking that name up on the sheets…",
  player_record: "Pulling every match they played…",
  season_results: "Unfolding that year's scoresheets…",
  all_time_standings: "Counting the engravings on the cup…",
  club_record: "Going through the club's seasons…",
  leaderboard: "Ranking everybody, fairly, across eras…",
};

function ndjson(obj: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(obj) + "\n");
}

function errorResponse(message: string, status: number): Response {
  return new Response(JSON.stringify({ type: "error", message }) + "\n", { status, headers: { "content-type": "application/x-ndjson; charset=utf-8" } });
}

export async function POST(req: Request): Promise<Response> {
  const key = apiKey();
  if (!key) return errorResponse("The question box is not switched on yet: no API key is set on the server.", 503);
  const limited = rateLimited(req);
  if (limited) return errorResponse(limited, 429);

  let question = "";
  let history: Anthropic.MessageParam[] = [];
  try {
    const body = (await req.json()) as { question?: string; history?: Anthropic.MessageParam[] };
    question = String(body.question ?? "").trim().slice(0, 1000);
    history = Array.isArray(body.history) ? body.history.slice(-6) : [];
  } catch {
    return errorResponse("Bad request.", 400);
  }
  if (!question) return errorResponse("Ask something first.", 400);

  const client = new Anthropic({ apiKey: key });
  const messages: Anthropic.MessageParam[] = [...history, { role: "user", content: question }];

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(ndjson(obj));
      try {
        for (let turn = 0; turn < MAX_TURNS; turn++) {
          const s = client.messages.stream({
            model: MODEL,
            max_tokens: 1500,
            output_config: { effort: "low" },
            system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
            tools: TOOLS,
            messages,
          });
          let sentText = false;
          s.on("text", (delta) => {
            sentText = true;
            send({ type: "text", delta });
          });
          const response = await s.finalMessage();

          if (response.stop_reason === "refusal") {
            if (sentText) send({ type: "reset" });
            send({ type: "text", delta: "I can't help with that one." });
            break;
          }
          if (response.stop_reason === "pause_turn") {
            messages.push({ role: "assistant", content: response.content });
            continue;
          }
          const toolUses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
          if (response.stop_reason !== "tool_use" || toolUses.length === 0) {
            if (!sentText) send({ type: "text", delta: "I couldn't find that in the record." });
            break;
          }
          // A new turn is starting: anything shown so far was preamble.
          if (sentText) send({ type: "reset" });
          messages.push({ role: "assistant", content: response.content });
          const results: Anthropic.ToolResultBlockParam[] = [];
          for (const use of toolUses) {
            send({ type: "status", text: TOOL_STATUS[use.name] ?? "Checking the record…" });
            try {
              const result = await runTool(use.name, use.input);
              send({ type: "evidence", tool: use.name, input: use.input, result });
              results.push({ type: "tool_result", tool_use_id: use.id, content: JSON.stringify(result) });
            } catch (e) {
              results.push({ type: "tool_result", tool_use_id: use.id, is_error: true, content: `Tool failed: ${(e as Error).message}` });
            }
          }
          messages.push({ role: "user", content: results });
          if (turn === MAX_TURNS - 1) send({ type: "text", delta: "That took too many steps to answer. Try a narrower question." });
        }
        send({ type: "done" });
      } catch (e) {
        if (e instanceof Anthropic.RateLimitError) send({ type: "error", message: "Too many questions at once. Try again in a minute." });
        else if (e instanceof Anthropic.AuthenticationError) send({ type: "error", message: "The server's API key was rejected." });
        else if (e instanceof Anthropic.APIError) {
          console.error("ask: API error", e.status, e.message);
          send({ type: "error", message: `The model service returned an error (${e.status}).` });
        } else {
          console.error("ask: failed", e);
          send({ type: "error", message: "Something went wrong answering that." });
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } });
}
