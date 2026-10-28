import "server-only";

import { getService, profile, services, startingPrice } from "@/content";
import type { ChatCard, ContactDetails, Currency, QuoteLine } from "@/lib/chat/types";
import { createHash, randomInt } from "node:crypto";
import {
  amountDue,
  bookingEmailToClient,
  documentToken,
  documentUrl,
  invoiceEmailToClient,
  ownerNotificationEmail,
  quoteEmailToClient,
  receiptEmailToClient,
  renderInvoicePdf,
  renderQuotePdf,
  verificationEmail,
} from "@/lib/documents";
import {
  IntegrationConfigError,
  allSideEffectsMocked,
  getCalendar,
  getEmail,
  getPaymentProvider,
  getPayments,
  getStore,
  isMockEmail,
  siteUrl,
} from "@/lib/integrations";
import { sessionSecret } from "@/lib/integrations/env";
import type {
  InvoiceRecord,
  Lead,
  LeadStatus,
  PaymentProvider,
  PendingAction,
  QuoteRecord,
} from "@/lib/integrations/types";
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
const HOUR_SECONDS = 60 * 60;
const DAY_SECONDS = 24 * HOUR_SECONDS;
const CODE_TTL = 10 * MINUTE;
const CODE_MAX_ATTEMPTS = 5;
/** Per lead. Sessions (and so leads) are free to mint, hence the store-backed limits below. */
const CODES_PER_HOUR = 3;
/** Per recipient address, across every session and server instance. */
const CODES_PER_ADDRESS_HOUR = 3;
const CODES_PER_ADDRESS_DAY = 10;
/** Site-wide daily cap on verification emails, protecting the sending domain and quota. */
const verificationEmailsPerDay = () => Number(process.env.VERIFICATION_EMAILS_PER_DAY) || 200;
/** Owner emails from handoff_to_human, which any anonymous visitor can trigger. */
const handoffEmailsPerDay = () => Number(process.env.HANDOFF_EMAILS_PER_DAY) || 20;
const BOOKINGS_PER_ADDRESS_WEEK = 3;
/** Slots are offered from two hours out, up to 14 days ahead (see listSlots). */
const SLOT_NOTICE = 2 * 60 * MINUTE;
const SLOT_MAX_DAYS = 14;
const ACTION_TTL = 15 * MINUTE;
const QUOTE_VALID_DAYS = 14;
const INVOICE_DUE_DAYS = 7;
export const DEFAULT_TIMEZONE = process.env.OWNER_TIMEZONE ?? "Africa/Johannesburg";

const id = (prefix: string) => `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
const now = () => new Date().toISOString();
const year = () => new Date().getFullYear();

const normaliseEmail = (email: string) => email.trim().toLowerCase();
/** Keyed hash of an address, so throttle keys never store it in clear. */
const addressKey = (email: string) =>
  createHash("sha256").update(`address:${normaliseEmail(email)}:${sessionSecret()}`).digest("hex").slice(0, 32);

/** Lead statuses only move forward; `lost` (set by the owner) reopens on new activity. */
const LEAD_RANK: Record<LeadStatus, number> = { new: 0, lost: 0, quoted: 1, booked: 2, invoiced: 3, paid: 4, won: 5 };
const advance = (current: LeadStatus, next: LeadStatus) => (LEAD_RANK[next] > LEAD_RANK[current] ? next : current);

/**
 * Runs `fn` after any in-flight call with the same key (per server process).
 * Used per session so concurrent requests can't race a read-check-write.
 */
const queues = new Map<string, Promise<unknown>>();
function oneAtATime<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const run = (queues.get(key) ?? Promise.resolve()).then(() => fn());
  const tail = run.catch(() => undefined);
  queues.set(key, tail);
  void tail.then(() => queues.get(key) === tail && queues.delete(key));
  return run;
}

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

/** The code is bound to the lead and to the address it was sent to. */
const hashCode = (code: string, leadId: string, email: string) =>
  createHash("sha256").update(`${code}:${leadId}:${normaliseEmail(email)}:${sessionSecret()}`).digest("hex");

/** Store-backed limits shared by every session and server instance (the client mints sessions freely). */
async function throttleVerification(email: string) {
  const store = getStore();
  const key = `verify:to:${addressKey(email)}`;
  if (
    (await store.incrementCounter(`${key}:hour`, HOUR_SECONDS)) > CODES_PER_ADDRESS_HOUR ||
    (await store.incrementCounter(`${key}:day`, DAY_SECONDS)) > CODES_PER_ADDRESS_DAY
  ) {
    throw new ActionError("Too many verification codes have been sent to that address. Please try again later.");
  }
  if ((await store.incrementCounter("verify:all:day", DAY_SECONDS)) > verificationEmailsPerDay()) {
    console.error("[concierge] daily verification email cap reached (VERIFICATION_EMAILS_PER_DAY)");
    throw new ActionError(
      `I can't send more verification emails today. Please try again tomorrow, or email ${profile.shortName} at ${profile.email}.`,
    );
  }
}

