import "server-only";

import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { services } from "@/content";
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
  requestHandoff,
  updateBrief,
  type ActionResult,
} from "@/lib/concierge/actions";
import { QuoteError } from "@/lib/concierge/pricing";

/**
 * The concierge's fixed tool allowlist. No tool fetches URLs, runs code or
 * accepts prices; side effects (booking, emailing, invoicing) are only
 * *proposed* here and run after the visitor confirms in the UI.
 */

const SLUGS = services.map((s) => s.slug) as [string, ...string[]];

const schemas = {
  recommend_services: z.object({
    slugs: z.array(z.enum(SLUGS)).min(1).max(4),
    reason: z.string().max(400),
  }),
  save_brief: z.object({
    summary: z.string().min(1).max(2000),
    service_slugs: z.array(z.enum(SLUGS)).max(6),
    budget: z.string().max(200).optional(),
    timeline: z.string().max(200).optional(),
  }),
  request_contact_details: z.object({ reason: z.string().max(200) }),
  create_quote: z.object({
    selections: z
      .array(z.object({ service_slug: z.enum(SLUGS), package_name: z.string().max(80).optional() }))
      .min(1)
      .max(4),
    extras: z
      .array(z.object({ label: z.string().min(1).max(120), size: z.enum(["small", "medium", "large"]) }))
      .max(8)
      .default([]),
    currency: z.enum(["ZAR", "USD"]),
    rush: z.boolean().default(false),
  }),
  get_available_slots: z.object({
    days: z.number().int().min(1).max(14).default(7),
    timezone: z.string().max(64).optional(),
  }),
  propose_booking: z.object({
    start: z.string().max(40),
    timezone: z.string().max(64),
    agenda: z.string().max(500).optional(),
  }),
  propose_quote_email: z.object({ quote_id: z.string().max(64) }),
  propose_payment: z.object({ quote_id: z.string().max(64), purpose: z.enum(["deposit", "balance", "full"]) }),
  show_quick_replies: z.object({ options: z.array(z.string().min(1).max(60)).min(2).max(4) }),
  handoff_to_human: z.object({ reason: z.string().max(500) }),
};

export type ToolName = keyof typeof schemas;

/** Short, client-facing progress labels shown while a tool runs. */
export const TOOL_LABELS: Record<ToolName, string> = {
  recommend_services: "Matching services",
  save_brief: "Saving your brief",
  request_contact_details: "Preparing a contact form",
  create_quote: "Pricing your project",
  get_available_slots: "Checking the calendar",
  propose_booking: "Preparing your booking",
  propose_quote_email: "Preparing your quote email",
  propose_payment: "Preparing your invoice",
  show_quick_replies: "Suggesting replies",
  handoff_to_human: "Looping in Mxolisi",
};

const DESCRIPTIONS: Record<ToolName, string> = {
  recommend_services:
    "Show the visitor service cards (with 'from' prices and links to the detailed service pages) for the services that fit their need. Use once you understand roughly what they want.",
  save_brief:
    "Record or update a concise summary of the visitor's project (goals, features, constraints, budget, timeline) on their lead record. Call whenever you learn something material; overwrite with the full updated summary each time.",
  request_contact_details:
    "Show a contact form (name, email, company, consent). Required before booking, emailing a quote or invoicing. The visitor's email must then be verified with a 6-digit code; end your turn after calling this.",
  create_quote:
    "Create a priced quote from the catalogue packages plus sized extra scope items. The server computes all amounts; never state prices that did not come from this tool. Use ZAR for South African visitors, USD otherwise; ask if unclear.",
  get_available_slots:
    "Show open 30-minute discovery-call slots from the developer's calendar. Never claim availability without calling this.",
  propose_booking:
    "Propose booking the slot the visitor picked, using the exact ISO start time listed by get_available_slots (other times are refused). Shows a confirmation card; the booking only happens when the visitor confirms. Requires a verified email.",
  propose_quote_email:
    "Propose emailing a quote (by quote id) as a PDF to the visitor's verified email. Shows a confirmation card.",
  propose_payment:
    "Propose issuing an invoice with a secure payment link for a quote. Purpose: 'deposit' (default) or 'full' only while nothing has been invoiced on the quote; once anything has, 'balance' (the total less earlier invoices). The server computes the amount and refuses anything already covered. Shows a confirmation card.",
  show_quick_replies:
    "Offer 2-4 short tappable reply suggestions under your message (e.g. answer options to your question). Use sparingly.",
  handoff_to_human:
    "Notify the developer to follow up personally (complex/enterprise work, budgets above R150k / $8k, legal or compliance questions, or a frustrated visitor).",
};

