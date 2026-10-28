import "server-only";

import { PDFDocument, PDFString, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import type { Currency, QuoteLine } from "@/lib/chat/types";
import type { InvoiceRecord, Lead, QuoteRecord } from "@/lib/integrations/types";
import {
  BRAND,
  WORDMARK,
  business,
  chargedNote,
  invoiceTitle,
  money,
  purposeLabel,
  shortDate,
  totalsFor,
  vatStatement,
  VAT_RATE,
} from "./shared";

/**
 * Quote and invoice PDFs (pdf-lib, standard Helvetica). Print-friendly A4 on
 * white with a dark brand header band. Helvetica only encodes WinAnsi, so
 * every string goes through a sanitiser before it is measured or drawn.
 */

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 48;
const RIGHT = PAGE_W - MARGIN;
const WIDTH = RIGHT - MARGIN;
const BAND_H = 118;
const SLIM_BAND_H = 44;
/** Content never goes below this line (the footer lives underneath). */
const BOTTOM = 76;

const toRgb = (hex: string) =>
  rgb(parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255);
const C = Object.fromEntries(Object.entries(BRAND).map(([k, v]) => [k, toRgb(v)])) as Record<keyof typeof BRAND, RGB>;
const WHITE = rgb(1, 1, 1);

/** Common characters outside WinAnsi, mapped to close equivalents. */
const REPLACEMENTS: Record<string, string> = {
  "≈": "~", // ≈
  "→": "->",
  "←": "<-",
  "↔": "<->",
  "⇒": "=>",
  "−": "-", // minus sign
  "‐": "-",
  "‑": "-",
  "≤": "<=",
  "≥": ">=",
  "≠": "!=",
  "✓": "v",
  "✔": "v",
  "✗": "x",
  "★": "*",
  " ": " ", // narrow no-break space (some Intl formats)
  " ": " ",
  " ": " ",
  " ": " ",
  " ": " ",
  " ": " ",
  " ": "\n",
  " ": "\n",
};
const INVISIBLE = /[​-‍⁠︎️]|\p{Extended_Pictographic}|\p{Emoji_Modifier}/u;

function sanitiser(font: PDFFont) {
  const supported = new Set(font.getCharacterSet());
  const ok = (s: string) => [...s].every((c) => supported.has(c.codePointAt(0)!));
  return (input: string): string => {
    let out = "";
    for (const ch of input.replace(/\r\n?/g, "\n").normalize("NFC")) {
      if (ch === "\n") out += ch;
      else if (ch === "\t") out += " ";
      else if (supported.has(ch.codePointAt(0)!)) out += ch;
      else if (REPLACEMENTS[ch] !== undefined) out += REPLACEMENTS[ch];
      else if (INVISIBLE.test(ch) || ch.codePointAt(0)! < 32) continue;
      else {
        const base = ch.normalize("NFKD").replace(/\p{M}/gu, "");
        out += base && ok(base) ? base : "?";
      }
    }
    return out;
  };
}

/* ------------------------------------------------------------------ */
/* Document model                                                      */
/* ------------------------------------------------------------------ */

interface Section {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  link?: string;
}

interface DocSpec {
  title: string;
  number: string;
  createdAt: string;
  status?: { label: string; tone: "accent" | "muted" };
  meta: [string, string][];
  clientHeading: string;
  lead: Lead;
  currency: Currency;
  lines: QuoteLine[];
  totals: { label: string; value: string; strong?: boolean }[];
  notes: string[];
  sections: Section[];
}

interface TextOpts {
  size?: number;
  font?: PDFFont;
  color?: RGB;
}

class Writer {
  private page!: PDFPage;
  private readonly pages: PDFPage[] = [];
  /** Top edge of the next block on the current page. */
  y = 0;

  constructor(
    private readonly pdf: PDFDocument,
    readonly regular: PDFFont,
    readonly bold: PDFFont,
    private readonly spec: DocSpec,
    readonly clean = sanitiser(regular),
  ) {
    this.addPage();
  }

  private addPage() {
    this.page = this.pdf.addPage([PAGE_W, PAGE_H]);
    this.pages.push(this.page);
    if (this.pages.length === 1) this.drawHeader();
    else this.drawSlimHeader();
  }

  /** Starts a new page if `height` points don't fit; returns true when it did. */
  ensure(height: number): boolean {
    if (this.y - height >= BOTTOM) return false;
    this.addPage();
    return true;
  }

  width(s: string, size: number, font = this.regular) {
    return font.widthOfTextAtSize(this.clean(s), size);
  }

  text(s: string, x: number, baseline: number, { size = 10, font = this.regular, color = C.text }: TextOpts = {}) {
    this.page.drawText(this.clean(s), { x, y: baseline, size, font, color });
  }

  textRight(s: string, right: number, baseline: number, opts: TextOpts = {}) {
    this.text(s, right - this.width(s, opts.size ?? 10, opts.font), baseline, opts);
  }

  rect(x: number, y: number, width: number, height: number, color: RGB) {
    this.page.drawRectangle({ x, y, width, height, color });
  }

  rule(y: number, from = MARGIN, to = RIGHT, thickness = 0.6, color = C.line) {
    this.page.drawLine({ start: { x: from, y }, end: { x: to, y }, thickness, color });
  }

  link(url: string, x: number, y: number, width: number, height: number) {
    if (!/^https?:\/\//i.test(url)) return;
    const annot = this.pdf.context.obj({
      Type: "Annot",
      Subtype: "Link",
      Rect: [x, y, x + width, y + height],
      Border: [0, 0, 0],
      A: { Type: "Action", S: "URI", URI: PDFString.of(url) },
    });
    this.page.node.addAnnot(this.pdf.context.register(annot));
  }

  /** Greedy word wrap; words wider than the line (URLs) are broken by character. */
  wrap(s: string, maxWidth: number, size: number, font = this.regular): string[] {
    const out: string[] = [];
    const fits = (t: string) => font.widthOfTextAtSize(t, size) <= maxWidth;
    for (const para of this.clean(s).split("\n")) {
      const words = para.split(" ").filter(Boolean);
      let line = "";
      for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        if (fits(candidate)) {
          line = candidate;
          continue;
        }
        if (line) out.push(line);
        let rest = word;
        while (!fits(rest)) {
          let cut = rest.length - 1;
          while (cut > 1 && !fits(rest.slice(0, cut))) cut--;
          out.push(rest.slice(0, cut));
          rest = rest.slice(cut);
        }
        line = rest;
      }
      out.push(line);
    }
    return out;
  }

  /** Wrapped text block at `x`, flowing onto new pages as needed. */
  block(s: string, x: number, maxWidth: number, opts: TextOpts & { leading?: number } = {}) {
    const size = opts.size ?? 10;
    const leading = opts.leading ?? size * 1.45;
    for (const line of this.wrap(s, maxWidth, size, opts.font)) {
      this.ensure(leading);
      this.text(line, x, this.y - size, opts);
      this.y -= leading;
    }
  }

  private drawWordmark(x: number, baseline: number, size: number) {
    const [name, tld] = [WORDMARK.slice(0, WORDMARK.indexOf(".")), WORDMARK.slice(WORDMARK.indexOf("."))];
    this.text(name, x, baseline, { size, font: this.bold, color: WHITE });
    this.text(tld, x + this.width(name, size, this.bold), baseline, { size, font: this.bold, color: C.accent });
  }

  private drawHeader() {
    const { title, number, status } = this.spec;
    this.rect(0, PAGE_H - BAND_H, PAGE_W, BAND_H, C.ink);
    this.rect(0, PAGE_H - BAND_H - 3, PAGE_W, 3, C.accent);
    this.drawWordmark(MARGIN, PAGE_H - 56, 22);
    this.text("Full-stack web development", MARGIN, PAGE_H - 76, { size: 9, color: C.bandMuted });
    this.textRight(title.toUpperCase(), RIGHT, PAGE_H - 56, { size: 22, font: this.bold, color: C.accent });
    this.textRight(number, RIGHT, PAGE_H - 76, { size: 11, font: this.bold, color: WHITE });
    if (status) {
      const size = 8.5;
      const w = this.width(status.label, size, this.bold) + 16;
      const fill = status.tone === "accent" ? C.accent : C.bandMuted;
      this.page.drawRectangle({ x: RIGHT - w, y: PAGE_H - 103, width: w, height: 17, color: fill });
      this.text(status.label, RIGHT - w + 8, PAGE_H - 97, { size, font: this.bold, color: C.ink });
    }
    this.y = PAGE_H - BAND_H - 3 - 30;
  }

  private drawSlimHeader() {
    this.rect(0, PAGE_H - SLIM_BAND_H, PAGE_W, SLIM_BAND_H, C.ink);
    this.rect(0, PAGE_H - SLIM_BAND_H - 2, PAGE_W, 2, C.accent);
    this.drawWordmark(MARGIN, PAGE_H - 27, 13);
    this.textRight(`${this.spec.title} ${this.spec.number} (continued)`, RIGHT, PAGE_H - 27, { size: 9, color: WHITE });
    this.y = PAGE_H - SLIM_BAND_H - 2 - 26;
  }

  /** Footer with seller identity and page numbers, drawn once all pages exist. */
  drawFooters() {
    const b = business();
    const left = [b.name, b.status, b.address].join("  ·  ");
    const second = [b.email, WORDMARK].filter(Boolean).join("  ·  ");
    this.pages.forEach((page, i) => {
      this.page = page;
      this.rule(54);
      this.text(left, MARGIN, 40, { size: 7.5, color: C.muted });
      this.text(second, MARGIN, 29, { size: 7.5, color: C.muted });
      this.textRight(`Page ${i + 1} of ${this.pages.length}`, RIGHT, 40, { size: 7.5, color: C.muted });
    });
  }
}

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

function drawParties(w: Writer, spec: DocSpec) {
  const b = business();
  const top = w.y;
  const colW = 160;
  const cols = [MARGIN, MARGIN + 176];
  const metaX = MARGIN + 352;

  const column = (x: number, heading: string, rows: { text: string; bold?: boolean }[]) => {
    w.y = top;
    w.text(heading.toUpperCase(), x, w.y - 8, { size: 7.5, font: w.bold, color: C.muted });
    w.y -= 18;
    for (const r of rows) w.block(r.text, x, colW, { size: 9.5, font: r.bold ? w.bold : w.regular, leading: 13.5 });
    return w.y;
  };

  const c = spec.lead.contact;
  const ends = [
    column(cols[0], "From", [
      { text: b.name, bold: true },
      { text: b.status },
      { text: b.address },
      ...(b.email ? [{ text: b.email }] : []),
      ...(b.vatNumber ? [{ text: `VAT no. ${b.vatNumber}` }] : []),
    ]),
    column(cols[1], spec.clientHeading, [
      { text: c?.name ?? "Client", bold: true },
      ...(c?.company ? [{ text: c.company }] : []),
      ...(c?.email ? [{ text: c.email }] : []),
    ]),
  ];

  w.y = top;
  for (const [label, value] of spec.meta) {
    w.text(label, metaX, w.y - 9, { size: 8.5, color: C.muted });
    w.textRight(value, RIGHT, w.y - 9, { size: 9, font: w.bold });
    w.y -= 15;
  }
  w.y = Math.min(w.y, ...ends) - 22;
}

function drawLines(w: Writer, spec: DocSpec) {
  const amountCol = 130;
  const descW = WIDTH - amountCol - 20;
  const header = () => {
    w.rect(MARGIN, w.y - 22, WIDTH, 22, C.panel);
    w.text("DESCRIPTION", MARGIN + 10, w.y - 14.5, { size: 7.5, font: w.bold, color: C.muted });
    w.textRight(`AMOUNT (${spec.currency})`, RIGHT - 10, w.y - 14.5, { size: 7.5, font: w.bold, color: C.muted });
    w.y -= 22;
  };
  w.ensure(60);
  header();
  for (const line of spec.lines) {
    const rows = w.wrap(line.label, descW, 9.5);
    const height = rows.length * 13 + 14;
    if (w.ensure(height)) header();
    rows.forEach((r, i) => w.text(r, MARGIN + 10, w.y - 16 - i * 13, { size: 9.5 }));
    w.textRight(money(line.amount, spec.currency), RIGHT - 10, w.y - 16, { size: 9.5 });
    w.y -= height;
    w.rule(w.y);
  }
  w.y -= 10;
}

function drawTotals(w: Writer, spec: DocSpec) {
  const left = RIGHT - 250;
  w.ensure(spec.totals.length * 20 + 20);
  for (const t of spec.totals) {
    if (t.strong) {
      w.y -= 4;
      w.rule(w.y, left, RIGHT, 1, C.text);
      w.y -= 6;
      w.text(t.label, left, w.y - 13, { size: 11, font: w.bold });
      w.textRight(t.value, RIGHT - 10, w.y - 13, { size: 12, font: w.bold, color: C.ink });
      w.y -= 22;
    } else {
      w.text(t.label, left, w.y - 11, { size: 9, color: C.muted });
      w.textRight(t.value, RIGHT - 10, w.y - 11, { size: 9.5 });
      w.y -= 18;
    }
  }
  w.y -= 6;
  for (const note of spec.notes) w.block(note, MARGIN, WIDTH, { size: 8.5, color: C.muted, leading: 12.5 });
  w.y -= 14;
}

function drawSections(w: Writer, spec: DocSpec) {
  for (const s of spec.sections) {
    // Keep a heading with at least its first two lines.
    w.ensure(52);
    w.rect(MARGIN, w.y - 9.5, 4, 9, C.accentInk);
    w.text(s.heading, MARGIN + 11, w.y - 9.5, { size: 10.5, font: w.bold, color: C.ink });
    w.y -= 20;
    for (const p of s.paragraphs ?? []) {
      w.block(p, MARGIN, WIDTH, { size: 9.5, color: C.text, leading: 13.5 });
      w.y -= 4;
    }
    for (const bullet of s.bullets ?? []) {
      const rows = w.wrap(bullet, WIDTH - 14, 9.5);
      rows.forEach((r, i) => {
        w.ensure(13.5);
        if (i === 0) w.text("•", MARGIN + 2, w.y - 9.5, { size: 9.5, color: C.accentInk });
        w.text(r, MARGIN + 14, w.y - 9.5, { size: 9.5 });
        w.y -= 13.5;
      });
    }
    if (s.link) {
      for (const r of w.wrap(s.link, WIDTH, 9.5)) {
        w.ensure(14);
        w.text(r, MARGIN, w.y - 9.5, { size: 9.5, color: C.accentInk });
        w.link(s.link, MARGIN, w.y - 12, w.width(r, 9.5), 14);
        w.y -= 14;
      }
    }
    w.y -= 14;
  }
}

async function render(spec: DocSpec): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const [regular, bold] = await Promise.all([pdf.embedFont(StandardFonts.Helvetica), pdf.embedFont(StandardFonts.HelveticaBold)]);
  const b = business();
  pdf.setTitle(`${spec.title} ${spec.number}`);
  pdf.setAuthor(b.name);
  pdf.setSubject(`${spec.title} ${spec.number} for ${spec.lead.contact?.name ?? "client"}`);
  pdf.setCreator(WORDMARK);
  pdf.setProducer(WORDMARK);
  const created = new Date(spec.createdAt);
  if (!Number.isNaN(created.getTime())) pdf.setCreationDate(created);

  const w = new Writer(pdf, regular, bold, spec);
  drawParties(w, spec);
  drawLines(w, spec);
  drawTotals(w, spec);
  drawSections(w, spec);
  w.drawFooters();
  return pdf.save();
}

