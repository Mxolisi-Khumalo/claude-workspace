/**
 * Provider-agnostic interfaces for everything the concierge can "do".
 * Each has a real adapter (selected by env vars) and a mock adapter used in
 * demo mode, so the whole site works locally with zero configuration.
 */
import type { ContactDetails, Currency, QuoteLine } from "@/lib/chat/types";

/* ------------------------------------------------------------------ */
/* Records                                                             */
/* ------------------------------------------------------------------ */

export type LeadStatus = "new" | "quoted" | "booked" | "invoiced" | "paid" | "won" | "lost";

export interface Lead {
  id: string;
  createdAt: string;
  updatedAt: string;
  sessionId: string;
  contact?: ContactDetails;
  /** Set once the visitor proves they own the email (6-digit code). */
  emailVerifiedAt?: string;
  /** SHA-256 of the pending verification code + salt; cleared on success. */
  verification?: { codeHash: string; expiresAt: string; attempts: number; sentCount: number; windowStart: string };
  /** Free-form summary of what the client needs, maintained by the assistant. */
  summary?: string;
  serviceSlugs: string[];
  budget?: string;
  timeline?: string;
  status: LeadStatus;
  source: "chat";
}

export interface QuoteRecord {
  id: string;
  /** Human-friendly sequential number, e.g. Q-2026-0007. */
  number: string;
  leadId: string;
  createdAt: string;
  validUntil: string;
  currency: Currency;
  lines: QuoteLine[];
  total: number;
  depositPercent: number;
  timeline: string;
  assumptions: string[];
  serviceSlugs: string[];
  status: "draft" | "sent" | "accepted" | "expired";
}

export interface InvoiceRecord {
  id: string;
  /** Sequential, e.g. INV-2026-0003. */
  number: string;
  leadId: string;
  quoteId?: string;
  createdAt: string;
  dueDate: string;
  currency: Currency;
  lines: QuoteLine[];
  total: number;
  purpose: "deposit" | "full";
  status: "open" | "paid" | "void";
  payment?: {
    provider: string;
    reference: string;
    url: string;
    charged?: { amount: number; currency: Currency; rate: number };
  };
  paidAt?: string;
}

export interface BookingRecord {
  id: string;
  leadId: string;
  provider: string;
  providerBookingId?: string;
  start: string;
  end: string;
  timezone: string;
  meetingUrl?: string;
  status: "confirmed" | "cancelled" | "rescheduled";
}

/** Server-side conversation transcript (Anthropic message params, stored as JSON). */
export interface ConversationRecord {
  sessionId: string;
  leadId?: string;
  createdAt: string;
  updatedAt: string;
  /** Exact Anthropic message params, append-only (never edited — preserved thinking). */
  messages: unknown[];
  /** Simple abuse guard counters. */
  turns: number;
  privacyAckAt?: string;
  /** Token usage totals for cost monitoring. */
  usage?: { input: number; output: number; cacheRead: number; cacheWrite: number };
  /** App events awaiting delivery to the model with the next turn. */
  pendingEvents?: string[];
  /** Demo engine state machine position. */
  demoState?: Record<string, unknown>;
}

/** A side effect proposed by the assistant, executed only after the visitor confirms. */
export interface PendingAction {
  id: string;
  sessionId: string;
  leadId: string;
  type: "book_call" | "email_quote" | "create_invoice";
  payload: Record<string, string>;
  status: "proposed" | "executed" | "cancelled" | "expired" | "failed";
  createdAt: string;
  expiresAt: string;
  executedAt?: string;
  result?: string;
}

/** Outbound email captured by the mock provider for the /demo/outbox page. */
export interface OutboxEntry {
  id: string;
  createdAt: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
  attachments: string[];
}

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

export interface Store {
  readonly kind: string;
  getConversation(sessionId: string): Promise<ConversationRecord | null>;
  saveConversation(conv: ConversationRecord): Promise<void>;
  listConversations(limit?: number): Promise<ConversationRecord[]>;

