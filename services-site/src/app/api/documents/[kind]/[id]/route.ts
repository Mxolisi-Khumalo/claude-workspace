import type { NextRequest } from "next/server";
import { renderInvoicePdf, renderQuotePdf, verifyDocumentToken } from "@/lib/documents";
import { getStore } from "@/lib/integrations";

const ID = /^[A-Za-z0-9_-]{1,64}$/;

/** One response for every failure so callers can't tell which check failed. */
const notFound = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

function tokenValid(kind: "quote" | "invoice", id: string, token: string) {
  try {
    return verifyDocumentToken(kind, id, token);
  } catch {
    return false;
  }
}

/**
 * Quote / invoice PDFs behind signed links (`documentUrl`). The document is
 * regenerated from the stored record on every request; nothing is cached.
 */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/documents/[kind]/[id]">) {
  const { kind, id } = await ctx.params;
  const token = req.nextUrl.searchParams.get("token") ?? "";
  if ((kind !== "quote" && kind !== "invoice") || !ID.test(id) || !token || token.length > 256) return notFound();
  if (!tokenValid(kind, id, token)) return notFound();

  const store = getStore();
  let number: string;
  let pdf: Uint8Array;
  if (kind === "quote") {
    const quote = await store.getQuote(id);
    const lead = quote && (await store.getLead(quote.leadId));
    if (!quote || !lead) return notFound();
    number = quote.number;
    pdf = await renderQuotePdf(quote, lead);
  } else {
    const invoice = await store.getInvoice(id);
    const lead = invoice && (await store.getLead(invoice.leadId));
    if (!invoice || !lead) return notFound();
    number = invoice.number;
    pdf = await renderInvoicePdf(invoice, lead);
  }

  const filename = `${number.replace(/[^A-Za-z0-9._-]/g, "-")}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Content-Length": String(pdf.byteLength),
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
