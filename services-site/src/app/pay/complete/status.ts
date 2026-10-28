import "server-only";

import { rateLimit } from "@/lib/chat/server/rate-limit";
import { fulfilPayment } from "@/lib/concierge/actions";
import { documentUrl, verifyDocumentToken } from "@/lib/documents";
import { getStore } from "@/lib/integrations";
import type { InvoiceRecord } from "@/lib/integrations/types";

const REF = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * What the return page may show. `invoice` (details, payment link), `pdfUrl`
 * and `emailHint` are only present when the URL carries the invoice's
 * document token: invoice numbers are sequential, so without it the page
 * confirms the status and nothing else.
 */
export type PaymentStatus =
  | { state: "paid"; invoice?: InvoiceRecord; pdfUrl?: string; emailHint?: string }
  | { state: "pending"; invoice?: InvoiceRecord }
  | { state: "void" }
  | { state: "missing" | "busy" | "error" };

function maskEmail(email?: string) {
  if (!email) return undefined;
  const [user, domain] = email.split("@");
  return domain ? `${user.slice(0, 1)}•••@${domain}` : undefined;
}

function tokenValid(invoiceId: string, token: string | undefined) {
  if (!token) return false;
  try {
    return verifyDocumentToken("invoice", invoiceId, token);
  } catch {
    return false;
  }
}

/** `clientKey` is a hashed client IP for the rate limit. */
export async function paymentStatus(ref: string | undefined, token: string | undefined, clientKey: string): Promise<PaymentStatus> {
  if (!ref || !REF.test(ref)) return { state: "missing" };
  if (!rateLimit(`pay-complete:${clientKey}`, 30, 10 * 60 * 1000).ok) return { state: "busy" };

  let invoice: InvoiceRecord | null;
  try {
    // Safe to call from a public page: it re-verifies with the provider and is idempotent.
    invoice = await fulfilPayment(ref);
  } catch (err) {
    console.error("[pay] status check failed", err);
    return { state: "error" };
  }
  if (!invoice) return { state: "missing" };
  if (invoice.status === "void") return { state: "void" };
  const owner = tokenValid(invoice.id, token);
  if (invoice.status !== "paid") return owner ? { state: "pending", invoice } : { state: "pending" };
  if (!owner) return { state: "paid" };

  const lead = await getStore().getLead(invoice.leadId);
  return {
    state: "paid",
    invoice,
    pdfUrl: documentUrl("invoice", invoice.id),
    emailHint: maskEmail(lead?.contact?.email),
  };
}
