import { createHash } from "node:crypto";
import { z } from "zod";
import type { ChatRequest, ChatStreamEvent } from "@/lib/chat/types";
import { ChatInputError, handleChat } from "@/lib/chat/server/engine";
import { rateLimit } from "@/lib/chat/server/rate-limit";

export const maxDuration = 60;

const Body = z.object({
  sessionId: z.string().regex(/^[A-Za-z0-9_-]{16,64}$/),
  message: z.string().max(4000).optional(),
  action: z
    .object({ type: z.string().max(40) })
    .passthrough()
    .optional(),
  context: z
    .object({
      serviceSlug: z.string().max(80).optional(),
      path: z.string().max(200).optional(),
      timezone: z.string().max(64).optional(),
    })
    .optional(),
  privacyAck: z.boolean().optional(),
});

function clientKey(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  return createHash("sha256").update(`${ip}:${process.env.SESSION_SECRET ?? "dev-secret"}`).digest("hex").slice(0, 32);
}

function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

/**
 * Streams the concierge's reply as newline-delimited JSON (ChatStreamEvent).
 * The browser sends only the new turn; the transcript lives server-side.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "Forbidden" }, { status: 403 });

  const limit = rateLimit(`chat:${clientKey(req)}`, 20, 10 * 60 * 1000);
  if (!limit.ok) {
    return Response.json(
      { error: "You're sending messages quickly — please wait a moment." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  // Action fields are coerced and validated per action type in the engine.
  const body = parsed.data as unknown as ChatRequest;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (e: ChatStreamEvent) => controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      try {
        await handleChat(body, emit);
      } catch (err) {
        const message = err instanceof ChatInputError ? err.message : "Something went wrong. Please try again.";
        if (!(err instanceof ChatInputError)) console.error("[chat] request failed", err);
        emit({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