/**
 * Emails a fresh code to `contact.email`, then saves the contact with the
 * code's hash. Every limit is checked before anything is sent, and nothing is
 * saved unless the send succeeds, so a refused or failed send never leaves a
 * new address on the lead next to an older code.
 */
async function sendVerificationCode(lead: Lead, contact: ContactDetails): Promise<ActionResult> {
  const email = normaliseEmail(contact.email);
  // A mocked email only proves anything when every other adapter is mocked too.
  const revealCode = isMockEmail() && allSideEffectsMocked();
  if (isMockEmail() && !revealCode && process.env.NODE_ENV === "production") {
    console.error("[concierge] verification refused: email is mocked while payments or calendar are live. Set RESEND_API_KEY.");
    throw new ActionError(
      `Email verification isn't available on this site right now, so I can't book, email or invoice from the chat. Please email ${profile.shortName} at ${profile.email}.`,
    );
  }
  const ts = Date.now();
  const v = lead.verification;
  const windowFresh = v && ts - new Date(v.windowStart).getTime() < 60 * MINUTE;
  const sentCount = windowFresh ? v.sentCount : 0;
  if (sentCount >= CODES_PER_HOUR) {
    throw new ActionError("Too many verification codes requested. Please try again in an hour.");
  }
  await throttleVerification(email);
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const problem = await sendSafely("Verification email", () => getEmail().send({ to: email, ...verificationEmail(code) }));
  if (problem) throw new ActionError(problem);
  await getStore().upsertLead({
    ...lead,
    contact: { ...contact, email },
    emailVerifiedAt: undefined,
    verification: {
      codeHash: hashCode(code, lead.id, email),
      email,
      expiresAt: new Date(ts + CODE_TTL).toISOString(),
      attempts: 0,
      sentCount: sentCount + 1,
      windowStart: windowFresh ? v.windowStart : new Date(ts).toISOString(),
    },
    updatedAt: now(),
  });
  return {
    text: `A 6-digit verification code was emailed to ${email}.`,
    cards: [{ kind: "verify_email", email, demoCode: revealCode ? code : undefined }],
  };
}

/** Contact form submitted by the visitor (never by the model). Sends a verification code. */
export async function submitContact(sessionId: string, contact: ContactDetails): Promise<ActionResult> {
  // Serialised with verifyEmail so a code check can't interleave with an address change.
  return oneAtATime(`session:${sessionId}`, async () => {
    const lead = await ensureLead(sessionId);
    const email = normaliseEmail(contact.email);
    if (lead.emailVerifiedAt && lead.contact && normaliseEmail(lead.contact.email) === email) {
      await getStore().upsertLead({ ...lead, contact: { ...contact, email }, updatedAt: now() });
      return { text: `Contact details updated for ${contact.name}; email already verified.`, cards: [] };
    }
    // A new or unverified address is only saved once its code has been sent.
    return sendVerificationCode(lead, { ...contact, email });
  });
}

export async function resendVerification(sessionId: string): Promise<ActionResult> {
  return oneAtATime(`session:${sessionId}`, async () => {
    const lead = await ensureLead(sessionId);
    if (!lead.contact) throw new ActionError("Please fill in your contact details first.");
    if (lead.emailVerifiedAt) return { text: "Email already verified.", cards: [] };
    return sendVerificationCode(lead, lead.contact);
  });
}

export async function verifyEmail(sessionId: string, code: string): Promise<ActionResult> {
  // Serialised so parallel guesses can't all read the same attempt count.
  return oneAtATime(`session:${sessionId}`, () => checkCode(sessionId, code));
}

