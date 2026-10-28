import "server-only";

import type { EmailMessage, EmailProvider } from "../types";
import { IntegrationConfigError, asRecord, fetchJson } from "../env";

const ENDPOINT = "https://api.resend.com/emails";
/** Resend's shared test sender; only delivers to the account owner. Set EMAIL_FROM for real use. */
const FALLBACK_FROM = "Mxolisi Khumalo <onboarding@resend.dev>";

/** Resend REST API (no SDK). Attachments are sent base64-encoded. */
export class ResendEmail implements EmailProvider {
  readonly name = "resend";

  constructor(
    private readonly apiKey: string,
    private readonly from = process.env.EMAIL_FROM || FALLBACK_FROM,
  ) {
    if (!apiKey) throw new IntegrationConfigError("RESEND_API_KEY is required for the Resend adapter.");
  }

  async send(msg: EmailMessage): Promise<{ id: string }> {
    const res = await fetchJson(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: this.from,
        to: Array.isArray(msg.to) ? msg.to : [msg.to],
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
        ...(msg.replyTo ? { reply_to: msg.replyTo } : {}),
        ...(msg.attachments?.length
          ? {
              attachments: msg.attachments.map((a) => ({
                filename: a.filename,
                content: Buffer.from(a.content).toString("base64"),
              })),
            }
          : {}),
      }),
    });
    const body = asRecord(res.body);
    if (!res.ok || body.error || typeof body.id !== "string") {
      const err = asRecord(body.error);
      throw new Error(`Resend send failed (${res.status}): ${String(err.message ?? body.message ?? "unexpected response")}`);
    }
    return { id: body.id };
  }
}
