import { createHmac, timingSafeEqual } from "node:crypto";
import { getStore } from "@/lib/integrations";

interface CalWebhook {
  triggerEvent?: string;
  createdAt?: string;
  payload?: {
    uid?: string;
    bookingId?: string | number;
    rescheduleUid?: string;
    startTime?: string;
    endTime?: string;
    metadata?: { videoCallUrl?: string };
  };
}

function signatureValid(rawBody: string, secret: string, signature: string | null) {
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest();
  const given = Buffer.from(signature.trim(), "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Cal.com webhook: keeps stored bookings in sync when a call is cancelled or
 * rescheduled outside the chat (from Cal.com's emails or dashboard).
 * Verifies `X-Cal-Signature-256` = hex HMAC-SHA256(raw body, CALCOM_WEBHOOK_SECRET).
 */
export async function POST(req: Request) {
  const secret = process.env.CALCOM_WEBHOOK_SECRET;
  if (!secret) return new Response("Not found", { status: 404 });

  const raw = await req.text();
  if (!signatureValid(raw, secret, req.headers.get("x-cal-signature-256"))) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: CalWebhook;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const trigger = body.triggerEvent;
  const p = body.payload ?? {};
  if (trigger !== "BOOKING_CANCELLED" && trigger !== "BOOKING_RESCHEDULED") {
    return Response.json({ received: true, outcome: "ignored" });
  }

  try {
    const store = getStore();
    // Claimed only after the update is saved, so a failed attempt is retried in full.
    // Re-applying a delivery that did succeed is harmless: the update is idempotent.
    const claim = () =>
      store.recordWebhookEvent("calcom", `${trigger}:${p.uid ?? ""}:${p.rescheduleUid ?? ""}:${body.createdAt ?? ""}`);

    // A reschedule creates a new Cal.com booking; the original uid arrives as `rescheduleUid`.
    const ids = [...new Set([p.uid, p.rescheduleUid, p.bookingId].filter((v) => v !== undefined && v !== "").map(String))];
    const booking = (await Promise.all(ids.map((id) => store.getBookingByProviderId(id)))).find((b) => b !== null);
    if (!booking) return Response.json({ received: true, outcome: (await claim()) ? "unmatched" : "duplicate" });

    await store.saveBooking(
      trigger === "BOOKING_CANCELLED"
        ? { ...booking, status: "cancelled" }
        : {
            ...booking,
            status: "rescheduled",
            providerBookingId: p.uid ?? booking.providerBookingId,
            start: p.startTime ?? booking.start,
            end: p.endTime ?? booking.end,
            meetingUrl: p.metadata?.videoCallUrl ?? booking.meetingUrl,
          },
    );
    return Response.json({ received: true, outcome: (await claim()) ? "processed" : "duplicate" });
  } catch (err) {
    console.error("[webhooks] calcom processing failed", err);
    return Response.json({ error: "Processing failed" }, { status: 500 });
  }
}
