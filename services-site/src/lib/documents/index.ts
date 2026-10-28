import "server-only";

import { createHmac } from "node:crypto";
import type { Currency } from "@/lib/chat/types";
import { safeEqual, sessionSecret, siteUrl } from "@/lib/integrations/env";
import { totalsFor } from "./shared";

/**
 * Document rendering (quote/invoice PDFs), signed document links and the
 * transactional email templates.
 */

export { renderInvoicePdf, renderQuotePdf } from "./pdf";
export {
  bookingEmailToClient,
  escapeHtml,
  invoiceEmailToClient,
  ownerNotificationEmail,
  quoteEmailToClient,
  receiptEmailToClient,
  verificationEmail,
  type Email,
} from "./emails";

/** HMAC token for a document link (also carried on the payment return URL so it can offer the PDF). */
export const documentToken = (kind: "quote" | "invoice", id: string) =>
  createHmac("sha256", sessionSecret()).update(`${kind}:${id}`, "utf8").digest("base64url").slice(0, 32);

/** Absolute URL to a PDF, carrying an HMAC token so ids cannot be enumerated. */
export function documentUrl(kind: "quote" | "invoice", id: string): string {
  return `${siteUrl()}/api/documents/${kind}/${encodeURIComponent(id)}?token=${documentToken(kind, id)}`;
}

/** Constant-time check of the `token` query parameter from documentUrl. */
export function verifyDocumentToken(kind: "quote" | "invoice", id: string, token: string): boolean {
  if (typeof token !== "string" || !token) return false;
  return safeEqual(token, documentToken(kind, id));
}

/**
 * What the client pays for a record total (records are ex VAT): adds 15% VAT
 * on ZAR once VAT_REGISTERED=true, exactly as the PDFs and emails show it.
 */
export const amountDue = (total: number, currency: Currency) => totalsFor([], total, currency).total;
