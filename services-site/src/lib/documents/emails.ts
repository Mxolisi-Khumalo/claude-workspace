import "server-only";

import type { EmailMessage, InvoiceRecord, Lead, QuoteRecord } from "@/lib/integrations/types";
import { siteUrl } from "@/lib/integrations/env";
import {
  BRAND,
  WORDMARK,
  business,
  chargedNote,
  invoiceTitle,
  money,
  ownerTimeZone,
  purposeLabel,
  shortDate,
  totalsFor,
  vatStatement,
  VAT_RATE,
} from "./shared";

/**
 * Transactional email templates. Client emails are fixed templates: the only
 * variable fields are names, numbers, dates, amounts and links, so the
 * concierge can never be used to send arbitrary text. The owner notification
 * may include the lead summary because it only ever goes to OWNER_EMAIL.
 * Everything is HTML-escaped; layout is table-based for Gmail and Outlook.
 */

export type Email = Omit<EmailMessage, "to" | "attachments">;

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace";

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Only http(s) and mailto links are ever rendered. */
const safeUrl = (url: string) => (/^(https?:\/\/|mailto:)/i.test(url) ? url : siteUrl());

/** Single-line, length-capped header value. */
const oneLine = (s: string, max = 150) =>
  [...s]
    .map((ch) => (ch.charCodeAt(0) < 32 || ch.charCodeAt(0) === 127 ? " " : ch))
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

const firstName = (lead: Lead) => oneLine(lead.contact?.name ?? "", 60).split(" ")[0] || "there";

interface Layout {
  subject: string;
  preheader: string;
  heading: string;
  /** Plain-text paragraphs (escaped when rendered). */
  intro: string[];
  rows?: [string, string][];
  /** Large monospace code (verification email). */
  code?: string;
  cta?: { label: string; url: string };
  outro?: string[];
  /** Free text shown in a quoted panel (owner notifications only). */
  quote?: { label: string; text: string };
  audience: "client" | "owner";
}

function render(l: Layout): Email {
  const b = business();
  const site = siteUrl();
  const privacy = `${site}/privacy`;
  const p = (t: string) => `<p style="margin:0 0 16px;">${escapeHtml(t)}</p>`;

  const rowsHtml = l.rows?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:4px 0 24px;">${l.rows
        .map(
          ([k, v]) =>
            `<tr><td valign="top" style="padding:10px 12px 10px 0;border-bottom:1px solid ${BRAND.line};color:${BRAND.muted};font-size:14px;white-space:nowrap;">${escapeHtml(k)}</td><td valign="top" align="right" style="padding:10px 0;border-bottom:1px solid ${BRAND.line};color:${BRAND.text};font-size:14px;font-weight:600;word-break:break-word;">${
              /^https?:\/\//i.test(v)
                ? `<a href="${escapeHtml(safeUrl(v))}" style="color:${BRAND.accentInk};text-decoration:underline;">${escapeHtml(v)}</a>`
                : escapeHtml(v)
            }</td></tr>`,
        )
        .join("")}</table>`
    : "";

  const codeHtml = l.code
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;"><tr><td style="background:${BRAND.panel};border:1px solid ${BRAND.line};border-radius:10px;padding:16px 28px;font-family:${MONO};font-size:32px;font-weight:700;letter-spacing:8px;color:${BRAND.ink};">${escapeHtml(l.code)}</td></tr></table>`
    : "";

  const ctaHtml = l.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px;"><tr><td align="center" bgcolor="${BRAND.accent}" style="border-radius:8px;background:${BRAND.accent};"><a href="${escapeHtml(safeUrl(l.cta.url))}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:15px;font-weight:700;line-height:1;color:${BRAND.ink};text-decoration:none;border-radius:8px;">${escapeHtml(l.cta.label)}</a></td></tr></table>
