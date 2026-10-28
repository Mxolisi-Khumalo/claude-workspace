import "server-only";

import { getService, services } from "@/content";
import type { ChatCard, ContactDetails, Currency } from "@/lib/chat/types";
import { createHash, randomInt } from "node:crypto";
import {
  bookingEmailToClient,
  documentUrl,
  invoiceEmailToClient,
  ownerNotificationEmail,
  quoteEmailToClient,
  receiptEmailToClient,
  renderInvoicePdf,
  renderQuotePdf,
  verificationEmail,
} from "@/lib/documents";
import { getCalendar, getEmail, getPayments, getStore, isMockEmail } from "@/lib/integrations";
import type { InvoiceRecord, Lead, PendingAction, QuoteRecord } from "@/lib/integrations/types";
import { formatMoney, priceQuote, type QuoteInput } from "./pricing";

/**
 * Business actions shared by the Claude tool loop and the scripted demo
 * engine. Every action is scoped to the visitor's own session/lead, and every
 * amount comes from stored records — never from model or browser input.
 */

export interface ActionResult {
  /** Plain-text result fed back to the model (or used by the demo engine). */
  text: string;
  cards: ChatCard[];
}

export class ActionError extends Error {}

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;
const CODE_TTL = 10 * MINUTE;
const CODE_MAX_ATTEMPTS = 5;
const CODES_PER_HOUR = 3;
const ACTION_TTL = 15 * MINUTE;
const QUOTE_VALID_DAYS = 14;
const INVOICE_DUE_DAYS = 7;
export const DEFAULT_TIMEZONE = process.env.OWNER_TIMEZONE ?? "Africa/Johannesburg";

