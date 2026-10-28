import "server-only";

import type { Currency, QuoteLine } from "@/lib/chat/types";
import type { InvoiceRecord } from "@/lib/integrations/types";

/** Brand palette shared by the PDFs and emails. */
export const BRAND = {
  ink: "#07080b",
  accent: "#7ee787",
  /** Accent dark enough for text and links on white. */
  accentInk: "#1a7f37",
  text: "#1f2328",
  muted: "#59636e",
  line: "#e6e8eb",
  panel: "#f6f8fa",
  canvas: "#eef0f3",
  bandMuted: "#9aa4b2",
} as const;

export const WORDMARK = "mxolisi.dev";
export const VAT_RATE = 0.15;

export const ownerTimeZone = () => process.env.OWNER_TIMEZONE || "Africa/Johannesburg";

/** Seller identity printed on documents and email footers (ECTA s43). */
export function business() {
  const vatRegistered = process.env.VAT_REGISTERED === "true";
  return {
    name: process.env.BUSINESS_LEGAL_NAME || "Mxolisi Khumalo",
    status: "Sole proprietor",
    address: process.env.BUSINESS_ADDRESS || "Johannesburg, South Africa",
    email: process.env.OWNER_EMAIL || undefined,
    vatRegistered,
    vatNumber: vatRegistered ? process.env.VAT_NUMBER || undefined : undefined,
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** R 21 960,00 / $1,200.00 — documents always show cents. */
export function money(amount: number, currency: Currency | string) {
  const cur = currency === "USD" ? "USD" : "ZAR";
  return new Intl.NumberFormat(cur === "ZAR" ? "en-ZA" : "en-US", {
    style: "currency",
    currency: cur,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Exchange rate label, e.g. "R 18,25/USD". */
export const rateLabel = (rate: number) =>
  `${new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(rate)}/USD`;

/** 29 Oct 2026, in the owner's time zone. */
export function shortDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-ZA", { timeZone: ownerTimeZone(), day: "numeric", month: "short", year: "numeric" }).format(d);
}

export interface Totals {
  /** Sum of the line items as printed. */
  linesTotal: number;
  /** Record total, ex VAT (what the pricing engine produced). */
  subtotal: number;
  vat: number;
  total: number;
  vatApplies: boolean;
}

/** VAT is added on top of ZAR amounts only, and only once VAT_REGISTERED=true. */
export function totalsFor(lines: QuoteLine[], subtotal: number, currency: Currency): Totals {
  const vatApplies = business().vatRegistered && currency === "ZAR";
  const vat = vatApplies ? round2(subtotal * VAT_RATE) : 0;
  return {
    linesTotal: round2(lines.reduce((s, l) => s + l.amount, 0)),
    subtotal,
    vat,
    total: round2(subtotal + vat),
    vatApplies,
  };
}

export const vatStatement = () =>
  business().vatRegistered ? `VAT registration number: ${business().vatNumber ?? "(not set)"}` : "Not a VAT vendor — no VAT charged";

export const invoiceTitle = () => (business().vatRegistered ? "Tax Invoice" : "Invoice");

export const purposeLabel = (p: InvoiceRecord["purpose"]) => (p === "deposit" ? "Deposit" : "Payment in full");

export function chargedNote(invoice: InvoiceRecord): string | null {
  const c = invoice.payment?.charged;
  return c ? `Charged as ${money(c.amount, c.currency)} at ${rateLabel(c.rate)}` : null;
}
