import "server-only";

import type { PaymentLink, PaymentLinkRequest, PaymentProvider, PaymentWebhookResult } from "../types";
import { IntegrationConfigError, WebhookSignatureError, asRecord, fetchJson, hmacHex, safeEqual } from "../env";

const BASE_URL = "https://api.paystack.co";
export const PAYSTACK_SIGNATURE_HEADER = "x-paystack-signature";

const toMinor = (major: number) => Math.round(major * 100);
const toMajor = (minor: unknown) => (typeof minor === "number" ? minor / 100 : undefined);

/** Reads USD_ZAR_RATE (rand per US dollar). */
export function usdZarRate(): number {
  const rate = Number(process.env.USD_ZAR_RATE);
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new IntegrationConfigError(
      "USD_ZAR_RATE must be set (rand per US dollar, e.g. 18.25) to charge USD quotes through Paystack, which settles in ZAR only.",
    );
  }
  return rate;
}

/**
 * Paystack (South Africa). Hosted checkout via /transaction/initialize,
 * server-side confirmation via /transaction/verify, and HMAC-SHA512 webhooks
 * keyed with the secret key. ZA accounts settle ZAR only, so USD requests
 * are converted at USD_ZAR_RATE and reported back as `charged`.
 */
export class PaystackPayments implements PaymentProvider {
  readonly name = "paystack";

  constructor(private readonly secretKey: string) {
    if (!secretKey) throw new IntegrationConfigError("PAYSTACK_SECRET_KEY is required for the Paystack adapter.");
  }

  private request(path: string, init: RequestInit = {}) {
    return fetchJson(`${BASE_URL}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${this.secretKey}`, "Content-Type": "application/json", ...init.headers },
    });
  }

  async createPaymentLink(req: PaymentLinkRequest): Promise<PaymentLink> {
    if (!(req.amount > 0)) throw new Error("Payment amount must be positive.");
    let amount = req.amount;
    let charged: PaymentLink["charged"];
    if (req.currency === "USD") {
      const rate = usdZarRate();
      amount = Math.round(req.amount * rate);
      charged = { amount, currency: "ZAR", rate };
    } else if (req.currency !== "ZAR") {
      throw new Error(`Paystack cannot charge ${req.currency as string}.`);
    }

    const res = await this.request("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({
        email: req.email,
        amount: toMinor(amount),
        currency: "ZAR",
        reference: req.reference,
        callback_url: req.callbackUrl,
        metadata: {
          ...req.metadata,
          description: req.description,
          ...(req.name ? { customer_name: req.name } : {}),
          ...(charged ? { quoted_amount: String(req.amount), quoted_currency: req.currency, fx_rate: String(charged.rate) } : {}),
        },
      }),
    });
    const body = asRecord(res.body);
    const data = asRecord(body.data);
    if (!res.ok || body.status !== true || typeof data.authorization_url !== "string") {
      throw new Error(`Paystack initialize failed (${res.status}): ${String(body.message ?? "unexpected response")}`);
    }
    return {
      provider: this.name,
      url: data.authorization_url,
      reference: typeof data.reference === "string" ? data.reference : req.reference,
      charged,
    };
  }

  async verify(reference: string): Promise<{ paid: boolean; amount?: number; currency?: string }> {
    const res = await this.request(`/transaction/verify/${encodeURIComponent(reference)}`);
    const body = asRecord(res.body);
    // 400/404: Paystack has no such transaction (yet) — not paid, not an outage.
    if (res.status === 400 || res.status === 404) return { paid: false };
    if (!res.ok || body.status !== true) {
      throw new Error(`Paystack verify failed (${res.status}): ${String(body.message ?? "unexpected response")}`);
    }
    const data = asRecord(body.data);
    return {
      paid: data.status === "success",
      amount: toMajor(data.amount),
      currency: typeof data.currency === "string" ? data.currency : undefined,
    };
  }

  async parseWebhook(rawBody: string, headers: Headers): Promise<PaymentWebhookResult> {
    const signature = headers.get(PAYSTACK_SIGNATURE_HEADER) ?? "";
    if (!signature || !safeEqual(signature.toLowerCase(), hmacHex("sha512", this.secretKey, rawBody))) {
      throw new WebhookSignatureError("Paystack");
    }
    const event = asRecord(JSON.parse(rawBody));
    const data = asRecord(event.data);
    const reference = typeof data.reference === "string" ? data.reference : undefined;
    const currency = typeof data.currency === "string" ? data.currency : undefined;
    if (event.event === "charge.success") {
      return { paid: true, reference, amount: toMajor(data.amount), currency, raw: event };
    }
    return { paid: false, reference, raw: event };
  }
}
