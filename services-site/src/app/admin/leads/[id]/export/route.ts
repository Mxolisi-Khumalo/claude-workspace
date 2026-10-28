import type { NextRequest } from "next/server";
import { getStore } from "@/lib/integrations";
import { adminMode } from "../../../auth";
import { isAdminRequest } from "../../../guard";
import { toTranscript } from "../../../transcript";

/**
 * POPIA access request export: everything held about one lead as JSON.
 * Internal security data (the verification code hash) is left out.
 */
export async function GET(_req: NextRequest, ctx: RouteContext<"/admin/leads/[id]/export">) {
  if (!(await isAdminRequest())) {
    return new Response(adminMode() === "disabled" ? "Not found" : "Unauthorized", {
      status: adminMode() === "disabled" ? 404 : 401,
    });
  }

  const { id } = await ctx.params;
  const store = getStore();
  const lead = await store.getLead(id);
  if (!lead) return new Response("Not found", { status: 404 });

  const [quotes, invoices, bookings, conversation] = await Promise.all([
    store.listQuotes(lead.id),
    store.listInvoices(lead.id),
    store.listBookings(lead.id),
    store.getConversation(lead.sessionId),
  ]);

  const body = {
    exportedAt: new Date().toISOString(),
    lead: { ...lead, verification: undefined },
    quotes,
    invoices,
    bookings,
    conversation: conversation && {
      sessionId: conversation.sessionId,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      privacyAckAt: conversation.privacyAckAt,
      transcript: toTranscript(conversation.messages).map(({ role, text, tools }) => ({ role, text, tools })),
    },
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="lead-${lead.id.replace(/[^A-Za-z0-9_-]/g, "")}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
