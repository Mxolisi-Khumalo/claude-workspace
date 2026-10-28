import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { getService } from "@/content";
import type { ChatAction, ChatRequest, ChatStreamEvent } from "@/lib/chat/types";
import {
  ActionError,
  DEFAULT_TIMEZONE,
  cancelAction,
  ensureLead,
  executeAction,
  isValidTimeZone,
  resendVerification,
  submitContact,
  verifyEmail,
  type ActionResult,
} from "@/lib/concierge/actions";
import { getStore } from "@/lib/integrations";
import type { ConversationRecord } from "@/lib/integrations/types";
import { claudeConfigured, closeTurn, runClaudeTurn } from "./claude";
import { runDemoTurn } from "./demo";

type Emit = (e: ChatStreamEvent) => void;

export const MAX_TURNS = 40;
export const MAX_MESSAGE_CHARS = 2000;

export const isDemoChat = () => process.env.DEMO_MODE === "true" || !claudeConfigured();

export class ChatInputError extends Error {}

async function loadConversation(sessionId: string): Promise<ConversationRecord> {
  const existing = await getStore().getConversation(sessionId);
  if (existing) return existing;
  const ts = new Date().toISOString();
  return { sessionId, createdAt: ts, updatedAt: ts, messages: [], turns: 0 };
}

async function appContext(conv: ConversationRecord, req: ChatRequest, timezone: string, events: string[]) {
  const lead = await ensureLead(conv.sessionId);
  const store = getStore();
  const [quotes, invoices, bookings] = await Promise.all([
    store.listQuotes(lead.id),
    store.listInvoices(lead.id),
    store.listBookings(lead.id),
  ]);
  const today = new Intl.DateTimeFormat("en-ZA", { timeZone: DEFAULT_TIMEZONE, dateStyle: "full", timeStyle: "short" }).format(new Date());
  const service = req.context?.serviceSlug ? getService(req.context.serviceSlug) : undefined;
  const lines = [
    "[app context]",
    `Now: ${today} (${DEFAULT_TIMEZONE}). Visitor time zone: ${timezone}.`,
    service ? `Visitor opened the chat from the "${service.title}" service page.` : req.context?.path ? `Visitor is on ${req.context.path}.` : "",
    lead.contact
      ? `Contact on file: ${lead.contact.name} <${lead.contact.email}>${lead.contact.company ? `, ${lead.contact.company}` : ""}. Email verified: ${lead.emailVerifiedAt ? "yes" : "no"}.`
      : "No contact details yet.",
    quotes.length
      ? `Quotes: ${quotes.map((q) => `${q.number} (id ${q.id}, ${q.currency} ${q.total}, ${q.status}, valid until ${q.validUntil.slice(0, 10)})`).join("; ")}.`
      : "",
    invoices.length ? `Invoices: ${invoices.map((i) => `${i.number} (${i.purpose}, ${i.status})`).join("; ")}.` : "",
    bookings.length ? `Bookings: ${bookings.map((b) => `${b.start} (${b.status})`).join("; ")}.` : "",
    ...events.map((e) => `[app event] ${e}`),
  ];
  return lines.filter(Boolean).join("\n");
}

/** Converts a card action into what the visitor "said", plus any server-side effect. */
async function handleAction(
  conv: ConversationRecord,
  action: ChatAction,
  emit: Emit,
): Promise<{ userText: string; events: string[]; runModel: boolean }> {
  const show = (r: ActionResult) => r.cards.forEach((card) => emit({ type: "card", card }));
  switch (action.type) {
    case "submit_contact": {
      if (action.website) throw new ChatInputError("Something went wrong. Please try again.");
      const c = action.contact;
      const contact = {
        name: String(c.name ?? "").trim().slice(0, 120),
        email: String(c.email ?? "").trim().toLowerCase().slice(0, 200),
        company: c.company ? String(c.company).trim().slice(0, 120) : undefined,
        phone: c.phone ? String(c.phone).trim().slice(0, 40) : undefined,
        consent: true as const,
      };
      if (!contact.name || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contact.email) || c.consent !== true) {
        throw new ChatInputError("Please enter your name, a valid email and tick the consent box.");
      }
      const r = await submitContact(conv.sessionId, contact);
      emit({
        type: "text",
        delta: r.cards.some((c) => c.kind === "verify_email")
          ? `Thanks, ${contact.name.split(" ")[0]}! I've emailed a 6-digit code to **${contact.email}** — enter it below to verify your email.`
          : `Thanks, ${contact.name.split(" ")[0]} — your details are updated.`,
      });
      show(r);
      return { userText: "", events: [`Visitor submitted contact details (${contact.name}, ${contact.email}); verification code sent.`], runModel: false };
    }
    case "verify_email": {
      const r = await verifyEmail(conv.sessionId, String(action.code).slice(0, 12));
      show(r);
      return { userText: "(I've verified my email.)", events: [r.text], runModel: true };
    }
    case "resend_code": {
      const r = await resendVerification(conv.sessionId);
      emit({ type: "text", delta: "I've sent a fresh code." });
      show(r);
      return { userText: "", events: [], runModel: false };
    }
    case "confirm_action": {
      const r = await executeAction(conv.sessionId, String(action.actionId));
      show(r);
      return { userText: "(I confirmed.)", events: [`Visitor confirmed. Result: ${r.summary}`], runModel: true };
    }
    case "cancel_action": {
      await cancelAction(conv.sessionId, String(action.actionId));
      return { userText: "(I cancelled that.)", events: ["Visitor cancelled the proposed action; nothing was done."], runModel: true };
    }
    case "pick_slot": {
      const start = String(action.start).slice(0, 40);
      return { userText: `I'd like the ${String(action.label).slice(0, 60)} slot (start ${start}).`, events: [], runModel: true };
    }
    case "choose_currency":
      return { userText: `Please use ${action.currency === "USD" ? "US dollars" : "rand"}.`, events: [], runModel: true };
    case "accept_quote":
      return { userText: `I'm happy with quote ${String(action.quoteId).slice(0, 64)} and want to go ahead.`, events: [], runModel: true };
    case "quick_reply":
      return { userText: String(action.text).slice(0, 200), events: [], runModel: true };
    default:
      throw new ChatInputError("Unsupported action.");
  }
}

