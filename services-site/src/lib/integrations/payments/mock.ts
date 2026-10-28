import "server-only";

import type { PaymentLink, PaymentLinkRequest, PaymentProvider, PaymentWebhookResult } from "../types";
import type { AppStore } from "../store/shared";
import { WebhookSignatureError, asRecord, hmacHex, safeEqual, sessionSecret, siteUrl } from "../env";

export const MOCK_SIGNATURE_HEADER = "x-mock-signature";
/** Webhook-events "provider" under which paid mock references are recorded. */
const MOCK_PAID = "mock-paid";

/** Hex HMAC-SHA256 of the raw body, keyed with SESSION_SECRET (dev-secret by default). */
export const signMockWebhook = (rawBody: string, secret = sessionSecret()) => hmacHex("sha256", secret, rawBody);

/**
 * Demo payments. Links point at the site's own /demo/checkout page, whose
 * "simulate" buttons post a signed webhook back. Paid state lives in the
 * store's webhook-events table, so it survives reloads and is shared by
 * every route.
 */
export class MockPayments implements PaymentProvider {
  readonly name = "mock";

  constructor(
    private readonly store: () => AppStore,
    private readonly secret: () => string = sessionSecret,
  ) {}

  async createPaymentLink(req: PaymentLinkRequest): Promise<PaymentLink> {
    if (!(req.amount > 0)) throw new Error("Payment amount must be positive.");
    return {
      provider: this.name,
      url: `${siteUrl()}/demo/checkout/${encodeURIComponent(req.reference)}`,
      reference: req.reference,
    };
  }

  async parseWebhook(rawBody: string, headers: Headers): Promise<PaymentWebhookResult> {
    const signature = headers.get(MOCK_SIGNATURE_HEADER) ?? "";
    if (!signature || !safeEqual(signature.toLowerCase(), signMockWebhook(rawBody, this.secret()))) {
      throw new WebhookSignatureError("mock");
    }
    const body = asRecord(JSON.parse(rawBody));
    const reference = typeof body.reference === "string" ? body.reference.slice(0, 120) : undefined;
    if (!reference) return { paid: false, raw: body };
    const paid = body.status === "success";
    if (paid) await this.markPaid(reference);
    return { paid, reference, raw: body };
  }

  async verify(reference: string) {
    return { paid: await this.isPaid(reference) };
  }

  markPaid(reference: string) {
    return this.store().recordWebhookEvent(MOCK_PAID, reference);
  }

  isPaid(reference: string) {
    return this.store().hasWebhookEvent(MOCK_PAID, reference);
  }
}