async function checkCode(sessionId: string, code: string): Promise<ActionResult> {
  const lead = await ensureLead(sessionId);
  if (!lead.contact) throw new ActionError("Please fill in your contact details first.");
  if (lead.emailVerifiedAt) return { text: "Email already verified.", cards: [] };
  const email = normaliseEmail(lead.contact.email);
  const v = lead.verification;
  // A code only ever proves the address it was sent to.
  if (!v?.codeHash || v.email !== email || new Date(v.expiresAt).getTime() < Date.now()) {
    throw new ActionError("That code has expired. Request a new one.");
  }
  if (v.attempts >= CODE_MAX_ATTEMPTS) throw new ActionError("Too many attempts. Request a new code.");
  const store = getStore();
  if (hashCode(code.trim(), lead.id, email) !== v.codeHash) {
    await store.upsertLead({ ...lead, verification: { ...v, attempts: v.attempts + 1 }, updatedAt: now() });
    throw new ActionError("That code doesn't match. Check the email and try again.");
  }
  const verified = await store.upsertLead({
    ...lead,
    emailVerifiedAt: now(),
    // The code is spent; the send counters stay so an address change can't reset them.
    verification: { ...v, codeHash: undefined },
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
          fromZar: startingPrice(s).zar,
          fromUsd: startingPrice(s).usd,
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

/**
 * Flags the lead for a personal follow-up. Any anonymous visitor (or a script
 * minting sessions) can trigger this, so the owner is emailed at most once per
 * lead per day and HANDOFF_EMAILS_PER_DAY (default 20) times a day overall.
 */
export async function requestHandoff(sessionId: string, reason: string): Promise<ActionResult> {
  const lead = await ensureLead(sessionId);
  const to = process.env.OWNER_EMAIL;
  const store = getStore();
  const firstToday = (await store.incrementCounter(`handoff:lead:${lead.id}`, DAY_SECONDS)) === 1;
  if (to && firstToday && (await store.incrementCounter("handoff:all:day", DAY_SECONDS)) <= handoffEmailsPerDay()) {
    await sendSafely("Handoff email", () =>
      getEmail().send({ to, ...ownerNotificationEmail("Handoff requested", lead, { Reason: reason, Summary: lead.summary ?? "-" }) }),
    );
  }
  return {
    text: "The developer has been notified and will follow up personally.",
    cards: [
      {
        kind: "notice",
        tone: "info",
        text: "I've flagged this for Mxolisi to follow up personally. Share your contact details and Mxolisi can reach you directly.",
      },
    ],
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
    status: advance(lead.status, "quoted"),
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
  // Never moves an accepted quote back.
  if (quote.status === "draft") await getStore().saveQuote({ ...quote, status: "sent" });
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
  const from = new Date(Date.now() + SLOT_NOTICE);
  const to = new Date(from.getTime() + Math.min(Math.max(days, 1), SLOT_MAX_DAYS) * DAY);
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
    text: [
      `Showing ${withLabels.length} open 30-minute slots (${tz}) in a card. Ask the visitor to pick one; a click sends its ISO start time. Only these times can be booked (propose_booking needs the exact start):`,
      ...withLabels.map((s) => `- ${s.label}: ${s.start}`),
    ].join("\n"),
    cards: [{ kind: "slots", timezone: tz, slots: withLabels }],
  };
}

const slotLabel = (iso: string, tz: string) =>
  new Intl.DateTimeFormat("en-ZA", { timeZone: isValidTimeZone(tz) ? tz : DEFAULT_TIMEZONE, dateStyle: "full", timeStyle: "short" }).format(
    new Date(iso),
  );

/** One upcoming call per lead; moving it goes through the reschedule link Cal.com emails. */
async function requireNoUpcomingBooking(lead: Lead) {
  const upcoming = (await getStore().listBookings(lead.id)).find(
    (b) => b.status !== "cancelled" && new Date(b.end).getTime() > Date.now(),
  );
  if (upcoming) {
    throw new ActionError(
      `A discovery call is already booked for ${slotLabel(upcoming.start, upcoming.timezone)} (${upcoming.timezone}). Only one upcoming call is allowed; to move it, use the reschedule link in the booking confirmation email.`,
    );
  }
}

/** The start must be one of the slots get_available_slots would offer right now. */
async function requireOpenSlot(startDate: Date, tz: string) {
  const t = startDate.getTime();
  const inWindow = t <= Date.now() + SLOT_NOTICE + SLOT_MAX_DAYS * DAY;
  // A day either side: Cal.com reads date-only bounds in the visitor's zone.
  const slots = inWindow
    ? await getCalendar().getAvailableSlots(new Date(t - DAY).toISOString(), new Date(t + DAY).toISOString(), tz)
    : [];
  if (!slots.some((s) => new Date(s.start).getTime() === t)) {
    throw new ActionError(
      "That time isn't one of the open slots. Call get_available_slots and use one of the exact start times it lists.",
    );
  }
}

async function bookCall(sessionId: string, start: string, timezone: string, notes?: string): Promise<ActionResult> {
  const lead = await ensureLead(sessionId);
  requireVerified(lead);
  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime()) || startDate.getTime() < Date.now()) {
    throw new ActionError("That start time is invalid or in the past. Offer fresh slots with get_available_slots.");
  }
  const tz = isValidTimeZone(timezone) ? timezone : DEFAULT_TIMEZONE;
  await requireNoUpcomingBooking(lead);
  // New sessions mint new leads, so also cap bookings per verified address.
  const weekly = await getStore().incrementCounter(`book:to:${addressKey(lead.contact.email)}`, 7 * DAY_SECONDS);
  if (weekly > BOOKINGS_PER_ADDRESS_WEEK) {
    throw new ActionError("This email address has booked several calls this week. Reply to a booking confirmation email to arrange another time.");
  }
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
  await store.upsertLead({ ...lead, status: advance(lead.status, "booked"), updatedAt: now() });
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

type InvoicePurpose = InvoiceRecord["purpose"];

interface InvoicePlan {
  purpose: InvoicePurpose;
  amount: number;
  lines: QuoteLine[];
  /** Total of the non-void invoices already issued against the quote. */
  invoiced: number;
  /** An invoice for the same purpose already exists; it is shown again instead. */
  existing?: InvoiceRecord;
}

/**
 * What a new invoice against `quote` may charge. A deposit or a full invoice
 * is only possible while nothing has been invoiced; after that only the
 * balance (total less every non-void invoice) is, and nothing once the quote
 * is covered, so a client can never be billed twice for the same work.
 */
async function planInvoice(lead: Lead, quote: QuoteRecord, requested: InvoicePurpose): Promise<InvoicePlan> {
  const issued = (await getStore().listInvoices(lead.id)).filter((i) => i.quoteId === quote.id && i.status !== "void");
  const invoiced = issued.reduce((sum, i) => sum + i.total, 0);
  // With nothing invoiced yet, the balance is simply the full amount.
  const purpose = requested === "balance" && invoiced === 0 ? "full" : requested;
  const existing = issued.find((i) => i.purpose === purpose);
  // `invoiced` excludes the repeat itself, so a re-shown balance card reads "already invoiced" correctly.
  if (existing) return { purpose, amount: existing.total, lines: existing.lines, invoiced: invoiced - existing.total, existing };

  const remaining = quote.total - invoiced;
  const numbers = issued.map((i) => i.number).join(", ");
  if (remaining <= 0) {
    throw new ActionError(`Quote ${quote.number} is already fully invoiced (${numbers}); nothing more is due.`);
  }
  if (purpose !== "balance" && invoiced > 0) {
    throw new ActionError(
      `Quote ${quote.number} already has ${formatMoney(invoiced, quote.currency)} invoiced (${numbers}). Use purpose "balance" for the remaining ${formatMoney(remaining, quote.currency)}.`,
    );
  }
  if (purpose === "full") return { purpose, amount: quote.total, lines: quote.lines, invoiced };
  if (purpose === "deposit") {
    const amount = Math.round((quote.total * quote.depositPercent) / 100);
    return { purpose, amount, lines: [{ label: `${quote.depositPercent}% deposit against quote ${quote.number}`, amount }], invoiced };
  }
  return {
    purpose,
    amount: remaining,
    lines: [...quote.lines, ...issued.map((i) => ({ label: `Less invoice ${i.number} (${i.purpose})`, amount: -i.total }))],
    invoiced,
  };
}

const purposeWord = (p: InvoicePurpose) => (p === "full" ? "payment" : p);

/** What the client pays: the amount sent to the provider at issue time when recorded. */
const invoiceDue = (i: InvoiceRecord) => i.payment?.requested?.amount ?? amountDue(i.total, i.currency);

async function createInvoice(sessionId: string, quoteId: string, requested: InvoicePurpose): Promise<ActionResult> {
  const lead = await ensureLead(sessionId);
  requireVerified(lead);
  const quote = await ownedQuote(lead, quoteId);
  if (new Date(quote.validUntil).getTime() < Date.now()) {
    throw new ActionError(`Quote ${quote.number} has expired. Create a fresh quote first.`);
  }

  const store = getStore();
  const { purpose, amount, lines, existing } = await planInvoice(lead, quote, requested);
  if (existing) return invoiceResult(existing, lead, "An invoice for this already exists; showing it again.");

  const seq = await store.nextSequence("invoice");
  const number = `INV-${year()}-${String(seq).padStart(4, "0")}`;

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

  const payments = getPayments();
  // Charge what the invoice PDF says is due (VAT included once registered), not the ex-VAT record total.
  const due = amountDue(amount, quote.currency);
  const link = await payments.createPaymentLink({
    amount: due,
    currency: quote.currency,
    email: lead.contact.email,
    name: lead.contact.name,
    reference: number,
    description: `${number} — ${purposeWord(purpose)} for quote ${quote.number}`,
    // `t` lets the return page offer the invoice PDF without making sequential numbers browsable.
    callbackUrl: `${siteUrl()}/pay/complete?ref=${encodeURIComponent(number)}&t=${documentToken("invoice", invoice.id)}`,
    metadata: { invoiceId: invoice.id, leadId: lead.id, quoteId: quote.id },
  });
  invoice = await store.saveInvoice({
    ...invoice,
    payment: {
      provider: link.provider,
      reference: link.reference,
      url: link.url,
      // Fulfilment checks against this, so a later VAT switch can't strand the payment.
      requested: { amount: due, currency: quote.currency },
      charged: link.charged,
    },
  });
  await store.saveQuote({ ...quote, status: "accepted" });
  await store.upsertLead({ ...lead, status: advance(lead.status, "invoiced"), updatedAt: now() });

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
    Amount: formatMoney(invoiceDue(invoice), invoice.currency),
    Purpose: purpose,
  });
  return invoiceResult(invoice, lead, problem ? `Note: ${problem}.` : "The invoice was also emailed with the PDF attached.");
}