/* ------------------------------------------------------------------ */
/* Specs                                                               */
/* ------------------------------------------------------------------ */

function totalRows(lines: QuoteLine[], amount: number, currency: Currency, totalLabel: string) {
  const t = totalsFor(lines, amount, currency);
  const rounding = Math.round((t.subtotal - t.linesTotal) * 100) / 100;
  const rows: DocSpec["totals"] = [];
  if (t.vatApplies || rounding !== 0) rows.push({ label: "Subtotal", value: money(t.linesTotal, currency) });
  if (rounding !== 0) rows.push({ label: "Rounding", value: money(rounding, currency) });
  if (t.vatApplies) rows.push({ label: `VAT (${VAT_RATE * 100}%)`, value: money(t.vat, currency) });
  rows.push({ label: totalLabel, value: money(t.total, currency), strong: true });
  return { rows, totals: t };
}

const providerLabel = (p?: string) => (p === "paystack" ? "Paystack" : p === "mock" ? "demo checkout" : p);

export function renderQuotePdf(quote: QuoteRecord, lead: Lead): Promise<Uint8Array> {
  const { rows, totals } = totalRows(quote.lines, quote.total, quote.currency, "Total");
  const depositExVat = Math.round((quote.total * quote.depositPercent) / 100);
  const deposit = totals.vatApplies ? Math.round(depositExVat * (1 + VAT_RATE) * 100) / 100 : depositExVat;
  rows.push({ label: `Deposit to start (${quote.depositPercent}%)`, value: money(deposit, quote.currency) });
  const expired = quote.status === "expired" || new Date(quote.validUntil).getTime() < Date.now();
  const b = business();

  return render({
    title: "Quote",
    number: quote.number,
    createdAt: quote.createdAt,
    status: expired ? { label: "EXPIRED", tone: "muted" } : quote.status === "accepted" ? { label: "ACCEPTED", tone: "accent" } : undefined,
    meta: [
      ["Quote no.", quote.number],
      ["Date", shortDate(quote.createdAt)],
      ["Valid until", shortDate(quote.validUntil)],
      ["Currency", quote.currency],
    ],
    clientHeading: "Prepared for",
    lead,
    currency: quote.currency,
    lines: quote.lines,
    totals: rows,
    notes: [vatStatement()],
    sections: [
      { heading: "Timeline", paragraphs: [`Estimated delivery: ${quote.timeline}, scheduled once the deposit is received.`] },
      ...(quote.assumptions.length ? [{ heading: "Scope & assumptions", bullets: quote.assumptions }] : []),
      {
        heading: "Next steps",
        paragraphs: [
          `This quote is valid until ${shortDate(quote.validUntil)}. To go ahead, continue in the chat on ${WORDMARK} or reply to the email this quote came with.`,
          `A ${quote.depositPercent}% deposit invoice secures your start date; the balance is invoiced on completion.`,
          ...(b.email ? [`Questions? Email ${b.email}.`] : []),
        ],
      },
    ],
  });
}