const id = (prefix: string) => `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
const now = () => new Date().toISOString();
const year = () => new Date().getFullYear();

async function sendSafely(label: string, fn: () => Promise<unknown>): Promise<string | null> {
  try {
    await fn();
    return null;
  } catch (err) {
    console.error(`[concierge] ${label} failed`, err);
    return `${label} could not be sent right now`;
  }
}

async function notifyOwner(event: string, lead: Lead, details: Record<string, string>) {
  const to = process.env.OWNER_EMAIL;
  if (!to) return;
  await sendSafely("Owner notification", () =>
    getEmail().send({ to, ...ownerNotificationEmail(event, lead, details), replyTo: lead.contact?.email }),
  );
}

/* ------------------------------------------------------------------ */
/* Leads                                                               */
/* ------------------------------------------------------------------ */

export async function ensureLead(sessionId: string): Promise<Lead> {
  const store = getStore();
  const existing = await store.getLeadBySession(sessionId);
  if (existing) return existing;
  const ts = now();
  return store.upsertLead({
    id: id("lead"),
    createdAt: ts,
    updatedAt: ts,
    sessionId,
    serviceSlugs: [],
    status: "new",
    source: "chat",
  });
}

function requireVerified(lead: Lead): asserts lead is Lead & { contact: ContactDetails } {
  if (!lead.contact?.email) {
    throw new ActionError(
      "No contact details on file yet. Call request_contact_details first and wait for the visitor to submit the form.",
    );
  }
  if (!lead.emailVerifiedAt) {
    throw new ActionError(
      "The visitor's email is not verified yet. Ask them to enter the 6-digit code from the verification card.",
    );
  }
}

const hashCode = (code: string, leadId: string) =>
  createHash("sha256").update(`${code}:${leadId}:${process.env.SESSION_SECRET ?? "dev-secret"}`).digest("hex");

async function sendVerificationCode(lead: Lead & { contact: ContactDetails }): Promise<ActionResult> {
  const ts = Date.now();
  const v = lead.verification;
  const windowFresh = v && ts - new Date(v.windowStart).getTime() < 60 * MINUTE;
  const sentCount = windowFresh ? v.sentCount : 0;
  if (sentCount >= CODES_PER_HOUR) {
    throw new ActionError("Too many verification codes requested. Please try again in an hour.");
  }
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const updated = await getStore().upsertLead({
    ...lead,
    verification: {
      codeHash: hashCode(code, lead.id),
      expiresAt: new Date(ts + CODE_TTL).toISOString(),
      attempts: 0,
      sentCount: sentCount + 1,
      windowStart: windowFresh ? v.windowStart : new Date(ts).toISOString(),
    },
    updatedAt: now(),
  });
  const problem = await sendSafely("Verification email", () =>
    getEmail().send({ to: lead.contact.email, ...verificationEmail(code, updated) }),
  );
  if (problem) throw new ActionError(problem);
  return {
    text: `A 6-digit verification code was emailed to ${lead.contact.email}.`,
    cards: [{ kind: "verify_email", email: lead.contact.email, demoCode: isMockEmail() ? code : undefined }],
  };
}

/** Contact form submitted by the visitor (never by the model). Sends a verification code. */
export async function submitContact(sessionId: string, contact: ContactDetails): Promise<ActionResult> {
  const lead = await ensureLead(sessionId);
  const sameEmail = lead.contact?.email?.toLowerCase() === contact.email.toLowerCase();
  const updated = await getStore().upsertLead({
    ...lead,
    contact,
    emailVerifiedAt: sameEmail ? lead.emailVerifiedAt : undefined,
    updatedAt: now(),
  });
  if (updated.emailVerifiedAt) {
    return { text: `Contact details updated for ${contact.name}; email already verified.`, cards: [] };
  }
  return sendVerificationCode(updated as Lead & { contact: ContactDetails });
}

export async function resendVerification(sessionId: string): Promise<ActionResult> {
  const lead = await ensureLead(sessionId);
  if (!lead.contact) throw new ActionError("Please fill in your contact details first.");
  if (lead.emailVerifiedAt) return { text: "Email already verified.", cards: [] };
  return sendVerificationCode(lead as Lead & { contact: ContactDetails });
}

export async function verifyEmail(sessionId: string, code: string): Promise<ActionResult> {
  const lead = await ensureLead(sessionId);
  if (!lead.contact) throw new ActionError("Please fill in your contact details first.");
  if (lead.emailVerifiedAt) return { text: "Email already verified.", cards: [] };
  const v = lead.verification;
  if (!v || new Date(v.expiresAt).getTime() < Date.now()) {
    throw new ActionError("That code has expired. Request a new one.");
  }
  if (v.attempts >= CODE_MAX_ATTEMPTS) throw new ActionError("Too many attempts. Request a new code.");
  const store = getStore();
  if (hashCode(code.trim(), lead.id) !== v.codeHash) {
    await store.upsertLead({ ...lead, verification: { ...v, attempts: v.attempts + 1 }, updatedAt: now() });
    throw new ActionError("That code doesn't match. Check the email and try again.");
  }
  const verified = await store.upsertLead({
    ...lead,
    emailVerifiedAt: now(),
    verification: undefined,
    updatedAt: now(),
  });
  await notifyOwner("New verified lead", verified, {
    Name: verified.contact?.name ?? "",
    Company: verified.contact?.company ?? "-",
    Summary: verified.summary ?? "(not captured yet)",
    Services: verified.serviceSlugs.join(", ") || "(none yet)",
  });
  return {
    text: `Email ${verified.contact?.email} verified.`,
    cards: [{ kind: "notice", tone: "success", text: "Email verified — thanks!" }],
  };
}

export async function updateBrief(
  sessionId: string,
  brief: { summary: string; serviceSlugs: string[]; budget?: string; timeline?: string },
): Promise<ActionResult> {
  const lead = await ensureLead(sessionId);
  const valid = brief.serviceSlugs.filter((s) => getService(s));
  await getStore().upsertLead({
    ...lead,
    summary: brief.summary.slice(0, 2000),
    serviceSlugs: valid,
    budget: brief.budget?.slice(0, 200) ?? lead.budget,
    timeline: brief.timeline?.slice(0, 200) ?? lead.timeline,
    updatedAt: now(),
  });
  return { text: "Brief saved to the lead record.", cards: [] };
}

export function recommendServices(slugs: string[]): ActionResult {
  const matched = slugs.map((s) => getService(s)).filter((s) => s !== undefined);
  if (matched.length === 0) {
    return { text: `No matching services. Valid slugs: ${services.map((s) => s.slug).join(", ")}`, cards: [] };
  }
  return {
    text: `Showing ${matched.length} service card(s) to the visitor.`,
    cards: [
      {
        kind: "service_match",
        services: matched.map((s) => ({
          slug: s.slug,
          title: s.title,
          tagline: s.tagline,
          fromZar: Math.min(...s.packages.map((p) => p.priceFromZar)),
          fromUsd: Math.min(...s.packages.map((p) => p.priceFromUsd)),
        })),
      },
    ],
  };
}

export function requestContact(reason: string, lead: Lead): ActionResult {
  if (lead.contact && lead.emailVerifiedAt) {
    return {
      text: `Contact details already on file and verified (${lead.contact.name}, ${lead.contact.email}). No form needed.`,
      cards: [],
    };
  }
  if (lead.contact) {
    return {
      text: "Contact details are on file but the email is not verified yet. The verification card is still in the chat; ask the visitor to enter the code (they can request a new one).",
      cards: [{ kind: "verify_email", email: lead.contact.email }],
    };
  }
  return {
    text: "A contact form is now showing in the chat. End your turn and wait for the visitor to submit it.",
    cards: [{ kind: "contact_form", reason: reason.slice(0, 200) }],
  };
}

/* ------------------------------------------------------------------ */
/* Quotes                                                              */
/* ------------------------------------------------------------------ */

function quoteCard(q: QuoteRecord): ChatCard {
  return {
    kind: "quote",
    quoteId: q.id,
    number: q.number,
    currency: q.currency,
    lines: q.lines,
    total: q.total,
    depositPercent: q.depositPercent,
    timeline: q.timeline,
    validUntil: q.validUntil,
    assumptions: q.assumptions,
    pdfUrl: documentUrl("quote", q.id),
  };
}

export async function createQuote(sessionId: string, input: QuoteInput): Promise<ActionResult> {
  const priced = priceQuote(input);
  const store = getStore();
  const lead = await ensureLead(sessionId);
  const seq = await store.nextSequence("quote");
  const quote = await store.saveQuote({
    id: id("quote"),
    number: `Q-${year()}-${String(seq).padStart(4, "0")}`,
    leadId: lead.id,
    createdAt: now(),
    validUntil: new Date(Date.now() + QUOTE_VALID_DAYS * DAY).toISOString(),
    status: "draft",
    ...priced,
  });
  await store.upsertLead({
    ...lead,
    status: lead.status === "new" ? "quoted" : lead.status,
    serviceSlugs: [...new Set([...lead.serviceSlugs, ...priced.serviceSlugs])],
    updatedAt: now(),
  });
  return {
    text: `Quote ${quote.number} created (id ${quote.id}): total ${formatMoney(quote.total, quote.currency)}, ${quote.depositPercent}% deposit, timeline ${quote.timeline}. The visitor can see it as a card with line items and a PDF link.`,
    cards: [quoteCard(quote)],
  };
}

async function ownedQuote(lead: Lead, quoteId: string): Promise<QuoteRecord> {
  const quote = await getStore().getQuote(quoteId);
  if (!quote || quote.leadId !== lead.id) throw new ActionError(`Quote ${quoteId} not found for this visitor.`);
  return quote;
}

async function emailQuote(sessionId: string, quoteId: string): Promise<ActionResult> {
  const lead = await ensureLead(sessionId);
  requireVerified(lead);
  const quote = await ownedQuote(lead, quoteId);
  const pdfUrl = documentUrl("quote", quote.id);
  const pdf = await renderQuotePdf(quote, lead);
  const problem = await sendSafely("Quote email", () =>
    getEmail().send({
      to: lead.contact.email,
      ...quoteEmailToClient(quote, lead, pdfUrl),
      replyTo: process.env.OWNER_EMAIL,
      attachments: [{ filename: `${quote.number}.pdf`, content: pdf, contentType: "application/pdf" }],
    }),
  );
  if (problem) throw new ActionError(problem);
  await getStore().saveQuote({ ...quote, status: "sent" });
  await notifyOwner("Quote sent", lead, { Quote: quote.number, Total: formatMoney(quote.total, quote.currency) });
  const subject = quoteEmailToClient(quote, lead, pdfUrl).subject;
  return {
    text: `Quote ${quote.number} emailed to ${lead.contact.email} with the PDF attached.`,
    cards: [{ kind: "email_sent", to: lead.contact.email, subject }],
  };
}

/* ------------------------------------------------------------------ */
/* Scheduling                                                          */
/* ------------------------------------------------------------------ */

export async function listSlots(timezone: string, days = 7): Promise<ActionResult> {
  const tz = isValidTimeZone(timezone) ? timezone : DEFAULT_TIMEZONE;
  const from = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const to = new Date(from.getTime() + Math.min(Math.max(days, 1), 14) * DAY);
  const slots = (await getCalendar().getAvailableSlots(from.toISOString(), to.toISOString(), tz)).slice(0, 12);
  if (slots.length === 0) {
    return { text: "No open slots in that window. Offer to have the developer reply by email instead.", cards: [] };
  }
  const fmt = new Intl.DateTimeFormat("en-ZA", {
    timeZone: tz,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const withLabels = slots.map((s) => ({ ...s, label: fmt.format(new Date(s.start)) }));
  return {
    text: `Showing ${withLabels.length} open 30-minute slots (${tz}). Ask the visitor to pick one; they will reply with the slot's ISO start time.`,
    cards: [{ kind: "slots", timezone: tz, slots: withLabels }],
  };
}