<p style="margin:0 0 20px;font-size:12px;line-height:1.5;color:${BRAND.muted};">Button not working? Copy this link:<br><a href="${escapeHtml(safeUrl(l.cta.url))}" style="color:${BRAND.accentInk};word-break:break-all;">${escapeHtml(l.cta.url)}</a></p>`
    : "";

  const quoteHtml = l.quote
    ? `<p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${BRAND.muted};">${escapeHtml(l.quote.label)}</p><div style="margin:0 0 24px;padding:14px 16px;background:${BRAND.panel};border-left:3px solid ${BRAND.accentInk};font-size:14px;line-height:1.55;color:${BRAND.text};">${escapeHtml(l.quote.text).replace(/\n/g, "<br>")}</div>`
    : "";

  const reason =
    l.audience === "client"
      ? `You are receiving this because you requested it on ${WORDMARK}.`
      : `Internal notification from the ${WORDMARK} concierge.`;
  const identity = [b.name, b.status, b.address].map(escapeHtml).join(" &middot; ");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(l.subject)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.canvas};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(l.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.canvas};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;">
<tr><td bgcolor="${BRAND.ink}" style="background:${BRAND.ink};padding:22px 32px;font-family:${FONT};font-size:20px;font-weight:700;letter-spacing:-0.3px;color:#ffffff;">mxolisi<span style="color:${BRAND.accent};">.dev</span></td></tr>
<tr><td bgcolor="${BRAND.accent}" style="background:${BRAND.accent};height:3px;line-height:3px;font-size:0;">&nbsp;</td></tr>
<tr><td style="padding:32px;font-family:${FONT};font-size:15px;line-height:1.6;color:${BRAND.text};">
<h1 style="margin:0 0 16px;font-family:${FONT};font-size:22px;line-height:1.3;font-weight:700;color:${BRAND.ink};">${escapeHtml(l.heading)}</h1>
${l.intro.map(p).join("\n")}
${codeHtml}${rowsHtml}${quoteHtml}${ctaHtml}
${(l.outro ?? []).map(p).join("\n")}
</td></tr>
<tr><td bgcolor="${BRAND.panel}" style="background:${BRAND.panel};border-top:1px solid ${BRAND.line};padding:20px 32px;font-family:${FONT};font-size:12px;line-height:1.6;color:${BRAND.muted};">
${identity}${b.email ? `<br><a href="mailto:${escapeHtml(b.email)}" style="color:${BRAND.muted};">${escapeHtml(b.email)}</a>` : ""}<br>
${escapeHtml(reason)} <a href="${escapeHtml(privacy)}" style="color:${BRAND.accentInk};">Privacy notice</a>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    WORDMARK,
    "",
    l.heading,
    "",
    ...l.intro.flatMap((t) => [t, ""]),
    ...(l.code ? [l.code, ""] : []),
    ...(l.rows?.length ? [...l.rows.map(([k, v]) => `${k}: ${v}`), ""] : []),
    ...(l.quote ? [`${l.quote.label}:`, l.quote.text, ""] : []),
    ...(l.cta ? [`${l.cta.label}: ${l.cta.url}`, ""] : []),
    ...(l.outro ?? []).flatMap((t) => [t, ""]),
    "--",
    `${b.name} · ${b.status} · ${b.address}`,
    ...(b.email ? [b.email] : []),
    reason,
    `Privacy notice: ${privacy}`,
  ].join("\n");

  return { subject: oneLine(l.subject), html, text };
}

/* ------------------------------------------------------------------ */
/* Templates                                                           */
/* ------------------------------------------------------------------ */

/** Quote ready: totals, validity and a link to the signed PDF (PDF also attached by the caller). */
export function quoteEmailToClient(quote: QuoteRecord, lead: Lead, pdfUrl: string): Email {
  const t = totalsFor(quote.lines, quote.total, quote.currency);
  const depositExVat = Math.round((quote.total * quote.depositPercent) / 100);
  const deposit = t.vatApplies ? Math.round(depositExVat * (1 + VAT_RATE) * 100) / 100 : depositExVat;
  return render({
    audience: "client",
    subject: `Your quote ${quote.number} from ${business().name}`,
    preheader: `Quote ${quote.number}: ${money(t.total, quote.currency)}, valid until ${shortDate(quote.validUntil)}.`,
    heading: `Your quote ${quote.number}`,
    intro: [`Hi ${firstName(lead)},`, "Thanks for your enquiry. Your quote is attached as a PDF, with the full scope and assumptions."],
    rows: [
      ["Quote", quote.number],
      [t.vatApplies ? "Total (incl. VAT)" : "Total", money(t.total, quote.currency)],
      [`Deposit to start (${quote.depositPercent}%)`, money(deposit, quote.currency)],
      ["Valid until", shortDate(quote.validUntil)],
    ],
    cta: { label: "View your quote (PDF)", url: pdfUrl },
    outro: [
      `Ready to go ahead? Continue in the chat on ${WORDMARK} or simply reply to this email.`,
      vatStatement(),
    ],
  });
}