export function renderInvoicePdf(invoice: InvoiceRecord, lead: Lead): Promise<Uint8Array> {
  const open = invoice.status === "open";
  const { rows } = totalRows(invoice.lines, invoice.total, invoice.currency, open ? "Total due" : "Total");
  const charged = chargedNote(invoice);
  const ref = invoice.payment?.reference ?? invoice.number;
  const b = business();

  const sections: Section[] = [];
  if (open && invoice.payment?.url) {
    sections.push({
      heading: "How to pay",
      paragraphs: [
        `Pay securely online using the link below. Payment is due by ${shortDate(invoice.dueDate)}.`,
        ...(charged ? [`${charged}: your card is charged in South African rand.`] : []),
      ],
      link: invoice.payment.url,
    });
    sections.push({ heading: "Reference", paragraphs: [`Please quote ${ref} on any payment or correspondence.`] });
  } else if (open) {
    sections.push({ heading: "How to pay", paragraphs: [`Payment is due by ${shortDate(invoice.dueDate)}. Please quote ${ref}.`] });
  } else if (invoice.status === "paid") {
    const via = providerLabel(invoice.payment?.provider);
    sections.push({
      heading: "Payment received",
      paragraphs: [
        `Paid${invoice.paidAt ? ` on ${shortDate(invoice.paidAt)}` : ""}${via ? ` via ${via}` : ""}, reference ${ref}. Thank you!`,
      ],
    });
  } else {
    sections.push({ heading: "Cancelled", paragraphs: ["This invoice has been voided and is not payable."] });
  }
  if (b.email) sections.push({ heading: "Questions?", paragraphs: [`Email ${b.email} and quote ${invoice.number}.`] });

  return render({
    title: invoiceTitle(),
    number: invoice.number,
    createdAt: invoice.createdAt,
    status:
      invoice.status === "paid"
        ? { label: "PAID", tone: "accent" }
        : invoice.status === "void"
          ? { label: "VOID", tone: "muted" }
          : undefined,
    meta: [
      ["Invoice no.", invoice.number],
      ["Issue date", shortDate(invoice.createdAt)],
      ["Due date", shortDate(invoice.dueDate)],
      ["For", purposeLabel(invoice.purpose)],
      ["Status", invoice.status === "paid" ? "Paid" : invoice.status === "void" ? "Void" : "Open"],
    ],
    clientHeading: "Bill to",
    lead,
    currency: invoice.currency,
    lines: invoice.lines,
    totals: rows,
    // Open invoices explain the rand charge under "How to pay" instead.
    notes: [vatStatement(), ...(charged && !(open && invoice.payment?.url) ? [charged] : [])],
    sections,
  });
}