function invoiceResult(invoice: InvoiceRecord, lead: Lead, note: string): ActionResult {
  const pdfUrl = documentUrl("invoice", invoice.id);
  const due = invoiceDue(invoice);
  const cards: ChatCard[] = [
    {
      kind: "invoice",
      invoiceNumber: invoice.number,
      amount: due,
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
      amount: due,
      currency: invoice.currency as Currency,
      charged: invoice.payment.charged,
      reference: invoice.payment.reference,
      provider: invoice.payment.provider,
      purpose: invoice.purpose,
    });
  }
  return {
    text: `Invoice ${invoice.number} for ${formatMoney(due, invoice.currency)} (${invoice.status}) issued to ${lead.contact?.email}. A secure payment button is showing in the chat. ${note}`,
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
  const lead = await ensureLead(sessionId);
  requireVerified(lead);
  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime()) || startDate.getTime() < Date.now()) {
    throw new ActionError("That start time is invalid or in the past. Offer fresh slots with get_available_slots.");
  }
  const tz = isValidTimeZone(timezone) ? timezone : DEFAULT_TIMEZONE;
  await requireNoUpcomingBooking(lead);
  await requireOpenSlot(startDate, tz);
  const label = slotLabel(startDate.toISOString(), tz);
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

export async function proposeInvoice(sessionId: string, quoteId: string, requested: InvoicePurpose) {
  const lead = await ensureLead(sessionId);
  requireVerified(lead);
  const quote = await ownedQuote(lead, quoteId);
  const { purpose, amount, invoiced } = await planInvoice(lead, quote, requested);
  const due = amountDue(amount, quote.currency);
  return propose(
    sessionId,
    "create_invoice",
    { quoteId: quote.id, purpose },
    {
      title:
        purpose === "deposit" ? `Pay the ${quote.depositPercent}% deposit` : purpose === "balance" ? "Pay the balance" : "Pay in full",
      summary: [
        `Against quote ${quote.number}`,
        ...(purpose === "balance"
          ? [`Quote total ${formatMoney(quote.total, quote.currency)}, already invoiced ${formatMoney(invoiced, quote.currency)}`]
          : []),
        `Amount: ${formatMoney(due, quote.currency)}${due !== amount ? " incl. VAT" : ""}`,
        "You'll get an invoice by email and a secure payment link",
      ],
      confirmLabel: "Issue invoice",
    },
  );
}