/** Hand-written JSON Schemas (kept in sync with the Zod validators above). */
const INPUT_SCHEMAS: Record<ToolName, Anthropic.Beta.BetaTool.InputSchema> = {
  recommend_services: {
    type: "object",
    properties: {
      slugs: { type: "array", items: { type: "string", enum: SLUGS }, minItems: 1, maxItems: 4 },
      reason: { type: "string", maxLength: 400, description: "One sentence on why these fit." },
    },
    required: ["slugs", "reason"],
  },
  save_brief: {
    type: "object",
    properties: {
      summary: {
        type: "string",
        minLength: 1,
        maxLength: 2000,
        description: "Full current project summary, written for the developer (max 2000 characters).",
      },
      service_slugs: { type: "array", items: { type: "string", enum: SLUGS }, maxItems: 6 },
      budget: { type: "string", maxLength: 200 },
      timeline: { type: "string", maxLength: 200 },
    },
    required: ["summary", "service_slugs"],
  },
  request_contact_details: {
    type: "object",
    properties: {
      reason: { type: "string", maxLength: 200, description: "Shown on the form, e.g. 'so I can send your quote'." },
    },
    required: ["reason"],
  },
  create_quote: {
    type: "object",
    properties: {
      selections: {
        type: "array",
        items: {
          type: "object",
          properties: {
            service_slug: { type: "string", enum: SLUGS },
            package_name: {
              type: "string",
              maxLength: 80,
              description: "Exact package name from the catalogue; omit for the entry package.",
            },
          },
          required: ["service_slug"],
        },
        minItems: 1,
        maxItems: 4,
      },
      extras: {
        type: "array",
        description: "Scope beyond the chosen packages, each sized small/medium/large.",
        items: {
          type: "object",
          properties: {
            label: { type: "string", minLength: 1, maxLength: 120 },
            size: { type: "string", enum: ["small", "medium", "large"] },
          },
          required: ["label", "size"],
        },
        maxItems: 8,
      },
      currency: { type: "string", enum: ["ZAR", "USD"] },
      rush: { type: "boolean", description: "Visitor needs priority scheduling (+20%)." },
    },
    required: ["selections", "currency"],
  },
  get_available_slots: {
    type: "object",
    properties: {
      days: { type: "integer", minimum: 1, maximum: 14 },
      timezone: { type: "string", maxLength: 64, description: "IANA time zone of the visitor, e.g. Europe/London." },
    },
  },
  propose_booking: {
    type: "object",
    properties: {
      start: { type: "string", maxLength: 40, description: "ISO start time exactly as listed by get_available_slots." },
      timezone: { type: "string", maxLength: 64 },
      agenda: { type: "string", maxLength: 500 },
    },
    required: ["start", "timezone"],
  },
  propose_quote_email: {
    type: "object",
    properties: { quote_id: { type: "string", maxLength: 64 } },
    required: ["quote_id"],
  },
  propose_payment: {
    type: "object",
    properties: {
      quote_id: { type: "string", maxLength: 64 },
      purpose: { type: "string", enum: ["deposit", "balance", "full"] },
    },
    required: ["quote_id", "purpose"],
  },
  show_quick_replies: {
    type: "object",
    properties: {
      options: { type: "array", items: { type: "string", minLength: 1, maxLength: 60 }, minItems: 2, maxItems: 4 },
    },
    required: ["options"],
  },
  handoff_to_human: {
    type: "object",
    properties: { reason: { type: "string", maxLength: 500 } },
    required: ["reason"],
  },
};

export const TOOLS: Anthropic.Beta.BetaTool[] = (Object.keys(schemas) as ToolName[]).map((name) => ({
  name,
  description: DESCRIPTIONS[name],
  input_schema: INPUT_SCHEMAS[name],
  eager_input_streaming: true,
}));

export function isToolName(name: string): name is ToolName {
  return name in schemas;
}

export interface ToolContext {
  sessionId: string;
  timezone: string;
}

/** Validates model input against the tool's Zod schema, then runs it. */
export async function runTool(name: string, rawInput: unknown, ctx: ToolContext): Promise<ActionResult & { isError?: boolean }> {
  if (!isToolName(name)) return { text: `Unknown tool ${name}.`, cards: [], isError: true };
  const parsed = schemas[name].safeParse(rawInput);
  if (!parsed.success) {
    return { text: `Invalid input: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`, cards: [], isError: true };
  }
  try {
    return await execute(name, parsed.data, ctx);
  } catch (err) {
    if (err instanceof ActionError || err instanceof QuoteError) return { text: err.message, cards: [], isError: true };
    console.error(`[chat] tool ${name} failed`, err);
    return { text: "That step failed on our side. Apologise briefly and offer another route (email or a call).", cards: [], isError: true };
  }
}

async function execute(name: ToolName, input: unknown, ctx: ToolContext): Promise<ActionResult> {
  const { sessionId } = ctx;
  switch (name) {
    case "recommend_services": {
      const i = input as z.infer<typeof schemas.recommend_services>;
      return recommendServices(i.slugs);
    }
    case "save_brief": {
      const i = input as z.infer<typeof schemas.save_brief>;
      return updateBrief(sessionId, { summary: i.summary, serviceSlugs: i.service_slugs, budget: i.budget, timeline: i.timeline });
    }
    case "request_contact_details": {
      const i = input as z.infer<typeof schemas.request_contact_details>;
      return requestContact(i.reason, await ensureLead(sessionId));
    }
    case "create_quote": {
      const i = input as z.infer<typeof schemas.create_quote>;
      return createQuote(sessionId, {
        selections: i.selections.map((s) => ({ serviceSlug: s.service_slug, packageName: s.package_name })),
        extras: i.extras,
        currency: i.currency,
        rush: i.rush,
      });
    }
    case "get_available_slots": {
      const i = input as z.infer<typeof schemas.get_available_slots>;
      return listSlots(i.timezone ?? ctx.timezone, i.days);
    }
    case "propose_booking": {
      const i = input as z.infer<typeof schemas.propose_booking>;
      return proposeBooking(sessionId, i.start, i.timezone || ctx.timezone, i.agenda);
    }
    case "propose_quote_email": {
      const i = input as z.infer<typeof schemas.propose_quote_email>;
      return proposeQuoteEmail(sessionId, i.quote_id);
    }
    case "propose_payment": {
      const i = input as z.infer<typeof schemas.propose_payment>;
      return proposeInvoice(sessionId, i.quote_id, i.purpose);
    }
    case "show_quick_replies": {
      const i = input as z.infer<typeof schemas.show_quick_replies>;
      return { text: "Quick replies shown.", cards: [{ kind: "quick_replies", options: i.options }] };
    }
    case "handoff_to_human": {
      const i = input as z.infer<typeof schemas.handoff_to_human>;
      return requestHandoff(sessionId, i.reason);
    }
  }
}