/**
 * Entry point for one request to /api/chat. Streams events via `emit` and
 * persists the conversation. Errors visible to the visitor are emitted as
 * friendly messages; details stay in server logs.
 */
export async function handleChat(req: ChatRequest, emit: Emit): Promise<void> {
  const demo = isDemoChat();
  const messageId = crypto.randomUUID();
  emit({ type: "start", messageId, demo });

  const conv = await loadConversation(req.sessionId);
  if (!conv.privacyAckAt) {
    if (!req.privacyAck) throw new ChatInputError("Please accept the privacy notice to start chatting.");
    conv.privacyAckAt = new Date().toISOString();
  }
  if (conv.turns >= MAX_TURNS) {
    throw new ChatInputError("We've covered a lot! To keep going, please book a call or email Mxolisi directly.");
  }

  const timezone = req.context?.timezone && isValidTimeZone(req.context.timezone) ? req.context.timezone : DEFAULT_TIMEZONE;
  const lead = await ensureLead(conv.sessionId);
  conv.leadId = lead.id;

  let userText = "";
  let events: string[] = [];
  let runModel = true;

  try {
    if (req.action) {
      ({ userText, events, runModel } = await handleAction(conv, req.action, emit));
    } else {
      userText = String(req.message ?? "").trim();
      if (!userText) throw new ChatInputError("Please type a message.");
      if (userText.length > MAX_MESSAGE_CHARS) throw new ChatInputError(`Please keep messages under ${MAX_MESSAGE_CHARS} characters.`);
    }
  } catch (err) {
    if (err instanceof ActionError) {
      emit({ type: "card", card: { kind: "notice", tone: "warning", text: err.message } });
      await saveConversation(conv);
      emit({ type: "done", messageId });
      return;
    }
    throw err;
  }

  // Events that don't trigger a model turn are delivered with the next one.
  const pending = conv.pendingEvents ?? [];
  if (!runModel) {
    conv.pendingEvents = [...pending, ...events];
    await saveConversation(conv);
    emit({ type: "done", messageId });
    return;
  }
  const allEvents = [...pending, ...events];
  conv.pendingEvents = [];
  conv.turns += 1;

  try {
    if (demo) {
      await runDemoTurn({ conv, userText, action: req.action, timezone, context: req.context, emit });
    } else {
      await runClaudeTurn({
        conv,
        userContent: userText,
        appContext: await appContext(conv, req, timezone, allEvents),
        timezone,
        emit,
      });
    }
  } catch (err) {
    console.error("[chat] turn failed", err);
    const busy = err instanceof Anthropic.RateLimitError || (err instanceof Anthropic.APIError && (err.status ?? 0) >= 500);
    if (!demo) {
      closeTurn(
        conv,
        busy
          ? "\n\nI'm a little overloaded right now — please try again in a minute, or leave your details and Mxolisi will get back to you."
          : "\n\nSomething went wrong on my side. Please try again, or leave your details and Mxolisi will reply by email.",
        emit,
      );
    } else {
      emit({ type: "text", delta: "\n\nSomething went wrong on my side. Please try again." });
    }
  }

  await saveConversation(conv);
  emit({ type: "done", messageId });
}

async function saveConversation(conv: ConversationRecord) {
  conv.updatedAt = new Date().toISOString();
  await getStore().saveConversation(conv);
}