const CONFIRMED_ACTION_FAILED: Record<PendingAction["type"], string> = {
  book_call: "That booking didn't go through — the slot may have just been taken. Ask me for fresh times and pick another.",
  email_quote: "The quote email couldn't be sent just now. Please try again in a few minutes.",
  create_invoice:
    "Online payment isn't available right now, so no invoice was issued. Please try again later, or ask me to email the quote instead.",
};

/**
 * Runs a proposed action after the visitor pressed confirm. Single-use and
 * time-limited. Actions for one session run one at a time (so two confirmed
 * invoices can't both pass the "already issued" check), and each action is
 * claimed atomically in the store, so a double-click or a retry that lands on
 * another server instance cannot execute it twice.
 */
export async function executeAction(sessionId: string, actionId: string): Promise<ActionResult & { summary: string }> {
  return oneAtATime(`session:${sessionId}`, async () => {
    const store = getStore();
    const action = await store.getPendingAction(actionId);
    if (!action || action.sessionId !== sessionId) throw new ActionError("That action could not be found.");
    if (action.status !== "proposed") throw new ActionError("That action was already handled.");
    if (new Date(action.expiresAt).getTime() < Date.now()) {
      await store.savePendingAction({ ...action, status: "expired" });
      throw new ActionError("That confirmation expired. Ask the assistant to set it up again.");
    }
    if (!(await store.recordWebhookEvent("pending-action", action.id))) {
      throw new ActionError("That action was already handled.");
    }
    await store.savePendingAction({ ...action, status: "executed", executedAt: now() });
    try {
      const p = action.payload;
      const purpose: InvoicePurpose = p.purpose === "full" || p.purpose === "balance" ? p.purpose : "deposit";
      const result =
        action.type === "book_call"
          ? await bookCall(sessionId, p.start, p.timezone, p.notes)
          : action.type === "email_quote"
            ? await emailQuote(sessionId, p.quoteId)
            : await createInvoice(sessionId, p.quoteId, purpose);
      await store.savePendingAction({ ...action, status: "executed", executedAt: now(), result: result.text });
      return { ...result, summary: result.text };
    } catch (err) {
      await store.savePendingAction({ ...action, status: "failed", result: String(err) });
      if (err instanceof ActionError) throw err;
      // Provider or config failure: log the detail, tell the visitor (and the model) what to do next.
      console.error(`[concierge] ${action.type} failed after confirmation`, err);
      throw new ActionError(CONFIRMED_ACTION_FAILED[action.type]);
    }
  });
}

