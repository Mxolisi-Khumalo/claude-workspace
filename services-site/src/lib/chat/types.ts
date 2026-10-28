/**
 * Contract between the concierge chat UI (client) and /api/chat (server).
 *
 * The server owns the conversation transcript (keyed by sessionId) so tool
 * results cannot be tampered with from the browser. The client only sends the
 * new user turn (free text or a structured action) and renders the streamed
 * events below.
 */

export type Currency = "ZAR" | "USD";

export interface ContactDetails {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  /** POPIA consent to store and process the details for this enquiry. */
  consent: true;
}

/** Structured actions emitted by interactive cards in the chat UI. */
export type ChatAction =
  | { type: "submit_contact"; contact: ContactDetails; /** Honeypot — must be empty. */ website?: string }
  | { type: "verify_email"; code: string }
  | { type: "resend_code" }
  | { type: "pick_slot"; start: string; label: string }
  | { type: "choose_currency"; currency: Currency }
  | { type: "accept_quote"; quoteId: string }
  /** Human confirmation of a side effect the assistant proposed (two-phase). */
  | { type: "confirm_action"; actionId: string }
  | { type: "cancel_action"; actionId: string }
  | { type: "quick_reply"; text: string };

export interface ChatRequest {
  sessionId: string;
  /** Free-text user message. Either `message` or `action` is required. */
  message?: string;
  action?: ChatAction;
  /** Page context, e.g. the service page the visitor opened the chat from. */
  context?: { serviceSlug?: string; path?: string; timezone?: string };
  /** The visitor acknowledged the privacy notice (POPIA s18) before chatting. */
  privacyAck?: boolean;
}

export interface QuoteLine {
  label: string;
  amount: number;
}

/** Rich cards rendered inline in the chat transcript. */
export type ChatCard =
  | {
      kind: "service_match";
      services: { slug: string; title: string; tagline: string; fromZar: number; fromUsd: number }[];
    }
  | {
      kind: "contact_form";
      reason: string;
      prefill?: Partial<Omit<ContactDetails, "consent">>;
    }
  | {
      /** Enter the 6-digit code emailed to the visitor. */
      kind: "verify_email";
      email: string;
      /** Demo mode only: the code is shown because no real email is sent. */
      demoCode?: string;
    }
  | {
      /** Two-phase side effect awaiting the visitor's explicit confirmation. */
      kind: "confirm";
      actionId: string;
      action: "book_call" | "email_quote" | "create_invoice";
      title: string;
      summary: string[];
      confirmLabel: string;
      expiresAt: string;
    }
  | { kind: "quick_replies"; options: string[] }
  | {
      kind: "quote";
      quoteId: string;
      number: string;
      currency: Currency;
      lines: QuoteLine[];
      total: number;
      depositPercent: number;
      timeline: string;
      validUntil: string;
      assumptions: string[];
      pdfUrl: string;
    }
  | {
      kind: "slots";
      timezone: string;
      slots: { start: string; end: string; label: string }[];
    }
  | {
      kind: "booking";
      bookingId: string;
      start: string;
      end: string;
      timezone: string;
      meetingUrl?: string;
      provider: string;
    }
  | {
      kind: "payment";
      url: string;
      amount: number;
      currency: Currency;
      /** What the provider actually charges, when it differs (e.g. USD quote charged in ZAR). */
      charged?: { amount: number; currency: Currency; rate: number };
      reference: string;
      provider: string;
      purpose: "deposit" | "full";
    }
  | {
      kind: "invoice";
      invoiceNumber: string;
      amount: number;
      currency: Currency;
      dueDate: string;
      pdfUrl: string;
      payUrl?: string;
    }
  | { kind: "email_sent"; to: string; subject: string }
  | { kind: "notice"; tone: "info" | "success" | "warning"; text: string };

/** Newline-delimited JSON events streamed from /api/chat. */
export type ChatStreamEvent =
  | { type: "start"; messageId: string; demo: boolean }
  | { type: "text"; delta: string }
  | { type: "tool"; name: string; label: string; status: "running" | "done" | "error" }
  | { type: "card"; card: ChatCard }
  | { type: "done"; messageId: string }
  | { type: "error"; message: string };

/** What the client keeps for rendering (the server keeps the full transcript). */
export interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  cards: ChatCard[];
  pending?: boolean;
}