  upsertLead(lead: Lead): Promise<Lead>;
  getLead(id: string): Promise<Lead | null>;
  getLeadBySession(sessionId: string): Promise<Lead | null>;
  listLeads(limit?: number): Promise<Lead[]>;

  saveQuote(q: QuoteRecord): Promise<QuoteRecord>;
  getQuote(id: string): Promise<QuoteRecord | null>;
  listQuotes(leadId?: string): Promise<QuoteRecord[]>;

  saveInvoice(i: InvoiceRecord): Promise<InvoiceRecord>;
  getInvoice(id: string): Promise<InvoiceRecord | null>;
  getInvoiceByReference(reference: string): Promise<InvoiceRecord | null>;
  listInvoices(leadId?: string): Promise<InvoiceRecord[]>;

  saveBooking(b: BookingRecord): Promise<BookingRecord>;
  listBookings(leadId?: string): Promise<BookingRecord[]>;

  savePendingAction(a: PendingAction): Promise<PendingAction>;
  getPendingAction(id: string): Promise<PendingAction | null>;

  /** Mock-email outbox (demo mode) for the /demo/outbox page. */
  saveOutboxEntry(e: OutboxEntry): Promise<void>;
  listOutbox(limit?: number): Promise<OutboxEntry[]>;

  /** Idempotency for webhooks: returns false if (provider, eventId) was already recorded. */
  recordWebhookEvent(provider: string, eventId: string): Promise<boolean>;

  /** Atomically increments and returns a named counter (used for document numbers). */
  nextSequence(name: "quote" | "invoice"): Promise<number>;
}

/* ------------------------------------------------------------------ */
/* Payments                                                            */
/* ------------------------------------------------------------------ */

export interface PaymentLinkRequest {
  /** Amount in major units (rand / dollars). */
  amount: number;
  currency: Currency;
  email: string;
  name?: string;
  reference: string;
  description: string;
  callbackUrl: string;
  metadata?: Record<string, string>;
}

export interface PaymentLink {
  provider: string;
  url: string;
  reference: string;
  /** Set when the provider settles in a different currency than quoted (Paystack ZA is ZAR-only). */
  charged?: { amount: number; currency: Currency; rate: number };
}

export interface PaymentWebhookResult {
  /** True when the signature verified and the event is a successful charge. */
  paid: boolean;
  reference?: string;
  amount?: number;
  currency?: string;
  raw?: unknown;
}

export interface PaymentProvider {
  readonly name: string;
  createPaymentLink(req: PaymentLinkRequest): Promise<PaymentLink>;
  /** Verify a webhook's authenticity (signature) and normalise it. Throws on bad signature. */
  parseWebhook(rawBody: string, headers: Headers): Promise<PaymentWebhookResult>;
  /** Server-side confirmation of a transaction by reference (used before marking paid). */
  verify(reference: string): Promise<{ paid: boolean; amount?: number; currency?: string }>;
}

/* ------------------------------------------------------------------ */
/* Calendar                                                            */
/* ------------------------------------------------------------------ */

export interface Slot {
  start: string; // ISO
  end: string; // ISO
}

export interface BookingRequest {
  start: string;
  name: string;
  email: string;
  timezone: string;
  notes?: string;
}

export interface CalendarProvider {
  readonly name: string;
  getAvailableSlots(fromIso: string, toIso: string, timezone: string): Promise<Slot[]>;
  book(req: BookingRequest): Promise<{ providerBookingId: string; start: string; end: string; meetingUrl?: string }>;
}

/* ------------------------------------------------------------------ */
/* Email                                                               */
/* ------------------------------------------------------------------ */

export interface EmailAttachment {
  filename: string;
  content: Uint8Array;
  contentType?: string;
}

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
}

export interface EmailProvider {
  readonly name: string;
  send(msg: EmailMessage): Promise<{ id: string }>;
}
