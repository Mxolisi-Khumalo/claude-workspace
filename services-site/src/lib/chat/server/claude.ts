import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import type { ChatStreamEvent } from "@/lib/chat/types";
import type { ConversationRecord } from "@/lib/integrations/types";
import { SYSTEM_PROMPT } from "./system-prompt";
import { TOOL_LABELS, TOOLS, isToolName, runTool } from "./tools";

type Emit = (e: ChatStreamEvent) => void;
type MessageParam = Anthropic.Beta.BetaMessageParam;
type ContentBlock = Anthropic.Beta.BetaContentBlock;

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5-5";
const EFFORT = (process.env.CHAT_EFFORT ?? "low") as "low" | "medium" | "high";
/** Cost cap per model call; adaptive thinking counts toward it. */
const MAX_TOKENS = 8000;
/** Max model calls per visitor turn (tool loop iterations). */
const MAX_STEPS = 6;
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic());

export const claudeConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

/**
 * After a mid-stream server-side fallback, tool_use blocks emitted before the
 * last `fallback` boundary belong to the declined attempt and never ran;
 * drop them so we don't execute them or owe them tool results. Everything
 * else is echoed back verbatim (append-only history for preserved thinking).
 */
function sanitizeAssistantContent(content: ContentBlock[]): ContentBlock[] {
  const lastFallback = content.map((b) => b.type).lastIndexOf("fallback");
  if (lastFallback === -1) return content;
  return content.filter((b, i) => !(i < lastFallback && b.type === "tool_use"));
}

/**
 * A mid-conversation system message must be followed by an assistant turn (or
 * be last). When a turn ends without a stored model reply (refusal, error,
 * truncation) we append the canned reply we showed, keeping the transcript
 * valid for the next request.
 */
export function closeTurn(conv: ConversationRecord, text: string, emit?: Emit) {
  const messages = conv.messages as MessageParam[];
  const last = messages[messages.length - 1];
  if (emit) emit({ type: "text", delta: text });
  if (last && last.role !== "assistant") messages.push({ role: "assistant", content: text });
}

/** The SDK's error for a streamed tool input that isn't valid JSON (the only failure worth re-issuing). */
const isToolInputParseError = (err: unknown) =>
  err instanceof Anthropic.AnthropicError &&
  !(err instanceof Anthropic.APIError) &&
  err.message.startsWith("Unable to parse tool parameter JSON");

/** Canned close when the model ends a step with no visible output (an empty end_turn after tool results). */
function emptyReplyText(lastTools: string[]) {
  if (lastTools.some((t) => t.startsWith("propose_"))) return "\n\nPlease confirm in the card above when you're ready.";
  if (lastTools.includes("request_contact_details")) return "\n\nPlease fill in the form above and I'll take it from there.";
  return "\n\nWhat would you like to do next?";
}

export interface ClaudeTurnInput {
  conv: ConversationRecord;
  /** New user turn content (already appended by the caller is NOT expected). */
  userContent: string;
  /** Trusted per-turn application context (date, visitor state, app events). */
  appContext: string;
  timezone: string;
  emit: Emit;
}

/**
 * Runs one visitor turn through Claude with a manual streaming tool loop.
 * Mutates `conv.messages` append-only and accumulates usage on `conv.usage`.
 */
export async function runClaudeTurn({ conv, userContent, appContext, timezone, emit }: ClaudeTurnInput): Promise<void> {
  const messages = conv.messages as MessageParam[];
  messages.push({ role: "user", content: userContent });
  messages.push({ role: "system", content: appContext });

  const usage = (conv.usage ??= { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 });
  let jsonRetries = 0;
  /** Text already streamed this turn: later steps start a new paragraph. */
  let textSent = false;
  let lastTools: string[] = [];

  for (let step = 0; step < MAX_STEPS; step++) {
    const stream = getClient().beta.messages.stream({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      output_config: { effort: EFFORT },
      cache_control: { type: "ephemeral" },
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages,
    });

    let stepHasText = false;
    stream.on("text", (delta) => {
      if (!delta) return;
      if (!stepHasText && textSent) emit({ type: "text", delta: "\n\n" });
      stepHasText = textSent = true;
      emit({ type: "text", delta });
    });
    stream.on("streamEvent", (event) => {
      if (event.type === "content_block_start" && event.content_block.type === "tool_use") {
        const name = event.content_block.name;
        emit({ type: "tool", name, label: isToolName(name) ? TOOL_LABELS[name] : "Working", status: "running" });
      }
    });

    let message: Anthropic.Beta.BetaMessage;
    try {
      message = await stream.finalMessage();
      jsonRetries = 0;
    } catch (err) {
      // With eager input streaming a tool input can arrive as unparseable
      // JSON; only that case is retried. Everything else propagates.
      if (!isToolInputParseError(err) || jsonRetries++ >= 2) throw err;
      console.warn("[chat] unparseable tool input, re-issuing turn");
      step--;
      continue;
    }

    usage.input += message.usage.input_tokens;
    usage.output += message.usage.output_tokens;
    usage.cacheRead += message.usage.cache_read_input_tokens ?? 0;
    usage.cacheWrite += message.usage.cache_creation_input_tokens ?? 0;

    if (message.stop_reason === "refusal") {
      // Partial output from a declined request is discarded, not stored.
      closeTurn(
        conv,
        "\n\nI can't help with that here. I'm happy to talk about your software project, though — or you can reach Mxolisi directly.",
        emit,
      );
      return;
    }

    const content = sanitizeAssistantContent(message.content);
    const toolUses = content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");

    if (toolUses.length > 0 && message.stop_reason === "max_tokens") {
      // A truncated tool input can still parse; never run it.
      closeTurn(conv, "\n\nSorry — that got cut off. Could you say that again in a shorter way?", emit);
      return;
    }

    // An empty reply (typically end_turn right after "End your turn now") would
    // be rejected by the API on every later request once it isn't last.
    if (toolUses.length === 0 && !content.some((b) => b.type === "text" && b.text.trim())) {
      closeTurn(conv, emptyReplyText(lastTools), emit);
      return;
    }

    messages.push({ role: "assistant", content });
    if (toolUses.length === 0) return;

    // Run tool calls one at a time: several of them read-modify-write the
    // same lead record. All results go back in one user message.
    const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
    for (const tool of toolUses) {
      const result = await runTool(tool.name, tool.input, { sessionId: conv.sessionId, timezone });
      const label = isToolName(tool.name) ? TOOL_LABELS[tool.name] : "Working";
      emit({ type: "tool", name: tool.name, label, status: result.isError ? "error" : "done" });
      for (const card of result.cards) emit({ type: "card", card });
      results.push({
        type: "tool_result",
        tool_use_id: tool.id,
        content: result.text,
        ...(result.isError ? { is_error: true } : {}),
      });
    }
    lastTools = toolUses.map((t) => t.name);
    messages.push({ role: "user", content: results });
  }

  // Step budget exhausted mid-loop.
  closeTurn(conv, "\n\nLet me pause there — what would you like to do next?", emit);
}

export { MODEL as CHAT_MODEL };
