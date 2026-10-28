import "server-only";

import { services } from "@/content";
import type { Service } from "@/content/types";
import type { ChatAction, ChatRequest, ChatStreamEvent, Currency } from "@/lib/chat/types";
import {
  ActionError,
  createQuote,
  ensureLead,
  listSlots,
  proposeBooking,
  proposeInvoice,
  proposeQuoteEmail,
  recommendServices,
  requestContact,
  updateBrief,
  type ActionResult,
} from "@/lib/concierge/actions";
import type { ConversationRecord } from "@/lib/integrations/types";

/**
 * Scripted concierge used when no Claude API key is configured (or
 * DEMO_MODE=true). It walks the same journey — match a service, price it with
 * the real quote engine, then book / email / invoice through the real
 * two-phase actions — and emits exactly the same stream events, so the UI
 * behaves identically. Quick replies mean visitors never need to type.
 */

type Emit = (e: ChatStreamEvent) => void;

type NextStep = "book" | "email" | "pay";

interface DemoState {
  serviceSlug?: string;
  currency?: Currency;
  quoteId?: string;
  nextStep?: NextStep;
  awaiting?: "service" | "currency" | "scope" | "next" | "slot";
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function say(emit: Emit, text: string) {
  // Stream in small word groups so the UI (and the robot) feel alive.
  const parts = text.match(/\S+\s*/g) ?? [text];
  for (let i = 0; i < parts.length; i += 3) {
    emit({ type: "text", delta: parts.slice(i, i + 3).join("") });
    await sleep(28);
  }
}

async function tool(emit: Emit, name: string, label: string, run: () => Promise<ActionResult> | ActionResult) {
  emit({ type: "tool", name, label, status: "running" });
  await sleep(350);
  try {
    const r = await run();
    emit({ type: "tool", name, label, status: "done" });
    r.cards.forEach((card) => emit({ type: "card", card }));
    return r;
  } catch (err) {
    emit({ type: "tool", name, label, status: "error" });
    if (err instanceof ActionError) {
      emit({ type: "card", card: { kind: "notice", tone: "warning", text: err.message } });
      return null;
    }
    throw err;
  }
}

const replies = (emit: Emit, options: string[]) => emit({ type: "card", card: { kind: "quick_replies", options } });

/* ------------------------------------------------------------------ */
/* Intent matching                                                     */
/* ------------------------------------------------------------------ */

const STOP = new Set(["and", "the", "for", "with", "your", "you", "app", "apps", "development", "services", "service", "build", "built"]);

function keywords(s: Service): string[] {
  const words = [s.title, s.tagline, ...s.tech, ...s.idealFor]
    .join(" ")
    .toLowerCase()
    .split(/[^a-z0-9.+#]+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
  return [...new Set(words)];
}

const INTENTS: { re: RegExp; hint: RegExp }[] = [
  { re: /\b(website|landing|site|homepage|marketing|portfolio|animation|3d|webgl|brand)\b/, hint: /web|site|interactive|experience|frontend/ },
  { re: /\b(saas|dashboard|portal|web ?app|platform|mvp|booking|crud|admin)\b/, hint: /app|saas|product|platform|full/ },
  { re: /\b(api|backend|serverless|aws|lambda|cloud|database|integration)\b/, hint: /cloud|api|backend|serverless/ },
  { re: /\b(sign|signature|document|pdf|workflow|automation|automate)\b/, hint: /document|workflow|automation|sign/ },
  { re: /\b(game|canvas|interactive|playable)\b/, hint: /game|interactive|creative/ },
  { re: /\b(mentor|mentoring|teach|training|upskill|bootcamp|tutor|code review)\b/, hint: /mentor|training|upskill|coach/ },
  { re: /\b(desktop|internal|inventory|staff|management system|c#|\.net|winforms)\b/, hint: /business|internal|system|desktop/ },
];

export function matchServices(text: string): Service[] {
  const t = text.toLowerCase();
  const scored = services.map((s) => {
    let score = 0;
    for (const k of keywords(s)) if (t.includes(k)) score += 1;
    for (const { re, hint } of INTENTS) if (re.test(t) && hint.test(`${s.slug} ${s.title.toLowerCase()}`)) score += 3;
    if (t.includes(s.title.toLowerCase())) score += 10;
    return { s, score };
  });
  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.s.priority - b.s.priority)
    .map((x) => x.s);
}

function detectCurrency(text: string): Currency | undefined {
  const t = text.toLowerCase();
  if (/\b(usd|dollar|us\$|\$)/.test(t) || /\binternational|uk|usa|europe|abroad\b/.test(t)) return "USD";
  if (/\b(zar|rand|r\d|south africa|joburg|johannesburg|cape town|durban|local)\b/.test(t)) return "ZAR";
  return undefined;
}

function detectNextStep(text: string): NextStep | undefined {
  const t = text.toLowerCase();
  if (/\b(book|call|meet|meeting|chat|schedule)\b/.test(t)) return "book";
  if (/\b(email|send|pdf|mail)\b/.test(t)) return "email";
  if (/\b(pay|deposit|invoice|start|go ahead|reserve)\b/.test(t)) return "pay";
  return undefined;
}

/* ------------------------------------------------------------------ */

export interface DemoTurnInput {
  conv: ConversationRecord;
  userText: string;
  action?: ChatAction;
  timezone: string;
  context?: ChatRequest["context"];
  emit: Emit;
}

export async function runDemoTurn({ conv, userText, action, timezone, context, emit }: DemoTurnInput): Promise<void> {
  const state = (conv.demoState ??= {}) as DemoState;
  const sessionId = conv.sessionId;
  const lead = await ensureLead(sessionId);
  const text = userText.trim();

  // Post-confirmation follow-ups: the engine already executed the action.
  if (action?.type === "confirm_action") {
    await say(emit, "Done — you'll find everything in your inbox too. Is there anything else I can help you with?");
    replies(emit, ["Book a discovery call", "Email me the quote", "That's all, thanks"]);
    return;
  }
  if (action?.type === "cancel_action") {
    await say(emit, "No problem — nothing was sent or booked. What would you like to do instead?");
    replies(emit, ["Book a discovery call", "Email me the quote", "Pay the deposit"]);
    return;
  }

  if (/^(that's all|thanks|thank you|no thanks)/i.test(text)) {
    await say(emit, "My pleasure. Mxolisi will be in touch — have a great day!");
    return;
  }

  // Seed service from the page the chat was opened on.
  if (!state.serviceSlug && context?.serviceSlug && services.some((s) => s.slug === context.serviceSlug)) {
    state.serviceSlug = context.serviceSlug;
  }

  // Only interpret free text / quick replies; synthesized action text
  // (e.g. "(I've verified my email.)") must not change the plan.
  const typed = !action || action.type === "quick_reply";
  const currency = typed ? detectCurrency(text) : undefined;
  if (currency) state.currency = currency;
  const step = typed ? detectNextStep(text) : undefined;

  // 1) Which service?
  if (!state.serviceSlug || state.awaiting === "service") {
    const matched = matchServices(text);
    if (matched.length === 0) {
      state.awaiting = "service";
      await say(
        emit,
        text
          ? "Thanks! To point you at the right service, which of these is closest to what you need?"
          : "Hi! I'm Byte, Mxolisi's project concierge (running in demo mode). What are you looking to build?",
      );
      replies(emit, services.slice(0, 4).map((s) => s.title));
      return;
    }
    state.serviceSlug = matched[0].slug;
    state.awaiting = undefined;
    const top = matched.slice(0, 2);
    await say(
      emit,
      `That sounds like a fit for **${top[0].title}**${top[1] ? ` (and possibly ${top[1].title})` : ""}. ${top[0].evidence[0] ? `For proof, see ${top[0].evidence[0].project}: ${top[0].evidence[0].proofPoint}` : ""}`,
    );
    await tool(emit, "recommend_services", "Matching services", () => recommendServices(top.map((s) => s.slug)));
    await updateBrief(sessionId, { summary: text || `Interested in ${top[0].title}`, serviceSlugs: top.map((s) => s.slug) });
  }

  const service = services.find((s) => s.slug === state.serviceSlug)!;

  // 2) Currency
  if (!state.currency) {
    state.awaiting = "currency";
    await say(emit, "Should I quote in South African rand or US dollars?");
    replies(emit, ["Rand (ZAR)", "US dollars (USD)"]);
    return;
  }

  // 3) Scope → quote
  if (!state.quoteId) {
    if (state.awaiting !== "scope") {
      state.awaiting = "scope";
      await say(emit, `How big is the first version? ${service.packages.map((p) => `**${p.name}** (${p.timeline})`).join(", ")}.`);
      replies(emit, service.packages.map((p) => p.name).slice(0, 4));
      return;
    }
    const pkg =
      service.packages.find((p) => text.toLowerCase().includes(p.name.toLowerCase())) ??
      (/\b(big|large|full|everything|works|premium)\b/i.test(text) ? service.packages.at(-1) : service.packages[0]);
    await say(emit, `Great — pricing the **${pkg!.name}** package now.`);
    const r = await tool(emit, "create_quote", "Pricing your project", () =>
      createQuote(sessionId, { selections: [{ serviceSlug: service.slug, packageName: pkg!.name }], extras: [], currency: state.currency!, rush: false }),
    );
    const quoteCard = r?.cards.find((c) => c.kind === "quote");
    if (quoteCard && quoteCard.kind === "quote") state.quoteId = quoteCard.quoteId;
    state.awaiting = "next";
    await say(emit, "That's a ballpark until we confirm scope on a call. What would you like to do next?");
    replies(emit, ["Book a discovery call", "Email me the quote", "Pay the deposit"]);
    return;
  }

  // 4) Next steps — need a verified email first.
  if (step) state.nextStep = step;
  if (!state.nextStep) {
    await say(emit, "I can book a free 30-minute call, email you the quote as a PDF, or issue a deposit invoice. Which would you like?");
    replies(emit, ["Book a discovery call", "Email me the quote", "Pay the deposit"]);
    return;
  }

  if (!lead.contact || !lead.emailVerifiedAt) {
    await say(emit, "I'll just need your details first (and a quick email check).");
    await tool(emit, "request_contact_details", "Preparing a contact form", () =>
      requestContact(state.nextStep === "book" ? "so I can book your call" : "so I can send your documents", lead),
    );
    return;
  }

  if (state.nextStep === "book") {
    if (action?.type === "pick_slot") {
      await say(emit, "Lovely — please confirm below and I'll lock it in.");
      await tool(emit, "propose_booking", "Preparing your booking", () => proposeBooking(sessionId, action.start, timezone));
      state.nextStep = undefined;
      return;
    }
    await say(emit, "Here are the next open slots — pick one that suits you.");
    await tool(emit, "get_available_slots", "Checking the calendar", () => listSlots(timezone, 7));
    return;
  }

  if (state.nextStep === "email") {
    await say(emit, "Ready to send — confirm below.");
    await tool(emit, "propose_quote_email", "Preparing your quote email", () => proposeQuoteEmail(sessionId, state.quoteId!));
    state.nextStep = undefined;
    return;
  }

  await say(emit, "Here's the deposit invoice to reserve your start date — confirm below to get the secure payment link.");
  await tool(emit, "propose_payment", "Preparing your invoice", () => proposeInvoice(sessionId, state.quoteId!, "deposit"));
  state.nextStep = undefined;
}