async function bookCall(sessionId: string, start: string, timezone: string, notes?: string): Promise<ActionResult> {
  const lead = await ensureLead(sessionId);
  requireVerified(lead);
  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime()) || startDate.getTime() < Date.now()) {
    throw new ActionError("That start time is invalid or in the past. Offer fresh slots with get_available_slots.");
  }
  const tz = isValidTimeZone(timezone) ? timezone : DEFAULT_TIMEZONE;
  const calendar = getCalendar();
  const booked = await calendar.book({
    start: startDate.toISOString(),
    name: lead.contact.name,
    email: lead.contact.email,
    timezone: tz,
    notes: [lead.summary, notes].filter(Boolean).join("\n\n").slice(0, 1500),
  });
  const store = getStore();
  const booking = await store.saveBooking({
    id: id("booking"),
    leadId: lead.id,
    provider: calendar.name,
    providerBookingId: booked.providerBookingId,
    start: booked.start,
    end: booked.end,
    timezone: tz,
    meetingUrl: booked.meetingUrl,
    status: "confirmed",
  });
  await store.upsertLead({ ...lead, status: lead.status === "paid" ? lead.status : "booked", updatedAt: now() });
  const problem = await sendSafely("Booking confirmation", () =>
    getEmail().send({ to: lead.contact.email, ...bookingEmailToClient(booking, lead), replyTo: process.env.OWNER_EMAIL }),
  );
  await notifyOwner("Discovery call booked", lead, { When: `${booking.start} (${tz})`, Meeting: booking.meetingUrl ?? "-" });
  return {
    text: `Booked: ${booking.start} to ${booking.end} (${tz}).${booking.meetingUrl ? ` Meeting link: ${booking.meetingUrl}.` : ""}${problem ? ` Note: ${problem}.` : " A confirmation email was sent."}`,
    cards: [
      {
        kind: "booking",
        bookingId: booking.id,
        start: booking.start,
        end: booking.end,
        timezone: tz,
        meetingUrl: booking.meetingUrl,
        provider: calendar.name,
      },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Invoices & payments                                                 */
/* ------------------------------------------------------------------ */

async function createInvoice(
  sessionId: string,
  quoteId: string,
  purpose: "deposit" | "full",
): Promise<ActionResult> {
  const lead = await ensureLead(sessionId);
  requireVerified(lead);
  const quote = await ownedQuote(lead, quoteId);
  if (new Date(quote.validUntil).getTime() < Date.now()) {
    throw new ActionError(`Quote ${quote.number} has expired. Create a fresh quote first.`);
  }

  const store = getStore();
  const existing = (await store.listInvoices(lead.id)).find(
    (i) => i.quoteId === quote.id && i.purpose === purpose && i.status !== "void",
  );
  if (existing) return invoiceResult(existing, lead, "An invoice for this already exists; showing it again.");

  const amount = purpose === "full" ? quote.total : Math.round((quote.total * quote.depositPercent) / 100);
  const seq = await store.nextSequence("invoice");
  const number = `INV-${year()}-${String(seq).padStart(4, "0")}`;
  const lines =
    purpose === "full"
      ? quote.lines
      : [{ label: `${quote.depositPercent}% deposit against quote ${quote.number}`, amount }];

  let invoice: InvoiceRecord = {
    id: id("inv"),
    number,
    leadId: lead.id,
    quoteId: quote.id,
    createdAt: now(),
    dueDate: new Date(Date.now() + INVOICE_DUE_DAYS * DAY).toISOString(),
    currency: quote.currency,
    lines,
    total: amount,
    purpose,
    status: "open",
  };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const payments = getPayments();
  const link = await payments.createPaymentLink({
    amount,
    currency: quote.currency,
    email: lead.contact.email,
    name: lead.contact.name,
    reference: number,
    description: `${number} — ${purpose === "deposit" ? "deposit" : "payment"} for quote ${quote.number}`,
    callbackUrl: `${siteUrl}/pay/complete?ref=${encodeURIComponent(number)}`,
    metadata: { invoiceId: invoice.id, leadId: lead.id, quoteId: quote.id },
  });
  invoice = await store.saveInvoice({
    ...invoice,
    payment: { provider: link.provider, reference: link.reference, url: link.url, charged: link.charged },
  });
  await store.saveQuote({ ...quote, status: "accepted" });
  await store.upsertLead({ ...lead, status: "invoiced", updatedAt: now() });

  const pdfUrl = documentUrl("invoice", invoice.id);
  const pdf = await renderInvoicePdf(invoice, lead);
  const problem = await sendSafely("Invoice email", () =>
    getEmail().send({
      to: lead.contact.email,
      ...invoiceEmailToClient(invoice, lead, pdfUrl),
      replyTo: process.env.OWNER_EMAIL,
      attachments: [{ filename: `${invoice.number}.pdf`, content: pdf, contentType: "application/pdf" }],
    }),
  );
  await notifyOwner("Invoice issued", lead, {
    Invoice: invoice.number,
    Amount: formatMoney(invoice.total, invoice.currency),
    Purpose: purpose,
  });
  return invoiceResult(invoice, lead, problem ? `Note: ${problem}.` : "The invoice was also emailed with the PDF attached.");
}

function invoiceResult(invoice: InvoiceRecord, lead: Lead, note: string): ActionResult {
  const pdfUrl = documentUrl("invoice", invoice.id);
  const cards: ChatCard[] = [
    {
      kind: "invoice",
      invoiceNumber: invoice.number,
      amount: invoice.total,
      currency: invoice.currency,
      dueDate: invoice.dueDate,
      pdfUrl,
      payUrl: invoice.status === "open" ? invoice.payment?.url : undefined,
    },
  ];
  if (invoice.payment && invoice.status === "open") {
    cards.push({
      kind: "payment",
      url: invoice.payment.url,
      amount: invoice.total,
      currency: invoice.currency as Currency,
      charged: invoice.payment.charged,
      reference: invoice.payment.reference,
      provider: invoice.payment.provider,
      purpose: invoice.purpose,
    });
  }
  return {
    text: `Invoice ${invoice.number} for ${formatMoney(invoice.total, invoice.currency)} (${invoice.status}) issued to ${lead.contact?.email}. A secure payment button is showing in the chat. ${note}`,
    cards,
  };
}

/* ------------------------------------------------------------------ */
/* Two-phase side effects                                              */
/* ------------------------------------------------------------------ */

async function propose(
  sessionId: string,
  type: PendingAction["type"],
  payload: Record<string, string>,
  card: { title: string; summary: string[]; confirmLabel: string },
): Promise<ActionResult> {
  const lead = await ensureLead(sessionId);
  requireVerified(lead);
  const action = await getStore().savePendingAction({
    id: id("act"),
    sessionId,
    leadId: lead.id,
    type,
    payload,
    status: "proposed",
    createdAt: now(),
    expiresAt: new Date(Date.now() + ACTION_TTL).toISOString(),
  });
  return {
    text: `A confirmation card is showing ("${card.title}"). Nothing happens until the visitor presses "${card.confirmLabel}". End your turn now.`,
    cards: [{ kind: "confirm", actionId: action.id, action: type, expiresAt: action.expiresAt, ...card }],
  };
}

export async function proposeBooking(sessionId: string, start: string, timezone: string, notes?: string) {
  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime()) || startDate.getTime() < Date.now()) {
    throw new ActionError("That start time is invalid or in the past. Offer fresh slots with get_available_slots.");
  }
  const tz = isValidTimeZone(timezone) ? timezone : DEFAULT_TIMEZONE;
  const label = new Intl.DateTimeFormat("en-ZA", { timeZone: tz, dateStyle: "full", timeStyle: "short" }).format(startDate);
  return propose(
    sessionId,
    "book_call",
    { start: startDate.toISOString(), timezone: tz, notes: (notes ?? "").slice(0, 500) },
    { title: "Book a 30-minute discovery call", summary: [label, `Time zone: ${tz}`, "Video call link sent by email"], confirmLabel: "Confirm booking" },
  );
}