/** Invoice issued: amount, due date and a single "Pay securely" button (provider URL). */
export function invoiceEmailToClient(invoice: InvoiceRecord, lead: Lead, pdfUrl: string): Email {
  const t = totalsFor(invoice.lines, invoice.total, invoice.currency);
  const charged = chargedNote(invoice);
  const payUrl = invoice.status === "open" ? invoice.payment?.url : undefined;
  const title = invoiceTitle();
  return render({
    audience: "client",
    subject: `${title} ${invoice.number}: ${money(t.total, invoice.currency)} due ${shortDate(invoice.dueDate)}`,
    preheader: `${purposeLabel(invoice.purpose)} of ${money(t.total, invoice.currency)} due by ${shortDate(invoice.dueDate)}.`,
    heading: `${title} ${invoice.number}`,
    intro: [
      `Hi ${firstName(lead)},`,
      payUrl
        ? "Your invoice is attached. You can pay securely online with the button below."
        : "Your invoice is attached for your records.",
    ],
    rows: [
      ["Invoice", invoice.number],
      ["For", purposeLabel(invoice.purpose)],
      [t.vatApplies ? "Amount due (incl. VAT)" : "Amount due", money(t.total, invoice.currency)],
      ...(charged ? [["Charged in rand", charged.replace(/^Charged as /, "")] as [string, string]] : []),
      ["Due date", shortDate(invoice.dueDate)],
    ],
    cta: payUrl ? { label: "Pay securely", url: payUrl } : { label: "View invoice (PDF)", url: pdfUrl },
    outro: [
      ...(payUrl ? [`You can also download the invoice as a PDF: ${pdfUrl}`] : []),
      vatStatement(),
    ],
  });
}

