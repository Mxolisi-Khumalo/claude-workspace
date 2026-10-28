/**
 * Turns stored Anthropic message params into a readable transcript: visible
 * text plus tool names. Thinking blocks and tool results are skipped; the
 * engine's injected `[app context]` / `[app event]` text (a `system` message
 * right after each visitor turn) is kept separately as that turn's context.
 */

export interface TranscriptEntry {
  role: "user" | "assistant";
  text: string;
  context: string;
  tools: string[];
}

type Block = { type?: unknown; text?: unknown; name?: unknown };

const isContext = (text: string) => /^\[app (context|event)\]/.test(text.trimStart());

export function toTranscript(messages: unknown[]): TranscriptEntry[] {
  const entries: TranscriptEntry[] = [];
  for (const raw of messages) {
    if (!raw || typeof raw !== "object") continue;
    const { role, content } = raw as { role?: unknown; content?: unknown };
    const blocks: Block[] = typeof content === "string" ? [{ type: "text", text: content }] : Array.isArray(content) ? content : [];

    if (role === "system") {
      const text = blocks
        .filter((b) => b && b.type === "text" && typeof b.text === "string")
        .map((b) => String(b.text).trim())
        .join("\n\n");
      if (!text) continue;
      const prev = entries.at(-1);
      if (prev?.role === "user") prev.context = [prev.context, text].filter(Boolean).join("\n\n");
      else entries.push({ role: "user", text: "", context: text, tools: [] });
      continue;
    }
    if (role !== "user" && role !== "assistant") continue;

    const text: string[] = [];
    const context: string[] = [];
    const tools: string[] = [];

    for (const block of blocks) {
      if (!block || typeof block !== "object") continue;
      if (block.type === "text" && typeof block.text === "string") {
        (isContext(block.text) ? context : text).push(block.text.trim());
      } else if ((block.type === "tool_use" || block.type === "server_tool_use") && typeof block.name === "string") {
        tools.push(block.name);
      }
    }

    if (text.length === 0 && context.length === 0 && tools.length === 0) continue;
    entries.push({ role, text: text.join("\n\n"), context: context.join("\n\n"), tools });
  }
  return entries;
}