export async function proposeQuoteEmail(sessionId: string, quoteId: string) {
  const lead = await ensureLead(sessionId);
  requireVerified(lead);
  const quote = await ownedQuote(lead, quoteId);
  return propose(
    sessionId,
    "email_quote",
    { quoteId: quote.id },
    {
      title: `Email quote ${quote.number}`,
      summary: [`To: ${lead.contact.email}`, `Total: ${formatMoney(quote.total, quote.currency)}`, "PDF attached"],
      confirmLabel: "Send it",
    },
  );
}

export async function proposeInvoice(sessionId: string, quoteId: string, purpose: "deposit" | "full") {
  const lead = await ensureLead(sessionId);
  requireVerified(lead);
  const quote = await ownedQuote(lead, quoteId);
  const amount = purpose === "full" ? quote.total : Math.round((quote.total * quote.depositPercent) / 100);
  return propose(
    sessionId,
    "create_invoice",
    { quoteId: quote.id, purpose },
    {
      title: purpose === "deposit" ? `Pay the ${quote.depositPercent}% deposit` : "Pay in full",
      summary: [
        `Against quote ${quote.number}`,
        `Amount: ${formatMoney(amount, quote.currency)}`,
        "You'll get an invoice by email and a secure payment link",
      ],
      confirmLabel: "Issue invoice",
    },
  );
}

