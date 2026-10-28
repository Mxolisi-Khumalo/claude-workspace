/**
 * Document rendering + signed document links.
 *
 * STUB — the integrations build step implements these.
 */
import type { InvoiceRecord, Lead, QuoteRecord } from "@/lib/integrations/types";
import type { EmailMessage } from "@/lib/integrations/types";

export async function renderQuotePdf(_quote: QuoteRecord, _lead: Lead): Promise<Uint8Array> {
  throw new Error("renderQuotePdf not implemented");
}

export async function renderInvoicePdf(_invoice: InvoiceRecord, _lead: Lead): Promise<Uint8Array> {
  throw new Error("renderInvoicePdf not implemented");
}

/** Absolute URL to a PDF, carrying an HMAC token so ids cannot be enumerated. */
export function documentUrl(_kind: "quote" | "invoice", _id: string): string {
  throw new Error("documentUrl not implemented");
}

export function verifyDocumentToken(_kind: "quote" | "invoice", _id: string, _token: string): boolean {
  throw new Error("verifyDocumentToken not implemented");
}

type Email = Omit<EmailMessage, "to" | "attachments">;

export function quoteEmailToClient(_quote: QuoteRecord, _lead: Lead, _pdfUrl: string): Email {
  throw new Error("not implemented");
}
export function invoiceEmailToClient(_invoice: InvoiceRecord, _lead: Lead, _pdfUrl: string): Email {
  throw new Error("not implemented");
}
export function bookingEmailToClient(_b: { start: string; end: string; timezone: string; meetingUrl?: string }, _lead: Lead): Email {
  throw new Error("not implemented");
}
/** 6-digit verification code email (fixed template; no free text). */
export function verificationEmail(_code: string, _lead: Lead): Email {
  throw new Error("not implemented");
}
/** Receipt after a verified payment. */
export function receiptEmailToClient(_invoice: InvoiceRecord, _lead: Lead, _pdfUrl: string): Email {
  throw new Error("not implemented");
}
/** Notification to the developer for any lead event. */
export function ownerNotificationEmail(_event: string, _lead: Lead, _details: Record<string, string>): Email {
  throw new Error("not implemented");
}
