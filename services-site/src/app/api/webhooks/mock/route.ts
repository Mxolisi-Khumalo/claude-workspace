import { processMockEvent } from "../payments";

/**
 * Demo-mode payment webhook. Body `{reference, status: "success" | "failed"}`,
 * header `x-mock-signature` = hex HMAC-SHA256(raw body, SESSION_SECRET).
 * 404 unless the mock payment provider is active.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  try {
    const result = await processMockEvent(raw, req.headers);
    if (result.status !== 200) return Response.json({ error: "Rejected" }, { status: result.status });
    return Response.json({ received: true, outcome: result.outcome });
  } catch (err) {
    console.error("[webhooks] mock processing failed", err);
    return Response.json({ error: "Processing failed" }, { status: 500 });
  }
}