/** Runs a proposed action after the visitor pressed confirm. Single-use and time-limited. */
export async function executeAction(sessionId: string, actionId: string): Promise<ActionResult & { summary: string }> {
  const store = getStore();
  const action = await store.getPendingAction(actionId);
  if (!action || action.sessionId !== sessionId) throw new ActionError("That action could not be found.");
  if (action.status !== "proposed") throw new ActionError("That action was already handled.");
  if (new Date(action.expiresAt).getTime() < Date.now()) {
    await store.savePendingAction({ ...action, status: "expired" });
    throw new ActionError("That confirmation expired. Ask the assistant to set it up again.");
  }
  // Claim the action before running it so a double-click cannot execute twice.
  await store.savePendingAction({ ...action, status: "executed", executedAt: now() });
  try {
    const p = action.payload;
    const result =
      action.type === "book_call"
        ? await bookCall(sessionId, p.start, p.timezone, p.notes)
        : action.type === "email_quote"
          ? await emailQuote(sessionId, p.quoteId)
          : await createInvoice(sessionId, p.quoteId, p.purpose === "full" ? "full" : "deposit");
    await store.savePendingAction({ ...action, status: "executed", executedAt: now(), result: result.text });
    return { ...result, summary: result.text };
  } catch (err) {
    await store.savePendingAction({ ...action, status: "failed", result: String(err) });
    throw err;
  }
}