function formatInZone(iso: string, timeZone: string) {
  const d = new Date(iso);
  const fmt = (tz: string) =>
    new Intl.DateTimeFormat("en-ZA", {
      timeZone: tz,
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(d);
  try {
    return fmt(timeZone);
  } catch {
    return fmt(ownerTimeZone());
  }
}

/** Booking confirmation, with the time in the client's zone and in SAST. */
export function bookingEmailToClient(
  b: { start: string; end: string; timezone: string; meetingUrl?: string },
  lead: Lead,
): Email {
  const minutes = Math.max(0, Math.round((new Date(b.end).getTime() - new Date(b.start).getTime()) / 60_000));
  const clientTime = formatInZone(b.start, b.timezone);
  const sast = formatInZone(b.start, "Africa/Johannesburg");
  const rows: [string, string][] = [["When", `${clientTime}`]];
  if (sast !== clientTime) rows.push(["South Africa time", sast]);
  rows.push(["Duration", `${minutes || 30} minutes`]);
  if (b.meetingUrl) rows.push(["Meeting link", b.meetingUrl]);
  return render({
    audience: "client",
    subject: `Discovery call booked: ${formatInZone(b.start, b.timezone).replace(/ at .*/, "")}`,
    preheader: `Your ${minutes || 30}-minute discovery call with ${business().name} is confirmed.`,
    heading: "Your discovery call is booked",
    intro: [`Hi ${firstName(lead)},`, `Your ${minutes || 30}-minute discovery call with ${business().name} is confirmed.`],
    rows,
    cta: b.meetingUrl ? { label: "Join the video call", url: b.meetingUrl } : undefined,
    outro: [
      b.meetingUrl
        ? "The link also appears in your calendar invite."
        : "The joining details are in your calendar invite.",
      "Need a different time? Just reply to this email.",
    ],
  });
}

/** 6-digit verification code email (fixed template; no free text). */
export function verificationEmail(code: string, lead: Lead): Email {
  const digits = code.replace(/\D/g, "").slice(0, 6);
  return render({
    audience: "client",
    subject: `Your ${WORDMARK} verification code`,
    preheader: "Use this code to verify your email. It expires in 10 minutes.",
    heading: "Verify your email",
    intro: [`Hi ${firstName(lead)},`, "Enter this 6-digit code in the chat to confirm your email address:"],
    code: digits,
    outro: ["The code is valid for 10 minutes.", "If you didn't request this, ignore it — nothing happens without the code."],
  });
}

/** Receipt after a verified payment. */
export function receiptEmailToClient(invoice: InvoiceRecord, lead: Lead, pdfUrl: string): Email {
  const t = totalsFor(invoice.lines, invoice.total, invoice.currency);
  const charged = invoice.payment?.charged;
  return render({
    audience: "client",
    subject: `Payment received: ${invoice.number}`,
    preheader: `Thanks! We received ${money(charged?.amount ?? t.total, charged?.currency ?? invoice.currency)} for ${invoice.number}.`,
    heading: "Payment received — thank you",
    intro: [`Hi ${firstName(lead)},`, `Your payment for ${invoice.number} has been received.`],
    rows: [
      ["Invoice", invoice.number],
      ["For", purposeLabel(invoice.purpose)],
      ["Amount", money(t.total, invoice.currency)],
      ...(charged ? [["Charged", money(charged.amount, charged.currency)] as [string, string]] : []),
      ["Paid on", shortDate(invoice.paidAt ?? new Date().toISOString())],
      ...(invoice.payment?.reference ? [["Reference", invoice.payment.reference] as [string, string]] : []),
    ],
    cta: { label: "Download paid invoice (PDF)", url: pdfUrl },
    outro: [
      invoice.purpose === "deposit"
        ? `${business().name} will be in touch within one business day to schedule the kickoff.`
        : `${business().name} will be in touch within one business day about next steps.`,
    ],
  });
}

/** Notification to the developer for any lead event (only ever sent to OWNER_EMAIL). */
export function ownerNotificationEmail(event: string, lead: Lead, details: Record<string, string>): Email {
  const c = lead.contact;
  const who = c?.name ? `${c.name}${c.company ? ` (${c.company})` : ""}` : (c?.email ?? lead.id);
  // A "Summary" detail is shown in the quoted panel rather than as a table row.
  const summaryKey = Object.keys(details).find((k) => k.toLowerCase() === "summary");
  const summary = (summaryKey ? details[summaryKey] : lead.summary)?.trim();
  const rows: [string, string][] = [
    ["Event", event],
    ["Name", c?.name ?? "-"],
    ["Email", c?.email ?? "-"],
    ...(c?.company ? [["Company", c.company] as [string, string]] : []),
    ...(c?.phone ? [["Phone", c.phone] as [string, string]] : []),
    ["Email verified", lead.emailVerifiedAt ? `Yes (${shortDate(lead.emailVerifiedAt)})` : "No"],
    ["Lead status", lead.status],
    ["Services", lead.serviceSlugs.join(", ") || "-"],
    ...(lead.budget ? [["Budget", lead.budget] as [string, string]] : []),
    ...(lead.timeline ? [["Timeline", lead.timeline] as [string, string]] : []),
    ...Object.entries(details)
      .filter(([k]) => k !== summaryKey)
      .map(([k, v]) => [oneLine(k, 60), String(v).slice(0, 1000)] as [string, string]),
    ["Lead id", lead.id],
  ];
  return render({
    audience: "owner",
    subject: `[${WORDMARK}] ${event}: ${who}`,
    preheader: `${event} — ${who}`,
    heading: event,
    intro: [`Lead activity from the concierge on ${WORDMARK}.`],
    rows,
    quote: summary ? { label: "Lead summary", text: summary.slice(0, 2000) } : undefined,
    cta: c?.email ? { label: `Reply to ${firstName(lead)}`, url: `mailto:${c.email}` } : undefined,
  });
}