export async function cancelAction(sessionId: string, actionId: string) {
  await oneAtATime(`session:${sessionId}`, async () => {
    const store = getStore();
    const action = await store.getPendingAction(actionId);
    if (!action || action.sessionId !== sessionId || action.status !== "proposed") return;
    await store.savePendingAction({ ...action, status: "cancelled" });
  });
}

/* ------------------------------------------------------------------ */
/* Payment fulfilment (called from provider webhooks / return page)    */
/* ------------------------------------------------------------------ */

/**
 * Marks an invoice paid after re-verifying the transaction server-to-server
 * with the provider that issued it, and checking the amount. Idempotent: a
 * paid invoice is returned unchanged, and when the webhook and the return
 * page confirm the same payment at once only one sends the receipt.
 */
export async function fulfilPayment(reference: string): Promise<InvoiceRecord | null> {
  const store = getStore();
  const invoice = await store.getInvoiceByReference(reference);
  if (!invoice || !invoice.payment) return null;
  if (invoice.status === "paid") return invoice;

  // Not the active provider: after a switch (or with DEMO_MODE on) the demo
  // checkout must not be able to settle an invoice issued through Paystack.
  let provider: PaymentProvider;
  try {
    provider = getPaymentProvider(invoice.payment.provider);
  } catch (err) {
    if (err instanceof IntegrationConfigError) return invoice;
    throw err;
  }
  const check = await provider.verify(invoice.payment.reference);
  if (!check.paid) return invoice;
  const expected = invoice.payment.charged ?? { amount: invoiceDue(invoice), currency: invoice.currency };
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
  if (!lead) return paid;
  await store.upsertLead({ ...lead, status: advance(lead.status, "paid"), updatedAt: now() });
  if (!(await store.recordWebhookEvent("receipt", paid.id))) return paid;
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
    Amount: formatMoney(invoiceDue(paid), paid.currency),
    Reference: reference,
  });
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