export async function cancelAction(sessionId: string, actionId: string) {
  const store = getStore();
  const action = await store.getPendingAction(actionId);
  if (!action || action.sessionId !== sessionId || action.status !== "proposed") return;
  await store.savePendingAction({ ...action, status: "cancelled" });
}

/* ------------------------------------------------------------------ */
/* Payment fulfilment (called from provider webhooks / return page)    */
/* ------------------------------------------------------------------ */

/**
 * Marks an invoice paid after re-verifying the transaction server-to-server
 * and checking the amount. Idempotent: a paid invoice is returned unchanged.
 */
export async function fulfilPayment(reference: string): Promise<InvoiceRecord | null> {
  const store = getStore();
  const invoice = await store.getInvoiceByReference(reference);
  if (!invoice || !invoice.payment) return null;
  if (invoice.status === "paid") return invoice;

  const check = await getPayments().verify(invoice.payment.reference);
  if (!check.paid) return invoice;
  const expected = invoice.payment.charged ?? { amount: invoice.total, currency: invoice.currency };
  if (check.amount !== undefined && Math.abs(check.amount - expected.amount) > 0.01) {
    console.error(`[payments] amount mismatch for ${reference}: got ${check.amount}, expected ${expected.amount}`);
    return invoice;
  }
  if (check.currency && check.currency.toUpperCase() !== expected.currency) {
    console.error(`[payments] currency mismatch for ${reference}: got ${check.currency}, expected ${expected.currency}`);
    return invoice;
  }

  const paid = await store.saveInvoice({ ...invoice, status: "paid", paidAt: now() });
  const lead = await store.getLead(invoice.leadId);
  if (lead) {
    await store.upsertLead({ ...lead, status: "paid", updatedAt: now() });
    if (lead.contact?.email) {
      await sendSafely("Receipt email", () =>
        getEmail().send({
          to: lead.contact!.email,
          ...receiptEmailToClient(paid, lead, documentUrl("invoice", paid.id)),
          replyTo: process.env.OWNER_EMAIL,
        }),
      );
    }
    await notifyOwner("Payment received", lead, {
      Invoice: paid.number,
      Amount: formatMoney(paid.total, paid.currency),
      Reference: reference,
    });
  }
  return paid;
}

/* ------------------------------------------------------------------ */

export function isValidTimeZone(tz: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
