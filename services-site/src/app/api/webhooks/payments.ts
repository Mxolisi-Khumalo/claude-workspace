import "server-only";

import { fulfilPayment } from "@/lib/concierge/actions";
import { IntegrationConfigError, WebhookSignatureError, getPaymentProvider, getStore } from "@/lib/integrations";
import type { PaymentProvider, PaymentWebhookResult } from "@/lib/integrations/types";

/**
 * Shared payment-webhook plumbing: signature parsing, one-time event claims
 * and fulfilment. Used by the provider routes and by the demo checkout's
 * server action, so a simulated payment runs exactly the webhook path.
 */

export type WebhookOutcome = "processed" | "duplicate" | "ignored";

/** The named adapter when it can receive webhooks right now, else null (route answers 404). */
export function webhookProvider(name: string): PaymentProvider | null {
  try {
    return getPaymentProvider(name) ?? null;
  } catch (err) {
    if (err instanceof IntegrationConfigError) return null;
    throw err;
  }
}

export type ParsedWebhook =
  | { ok: true; event: PaymentWebhookResult }
  | { ok: false; status: 400 | 401 };

/** Runs the adapter's signature check + normalisation: 401 on a bad signature, 400 on a malformed body. */
export async function parsePaymentWebhook(provider: PaymentProvider, rawBody: string, headers: Headers): Promise<ParsedWebhook> {
  try {
    return { ok: true, event: await provider.parseWebhook(rawBody, headers) };
  } catch (err) {
    return { ok: false, status: err instanceof WebhookSignatureError ? 401 : 400 };
  }
}

/**
 * Claims (provider, eventId) and fulfils a paid reference. A repeat delivery
 * for an invoice that is still open retries fulfilment (the first attempt
 * failed); `fulfilPayment` re-verifies with the provider and is idempotent.
 */
export async function handlePaymentEvent(
  provider: string,
  eventId: string,
  reference: string | undefined,
  paid: boolean,
): Promise<WebhookOutcome> {
  const store = getStore();
  const fresh = await store.recordWebhookEvent(provider, eventId);
  if (!paid || !reference) return fresh ? "ignored" : "duplicate";
  if (!fresh) {
    const invoice = await store.getInvoiceByReference(reference);
    if (!invoice || invoice.status !== "open") return "duplicate";
  }
  await fulfilPayment(reference);
  return "processed";
}

/* ------------------------------------------------------------------ */
/* Mock payments (demo mode)                                           */
/* ------------------------------------------------------------------ */

export const mockPaymentsActive = () => webhookProvider("mock") !== null;

export interface MockEventResult {
  status: 200 | 400 | 401 | 404;
  outcome?: WebhookOutcome;
  paid?: boolean;
}

/**
 * Verifies and applies a signed mock event `{reference, status}`. The mock
 * adapter's parseWebhook checks `x-mock-signature` and records the paid
 * reference that its verify() later confirms. 404 unless the mock is active.
 */
export async function processMockEvent(rawBody: string, headers: Headers): Promise<MockEventResult> {
  const provider = webhookProvider("mock");
  if (!provider) return { status: 404 };
  const parsed = await parsePaymentWebhook(provider, rawBody, headers);
  if (!parsed.ok) return { status: parsed.status };
  const { reference, paid } = parsed.event;
  if (!reference) return { status: 400 };

  const outcome = await handlePaymentEvent("mock", `${reference}:${paid ? "success" : "failed"}`, reference, paid);
  return { status: 200, outcome, paid };
}
