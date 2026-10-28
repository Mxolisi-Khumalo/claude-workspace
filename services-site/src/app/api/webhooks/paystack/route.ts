import type { PaymentWebhookResult } from "@/lib/integrations/types";
import { handlePaymentEvent, parsePaymentWebhook, webhookProvider } from "../payments";

/** Paystack event id (`charge.success:<transaction id>`), falling back to reference + outcome. */
function eventId(event: PaymentWebhookResult) {
  const raw = (event.raw ?? {}) as { event?: unknown; data?: { id?: unknown } };
  const id = raw.data?.id;
  if (typeof raw.event === "string" && (typeof id === "string" || typeof id === "number")) return `${raw.event}:${id}`;
  return `${event.reference ?? "unknown"}:${event.paid ? "success" : "other"}`;
}

/**
 * Paystack webhook. The adapter verifies `x-paystack-signature` (HMAC-SHA512
 * of the raw body, keyed with the secret key); paid events are re-verified
 * server-to-server inside `fulfilPayment` before the invoice is marked paid.
 * 404 unless a Paystack key is configured (and demo mode is off).
 */
export async function POST(req: Request) {
  const provider = webhookProvider("paystack");
  if (!provider) return new Response("Not found", { status: 404 });

  const raw = await req.text();
  const parsed = await parsePaymentWebhook(provider, raw, req.headers);
  if (!parsed.ok) return Response.json({ error: "Rejected" }, { status: parsed.status });
  const { event } = parsed;

  try {
    const outcome = await handlePaymentEvent("paystack", eventId(event), event.reference, event.paid);
    return Response.json({ received: true, outcome });
  } catch (err) {
    // A non-2xx makes Paystack retry; the retry re-attempts fulfilment while the invoice is still open.
    console.error("[webhooks] paystack processing failed", err);
    return Response.json({ error: "Processing failed" }, { status: 500 });
  }
}
