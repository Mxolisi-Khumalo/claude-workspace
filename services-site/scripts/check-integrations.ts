/**
 * Smoke checks for the integration adapters and document rendering (this
 * repo has no test runner). Exercises the mock/file stores, webhook
 * signatures, provider request shapes (with a stubbed fetch), signed document
 * links, both PDFs and every email template.
 *
 *   npm run check:integrations            # or:
 *   npx tsx --conditions=react-server scripts/check-integrations.ts
 *
 * Set CHECK_OUTPUT_DIR to keep the rendered PDFs and emails for inspection.
 */
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inflateSync } from "node:zlib";
import { PDFArray, PDFDocument, PDFName, PDFRawStream, type PDFObject } from "pdf-lib";

import { toTranscript } from "@/app/admin/transcript";
import {
  bookingEmailToClient,
  documentUrl,
  escapeHtml,
  invoiceEmailToClient,
  ownerNotificationEmail,
  quoteEmailToClient,
  receiptEmailToClient,
  renderInvoicePdf,
  renderQuotePdf,
  verificationEmail,
  verifyDocumentToken,
} from "@/lib/documents";
import { CalComCalendar, normaliseCalSlots } from "@/lib/integrations/calendar/calcom";
import { MockCalendar } from "@/lib/integrations/calendar/mock";
import { ResendEmail } from "@/lib/integrations/email/resend";
import { WebhookSignatureError } from "@/lib/integrations/env";
import { MOCK_SIGNATURE_HEADER, MockPayments, signMockWebhook } from "@/lib/integrations/payments/mock";
import { PAYSTACK_SIGNATURE_HEADER, PaystackPayments } from "@/lib/integrations/payments/paystack";
import { FileStore } from "@/lib/integrations/store/file";
import { MemoryStore } from "@/lib/integrations/store/memory";
import type { AppStore } from "@/lib/integrations/store/shared";
import type { CalendarProvider, InvoiceRecord, Lead, QuoteRecord } from "@/lib/integrations/types";

/* ------------------------------------------------------------------ */
/* Harness                                                             */
/* ------------------------------------------------------------------ */

let failures = 0;
async function check(name: string, fn: () => unknown) {
  try {
    await fn();
    console.log(`  ok    ${name}`);
  } catch (err) {
    failures++;
    console.error(`  FAIL  ${name}\n${String((err as Error)?.stack ?? err).replace(/^/gm, "        ")}`);
  }
}

const realFetch = globalThis.fetch;
type Call = { url: string; init: RequestInit };
/** Replaces fetch with a canned responder for the duration of `fn`. */
async function withFetch(respond: (call: Call) => Response, fn: (calls: Call[]) => Promise<void>) {
  const calls: Call[] = [];
  globalThis.fetch = (async (url: string | URL | Request, init: RequestInit = {}) => {
    const call = { url: String(url), init };
    calls.push(call);
    return respond(call);
  }) as typeof fetch;
  try {
    await fn(calls);
  } finally {
    globalThis.fetch = realFetch;
  }
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const header = (init: RequestInit, name: string) => new Headers(init.headers).get(name);

/** Extracts the text drawn with standard fonts (hex strings in Flate content streams). */
async function pdfText(bytes: Uint8Array): Promise<string> {
  const doc = await PDFDocument.load(bytes);
  const out: string[] = [];
  for (const page of doc.getPages()) {
    const contents = page.node.Contents();
    const refs: PDFObject[] = contents instanceof PDFArray ? contents.asArray() : contents ? [contents] : [];
    for (const ref of refs) {
      const stream = doc.context.lookup(ref);
      if (!(stream instanceof PDFRawStream)) continue;
      const flate = stream.dict.get(PDFName.of("Filter")) === PDFName.of("FlateDecode");
      const ops = Buffer.from(flate ? inflateSync(stream.contents) : stream.contents).toString("latin1");
      for (const m of ops.matchAll(/<([0-9A-Fa-f]*)>\s*Tj/g)) out.push(Buffer.from(m[1], "hex").toString("latin1"));
    }
  }
  return out.join("\n");
}

const isoIn = (ms: number) => new Date(Date.now() + ms).toISOString();
const DAY = 86_400_000;

/* ------------------------------------------------------------------ */
/* Fixtures                                                            */
/* ------------------------------------------------------------------ */

const now = new Date().toISOString();
const lead: Lead = {
  id: "lead_check0001",
  createdAt: now,
  updatedAt: now,
  sessionId: "sess_check_0123456789",
  contact: { name: "Thandi <b>Nkosi</b>", email: "thandi@example.com", company: "Acme & Sons — Pty", consent: true },
  emailVerifiedAt: now,
  summary: "Shopify → Next.js migration ≈ 40 products 🚀\n<script>alert(1)</script>",
  serviceSlugs: ["web-apps"],
  status: "quoted",
  source: "chat",
};

const quote: QuoteRecord = {
  id: "quote_check0001",
  number: "Q-2026-0007",
  leadId: lead.id,
  createdAt: now,
  validUntil: isoIn(14 * DAY),
  currency: "ZAR",
  lines: [
    { label: "Full-stack web app — Launch package", amount: 45000 },
    {
      label:
        "Extra scope (medium): integrate a very long-named third-party logistics API → webhooks ≈ retries ✓ 🚀 with łódź-style unicode that must wrap neatly across lines",
      amount: 9500,
    },
    { label: "Priority scheduling (+20%)", amount: 10900 },
  ],
  total: 65400,
  depositPercent: 40,
  timeline: "4–6 weeks",
  assumptions: [
    "Launch: Auth, dashboard and admin area",
    "Launch: Deployed to Vercel with CI/CD and preview environments for every pull request, monitoring and error tracking configured",
    "Prices are fixed for the scope above; changes are quoted separately before work starts.",
    "Hosting, domains and third-party subscriptions are billed at cost to the client.",
  ],
  serviceSlugs: ["web-apps"],
  status: "draft",
};

const longQuote: QuoteRecord = {
  ...quote,
  id: "quote_check0002",
  lines: Array.from({ length: 34 }, (_, i) => ({ label: `Line item ${i + 1}: scoped deliverable with a descriptive label`, amount: 1000 })),
  total: 34000,
  assumptions: Array.from({ length: 12 }, (_, i) => `Assumption ${i + 1} that is long enough to wrap onto a second line in the PDF layout for testing.`),
};

const openUsdInvoice: InvoiceRecord = {
  id: "inv_check0001",
  number: "INV-2026-0003",
  leadId: lead.id,
  quoteId: quote.id,
  createdAt: now,
  dueDate: isoIn(7 * DAY),
  currency: "USD",
  lines: [{ label: "40% deposit against quote Q-2026-0007", amount: 1400 }],
  total: 1400,
  purpose: "deposit",
  status: "open",
  payment: {
    provider: "paystack",
    reference: "INV-2026-0003",
    url: "https://checkout.paystack.com/0peioxfhpn1234567890abcdefghijklmnopqrstuvwxyz",
    charged: { amount: 25550, currency: "ZAR", rate: 18.25 },
  },
};

const paidInvoice: InvoiceRecord = {
  ...openUsdInvoice,
  id: "inv_check0002",
  number: "INV-2026-0004",
  currency: "ZAR",
  lines: quote.lines,
  total: quote.total,
  purpose: "full",
  status: "paid",
  paidAt: now,
  payment: { provider: "mock", reference: "INV-2026-0004", url: "http://localhost:3000/demo/checkout/INV-2026-0004" },
};

/* ------------------------------------------------------------------ */
/* Checks                                                              */
/* ------------------------------------------------------------------ */

async function exerciseStore(store: AppStore) {
  assert.equal(await store.getLead(lead.id), null);
  await store.upsertLead(lead);
  const got = await store.getLead(lead.id);
  assert.deepEqual(got, lead);
  got!.status = "lost";
  assert.equal((await store.getLead(lead.id))!.status, "quoted", "returned records must be copies");
  assert.equal((await store.getLeadBySession(lead.sessionId))?.id, lead.id);
  assert.equal(await store.getLeadBySession("nope"), null);
  await store.upsertLead({ ...lead, status: "booked" });
  assert.equal((await store.listLeads()).length, 1);
  assert.equal((await store.getLead(lead.id))!.status, "booked");

  await store.saveQuote(quote);
  await store.saveQuote({ ...quote, id: "quote_other", leadId: "lead_other", createdAt: isoIn(1000) });
  assert.equal((await store.listQuotes(lead.id)).length, 1);
  assert.equal((await store.listQuotes()).length, 2);
  assert.equal((await store.getQuote(quote.id))?.number, quote.number);

  await store.saveInvoice(openUsdInvoice);
  assert.equal((await store.getInvoiceByReference("INV-2026-0003"))?.id, openUsdInvoice.id);
  assert.equal(await store.getInvoiceByReference("INV-missing"), null);
  await store.saveInvoice({ ...openUsdInvoice, status: "paid" });
  assert.equal((await store.getInvoice(openUsdInvoice.id))?.status, "paid");
  assert.equal((await store.listInvoices(lead.id)).length, 1);

  await store.saveBooking({ id: "booking_1", leadId: lead.id, provider: "mock", providerBookingId: "cal_uid_1", start: isoIn(DAY), end: isoIn(DAY + 1_800_000), timezone: "Africa/Johannesburg", status: "confirmed" });
  assert.equal((await store.listBookings(lead.id)).length, 1);
  assert.equal((await store.getBookingByProviderId("cal_uid_1"))?.id, "booking_1");
  assert.equal(await store.getBookingByProviderId("cal_uid_missing"), null);

  const action = { id: "act_1", sessionId: lead.sessionId, leadId: lead.id, type: "book_call" as const, payload: { start: now }, status: "proposed" as const, createdAt: now, expiresAt: isoIn(900_000) };
  await store.savePendingAction(action);
  await store.savePendingAction({ ...action, status: "executed" });
  assert.equal((await store.getPendingAction("act_1"))?.status, "executed");

  await store.saveConversation({ sessionId: lead.sessionId, createdAt: now, updatedAt: now, messages: [{ role: "user", content: "hi" }], turns: 1 });
  assert.equal((await store.getConversation(lead.sessionId))?.turns, 1);
  assert.equal((await store.listConversations(10)).length, 1);

  await store.saveOutboxEntry({ id: "out_1", createdAt: now, to: ["a@example.com"], subject: "s", html: "<p>h</p>", text: "t", attachments: ["Q.pdf"] });
  assert.deepEqual((await store.listOutbox())[0].attachments, ["Q.pdf"]);

  assert.equal(await store.recordWebhookEvent("paystack", "evt_1"), true);
  assert.equal(await store.recordWebhookEvent("paystack", "evt_1"), false);
  assert.equal(await store.recordWebhookEvent("mock", "evt_1"), true);
  assert.equal(await store.hasWebhookEvent("paystack", "evt_1"), true);
  assert.equal(await store.hasWebhookEvent("paystack", "evt_2"), false);

  assert.equal(await store.nextSequence("quote"), 1);
  assert.equal(await store.nextSequence("quote"), 2);
  assert.equal(await store.nextSequence("invoice"), 1);

  const counts = await Promise.all(Array.from({ length: 5 }, () => store.incrementCounter("throttle:a", 60)));
  assert.deepEqual([...counts].sort(), [1, 2, 3, 4, 5], "increments are atomic");
  assert.equal(await store.incrementCounter("throttle:b", 60), 1, "keys are independent");
  assert.equal(await store.incrementCounter("throttle:short", 1), 1);
  await new Promise((r) => setTimeout(r, 1100));
  assert.equal(await store.incrementCounter("throttle:short", 1), 1, "a new window starts after the old one ends");
  assert.equal(await store.incrementCounter("throttle:a", 60), 6);
}

async function main() {
  const work = await mkdtemp(join(tmpdir(), "services-site-check-"));
  const outDir = process.env.CHECK_OUTPUT_DIR;
  if (outDir) await mkdir(outDir, { recursive: true });
  const keep = async (name: string, data: string | Uint8Array) => {
    if (outDir) await writeFile(join(outDir, name), data);
  };
  for (const k of ["VAT_REGISTERED", "VAT_NUMBER", "USD_ZAR_RATE", "SESSION_SECRET", "NEXT_PUBLIC_SITE_URL", "DEMO_MODE"]) delete process.env[k];
  process.env.OWNER_EMAIL = "hello@mxolisi.dev";

  console.log("store");
  await check("memory store CRUD, copies, webhook idempotency, sequences", () => exerciseStore(new MemoryStore()));
  const file = join(work, "data", "store.json");
  await check("file store CRUD (atomic JSON file)", () => exerciseStore(new FileStore(file)));
  await check("file store serialises concurrent writes and reloads from disk", async () => {
    const a = new FileStore(file);
    const seqs = await Promise.all(Array.from({ length: 25 }, () => a.nextSequence("invoice")));
    assert.deepEqual([...seqs].sort((x, y) => x - y), Array.from({ length: 25 }, (_, i) => i + 2));
    const b = new FileStore(file);
    assert.equal((await b.getLead(lead.id))?.id, lead.id);
    assert.equal(await b.nextSequence("invoice"), 27);
    await new Promise((r) => setTimeout(r, 30));
    await a.upsertLead({ ...lead, status: "won" });
    assert.equal((await b.getLead(lead.id))?.status, "won", "second instance sees writes via mtime");
    const leftovers = (await readdir(join(work, "data"))).filter((f) => f.endsWith(".tmp"));
    assert.deepEqual(leftovers, []);
  });

  console.log("payments");
  const paystack = new PaystackPayments("sk_test_check_secret");
  const chargeBody = JSON.stringify({
    event: "charge.success",
    data: { id: 4099260516, status: "success", reference: "INV-2026-0003", amount: 2555000, currency: "ZAR" },
  });
  const paystackSig = createHmac("sha512", "sk_test_check_secret").update(chargeBody).digest("hex");
  await check("paystack webhook: valid HMAC-SHA512 signature -> paid, major units", async () => {
    const r = await paystack.parseWebhook(chargeBody, new Headers({ [PAYSTACK_SIGNATURE_HEADER]: paystackSig }));
    assert.equal(r.paid, true);
    assert.equal(r.reference, "INV-2026-0003");
    assert.equal(r.amount, 25550);
    assert.equal(r.currency, "ZAR");
  });
  await check("paystack webhook: bad, truncated or missing signature throws", async () => {
    const bad = paystackSig.slice(0, -1) + (paystackSig.endsWith("0") ? "1" : "0");
    for (const sig of [bad, paystackSig.slice(0, 20), ""]) {
      await assert.rejects(paystack.parseWebhook(chargeBody, new Headers({ [PAYSTACK_SIGNATURE_HEADER]: sig })), WebhookSignatureError);
    }
    await assert.rejects(paystack.parseWebhook(chargeBody + " ", new Headers({ [PAYSTACK_SIGNATURE_HEADER]: paystackSig })), WebhookSignatureError);
  });
  await check("paystack webhook: non-charge events are not paid", async () => {
    const body = JSON.stringify({ event: "transfer.success", data: { reference: "x" } });
    const sig = createHmac("sha512", "sk_test_check_secret").update(body).digest("hex");
    assert.equal((await paystack.parseWebhook(body, new Headers({ [PAYSTACK_SIGNATURE_HEADER]: sig }))).paid, false);
  });
  await check("paystack initialize: ZAR in cents; USD converted at USD_ZAR_RATE", async () => {
    await withFetch(
      () => json({ status: true, data: { authorization_url: "https://checkout.paystack.com/abc", reference: "INV-1" } }),
      async (calls) => {
        const base = { email: "c@example.com", reference: "INV-1", description: "d", callbackUrl: "https://x/pay", metadata: { invoiceId: "i" } };
        const zar = await paystack.createPaymentLink({ ...base, amount: 13080, currency: "ZAR" });
        assert.equal(zar.url, "https://checkout.paystack.com/abc");
        assert.equal(zar.charged, undefined);
        const sent = JSON.parse(String(calls[0].init.body));
        assert.equal(calls[0].url, "https://api.paystack.co/transaction/initialize");
        assert.equal(header(calls[0].init, "authorization"), "Bearer sk_test_check_secret");
        assert.equal(sent.amount, 1308000);
        assert.equal(sent.currency, "ZAR");
        assert.equal(sent.callback_url, "https://x/pay");
        assert.equal(sent.metadata.invoiceId, "i");

        await assert.rejects(paystack.createPaymentLink({ ...base, amount: 1400, currency: "USD" }), /USD_ZAR_RATE/);
        process.env.USD_ZAR_RATE = "18.25";
        const usd = await paystack.createPaymentLink({ ...base, amount: 1400, currency: "USD" });
        assert.deepEqual(usd.charged, { amount: 25550, currency: "ZAR", rate: 18.25 });
        const sentUsd = JSON.parse(String(calls.at(-1)!.init.body));
        assert.equal(sentUsd.amount, 2555000);
        assert.equal(sentUsd.currency, "ZAR");
        delete process.env.USD_ZAR_RATE;
      },
    );
  });
  await check("paystack initialize: API error surfaces as an exception", async () => {
    await withFetch(
      () => json({ status: false, message: "Duplicate Transaction Reference" }, 400),
      async () => {
        await assert.rejects(
          paystack.createPaymentLink({ amount: 10, currency: "ZAR", email: "c@example.com", reference: "r", description: "d", callbackUrl: "https://x" }),
          /Duplicate Transaction Reference/,
        );
      },
    );
  });
  await check("paystack verify: success in major units; unknown reference not paid", async () => {
    await withFetch(
      (c) =>
        c.url.endsWith("/INV-2026-0003")
          ? json({ status: true, data: { status: "success", amount: 2555000, currency: "ZAR" } })
          : json({ status: false, message: "Transaction reference not found" }, 400),
      async (calls) => {
        assert.deepEqual(await paystack.verify("INV-2026-0003"), { paid: true, amount: 25550, currency: "ZAR" });
        assert.equal(calls[0].url, "https://api.paystack.co/transaction/verify/INV-2026-0003");
        assert.deepEqual(await paystack.verify("missing"), { paid: false });
      },
    );
  });

  const mockStore = new MemoryStore();
  const mock = new MockPayments(() => mockStore);
  await check("mock payments: demo checkout URL; verify false until signed webhook", async () => {
    const link = await mock.createPaymentLink({ amount: 100, currency: "ZAR", email: "c@example.com", reference: "INV-2026-0009", description: "d", callbackUrl: "x" });
    assert.equal(link.url, "http://localhost:3000/demo/checkout/INV-2026-0009");
    const withReturn = await mock.createPaymentLink({ amount: 100, currency: "ZAR", email: "c@example.com", reference: "INV-2026-0009", description: "d", callbackUrl: "http://localhost:3000/pay/complete?ref=INV-2026-0009&t=abc" });
    assert.equal(new URL(withReturn.url).searchParams.get("return"), "/pay/complete?ref=INV-2026-0009&t=abc");
    const offSite = await mock.createPaymentLink({ amount: 100, currency: "ZAR", email: "c@example.com", reference: "INV-2026-0009", description: "d", callbackUrl: "https://evil.example/pay/complete?ref=x" });
    assert.equal(offSite.url, "http://localhost:3000/demo/checkout/INV-2026-0009", "off-site callbacks are dropped");
    assert.deepEqual(await mock.verify("INV-2026-0009"), { paid: false });
    const body = JSON.stringify({ reference: "INV-2026-0009", status: "success" });
    const sig = createHmac("sha256", "dev-secret").update(body).digest("hex");
    assert.equal(sig, signMockWebhook(body));
    const r = await mock.parseWebhook(body, new Headers({ [MOCK_SIGNATURE_HEADER]: sig }));
    assert.equal(r.paid, true);
    assert.equal(r.reference, "INV-2026-0009");
    assert.deepEqual(await mock.verify("INV-2026-0009"), { paid: true });
  });
  await check("mock payments: failed status not paid; bad signature throws", async () => {
    const body = JSON.stringify({ reference: "INV-2026-0010", status: "failed" });
    const r = await mock.parseWebhook(body, new Headers({ [MOCK_SIGNATURE_HEADER]: signMockWebhook(body) }));
    assert.equal(r.paid, false);
    assert.deepEqual(await mock.verify("INV-2026-0010"), { paid: false });
    const forged = JSON.stringify({ reference: "INV-2026-0011", status: "success" });
    await assert.rejects(mock.parseWebhook(forged, new Headers({ [MOCK_SIGNATURE_HEADER]: signMockWebhook(forged, "wrong") })), WebhookSignatureError);
    await assert.rejects(mock.parseWebhook(forged, new Headers()), WebhookSignatureError);
    assert.deepEqual(await mock.verify("INV-2026-0011"), { paid: false });
  });

  console.log("calendar");
  await check("mock calendar: 5 business days, 09-16 SAST on the hour, >=2h notice, busy rule", async () => {
    const calendar: CalendarProvider = new MockCalendar();
    const slots = await calendar.getAvailableSlots(new Date().toISOString(), isoIn(14 * DAY), "Europe/London");
    assert.ok(slots.length > 10, `expected plenty of slots, got ${slots.length}`);
    const days = new Set<string>();
    for (const s of slots) {
      const sast = new Date(Date.parse(s.start) + 2 * 3_600_000);
      assert.ok(Date.parse(s.start) >= Date.now() + 2 * 3_600_000 - 1000, "minimum notice");
      assert.ok(sast.getUTCDay() >= 1 && sast.getUTCDay() <= 5, "weekday");
      assert.ok(sast.getUTCHours() >= 9 && sast.getUTCHours() <= 16 && sast.getUTCMinutes() === 0, "hours");
      assert.notEqual((sast.getUTCDate() + sast.getUTCHours()) % 3, 0, "busy slot leaked");
      assert.equal(Date.parse(s.end) - Date.parse(s.start), 30 * 60_000);
      days.add(sast.toISOString().slice(0, 10));
    }
    assert.ok(days.size <= 5, `at most 5 business days, got ${days.size}`);
  });
  await check("mock calendar: booking id and meeting URL are deterministic", async () => {
    const cal = new MockCalendar();
    const req = { start: isoIn(DAY), name: "T", email: "t@example.com", timezone: "Africa/Johannesburg" };
    const a = await cal.book(req);
    const b = await cal.book(req);
    assert.match(a.providerBookingId, /^mock_[0-9a-f]{10}$/);
    assert.equal(a.providerBookingId, b.providerBookingId);
    assert.equal(a.meetingUrl, `https://meet.example.com/${a.providerBookingId}`);
  });
  await check("cal.com: slot payload normalisation (date-keyed, strings, {time}, ranges)", () => {
    const slots = normaliseCalSlots(
      {
        "2026-11-02": [{ start: "2026-11-02T09:00:00.000+02:00" }, "2026-11-02T10:00:00.000+02:00"],
        "2026-11-03": [{ start: "2026-11-03T09:00:00Z", end: "2026-11-03T10:00:00Z" }, { time: "bad" }],
      },
      30,
    );
    assert.deepEqual(slots, [
      { start: "2026-11-02T07:00:00.000Z", end: "2026-11-02T07:30:00.000Z" },
      { start: "2026-11-02T08:00:00.000Z", end: "2026-11-02T08:30:00.000Z" },
      { start: "2026-11-03T09:00:00.000Z", end: "2026-11-03T10:00:00.000Z" },
    ]);
    assert.equal(normaliseCalSlots({ slots: { "2026-11-02": [{ time: "2026-11-02T07:00:00Z" }] } }, 30).length, 1);
  });
  await check("cal.com: request shapes and API versions", async () => {
    const cal = new CalComCalendar("cal_test_key", 123456, 30);
    await withFetch(
      (c) =>
        c.url.includes("/slots")
          ? json({ status: "success", data: { "2099-11-02": [{ start: "2099-11-02T09:00:00.000+02:00" }] } })
          : json({ status: "success", data: { uid: "bk_123", start: "2099-11-02T07:00:00.000Z", end: "2099-11-02T07:30:00.000Z", location: "https://meet.google.com/abc-defg-hij" } }, 201),
      async (calls) => {
        const slots = await cal.getAvailableSlots("2099-11-01T00:00:00Z", "2099-11-05T00:00:00Z", "Africa/Johannesburg");
        assert.equal(slots.length, 1);
        const u = new URL(calls[0].url);
        assert.equal(u.pathname, "/v2/slots");
        assert.equal(u.searchParams.get("eventTypeId"), "123456");
        assert.equal(u.searchParams.get("start"), "2099-11-01");
        assert.equal(u.searchParams.get("end"), "2099-11-05");
        assert.equal(header(calls[0].init, "cal-api-version"), "2024-09-04");
        const booked = await cal.book({ start: "2099-11-02T07:00:00.000Z", name: "T", email: "t@example.com", timezone: "Africa/Johannesburg", notes: "Hi" });
        assert.deepEqual(booked, { providerBookingId: "bk_123", start: "2099-11-02T07:00:00.000Z", end: "2099-11-02T07:30:00.000Z", meetingUrl: "https://meet.google.com/abc-defg-hij" });
        assert.equal(header(calls[1].init, "cal-api-version"), "2024-08-13");
        const body = JSON.parse(String(calls[1].init.body));
        assert.equal(body.eventTypeId, 123456);
        assert.deepEqual(body.attendee, { name: "T", email: "t@example.com", timeZone: "Africa/Johannesburg", language: "en" });
        assert.deepEqual(body.bookingFieldsResponses, { notes: "Hi" });
      },
    );
  });

  console.log("email");
  await check("resend: base64 attachments, reply_to, errors throw", async () => {
    const resend = new ResendEmail("re_test_key", "Test <hello@mail.example.com>");
    await withFetch(
      (c) => (JSON.parse(String(c.init.body)).subject === "fail" ? json({ statusCode: 422, message: "Invalid `to` field", name: "validation_error" }, 422) : json({ id: "email_123" })),
      async (calls) => {
        const r = await resend.send({ to: "c@example.com", subject: "s", html: "<p>h</p>", text: "t", replyTo: "o@example.com", attachments: [{ filename: "Q.pdf", content: new Uint8Array([37, 80, 68, 70]) }] });
        assert.equal(r.id, "email_123");
        const body = JSON.parse(String(calls[0].init.body));
        assert.deepEqual(body.to, ["c@example.com"]);
        assert.equal(body.reply_to, "o@example.com");
        assert.deepEqual(body.attachments, [{ filename: "Q.pdf", content: "JVBERg==" }]);
        await assert.rejects(resend.send({ to: "x", subject: "fail", html: "h", text: "t" }), /Invalid `to` field/);
      },
    );
  });

  console.log("documents");
  await check("documentUrl / verifyDocumentToken round trip", () => {
    const url = new URL(documentUrl("quote", quote.id));
    assert.equal(url.origin + url.pathname, `http://localhost:3000/api/documents/quote/${quote.id}`);
    const token = url.searchParams.get("token")!;
    assert.equal(token.length, 32);
    assert.match(token, /^[A-Za-z0-9_-]+$/);
    assert.equal(verifyDocumentToken("quote", quote.id, token), true);
    assert.equal(verifyDocumentToken("invoice", quote.id, token), false);
    assert.equal(verifyDocumentToken("quote", "quote_other", token), false);
    assert.equal(verifyDocumentToken("quote", quote.id, token.slice(0, 31)), false);
    assert.equal(verifyDocumentToken("quote", quote.id, ""), false);
    process.env.SESSION_SECRET = "rotated";
    assert.equal(verifyDocumentToken("quote", quote.id, token), false);
    delete process.env.SESSION_SECRET;
  });

  const pdfs: [string, () => Promise<Uint8Array>, (text: string) => void][] = [
    ["quote.pdf", () => renderQuotePdf(quote, lead), (t) => {
      assert.match(t, /QUOTE/);
      assert.match(t, /Q-2026-0007/);
      assert.match(t, /Not a VAT vendor/);
      assert.doesNotMatch(t, /TAX INVOICE/i);
      assert.match(t.replace(/\s+/g, " "), /-> webhooks ~ retries v/, "non-WinAnsi characters mapped");
      assert.match(t, /Deposit to start \(40%\)/);
    }],
    ["quote-long.pdf", () => renderQuotePdf(longQuote, lead), (t) => assert.match(t, /Page 2 of/)],
    ["invoice-open-usd.pdf", () => renderInvoicePdf(openUsdInvoice, lead), (t) => {
      assert.match(t, /^INVOICE$/m);
      assert.match(t, /Charged as R/);
      assert.match(t, /checkout\.paystack\.com/);
      assert.match(t, /Not a VAT vendor/);
    }],
    ["invoice-paid.pdf", () => renderInvoicePdf(paidInvoice, lead), (t) => assert.match(t, /PAID/)],
  ];
  for (const [name, render, expect] of pdfs) {
    await check(`pdf renders: ${name}`, async () => {
      const bytes = await render();
      assert.ok(bytes.byteLength > 1500, `too small: ${bytes.byteLength}`);
      assert.equal(Buffer.from(bytes.slice(0, 5)).toString("latin1"), "%PDF-");
      expect(await pdfText(bytes));
      await keep(name, bytes);
    });
  }
  await check("pdf: VAT registered -> Tax Invoice with VAT number and 15% VAT", async () => {
    process.env.VAT_REGISTERED = "true";
    process.env.VAT_NUMBER = "4123456789";
    try {
      const zarInvoice = { ...openUsdInvoice, id: "inv_vat", currency: "ZAR" as const, total: 10000, lines: [{ label: "Deposit", amount: 10000 }], payment: { ...openUsdInvoice.payment!, charged: undefined } };
      const bytes = await renderInvoicePdf(zarInvoice, lead);
      await keep("invoice-vat.pdf", bytes);
      const t = await pdfText(bytes);
      assert.match(t, /TAX INVOICE/);
      assert.match(t, /4123456789/);
      assert.match(t, /VAT \(15%\)/);
      assert.match(t, /R\xa01\xa0500,00/);
      assert.match(t, /R\xa011\xa0500,00/);
      assert.match(invoiceEmailToClient(zarInvoice, lead, "https://x").subject, /^Tax Invoice/);
    } finally {
      delete process.env.VAT_REGISTERED;
      delete process.env.VAT_NUMBER;
    }
  });

  const pdfUrl = documentUrl("quote", quote.id);
  const emails = {
    quote: quoteEmailToClient(quote, lead, pdfUrl),
    invoice: invoiceEmailToClient(openUsdInvoice, lead, documentUrl("invoice", openUsdInvoice.id)),
    booking: bookingEmailToClient({ start: "2026-11-03T08:00:00.000Z", end: "2026-11-03T08:30:00.000Z", timezone: "Europe/London", meetingUrl: "https://meet.example.com/mock_abc" }, lead),
    verification: verificationEmail("042917"),
    receipt: receiptEmailToClient(paidInvoice, lead, documentUrl("invoice", paidInvoice.id)),
    owner: ownerNotificationEmail("New verified lead", lead, { Summary: lead.summary!, Services: "web-apps" }),
  };
  for (const [name, e] of Object.entries(emails)) {
    await check(`email template: ${name}`, async () => {
      assert.ok(e.subject.trim() && e.html.trim() && e.text.trim());
      assert.doesNotMatch(e.subject, /[\r\n]/);
      assert.match(e.html, /^<!doctype html>/);
      assert.match(e.html, /mxolisi<span[^>]*>\.dev<\/span>/);
      assert.ok(!e.html.includes("<b>Nkosi") && !e.html.includes("<script>"), "unescaped visitor input");
      assert.ok(e.html.includes("http://localhost:3000/privacy"));
      if (name !== "owner") {
        assert.ok(!e.html.includes("Shopify") && !e.text.includes("Shopify"), "free text in client email");
        assert.match(e.html, /You are receiving this because you requested it on mxolisi\.dev/);
      }
      await keep(`email-${name}.html`, e.html);
    });
  }
  await check("email specifics: code, timezones, CTA targets, owner summary", () => {
    assert.match(emails.verification.html, /042917/);
    assert.match(emails.verification.text, /10 minutes/);
    assert.doesNotMatch(emails.verification.subject, /042917/);
    assert.match(emails.booking.text, /SAST/);
    assert.match(emails.booking.text, /GMT|UTC/);
    assert.ok(emails.invoice.html.includes(escapeHtml(openUsdInvoice.payment!.url)), "pay button uses provider URL");
    assert.match(emails.invoice.text, /Charged in rand: R/);
    assert.ok(emails.quote.html.includes(escapeHtml(pdfUrl)));
    assert.match(emails.owner.html, /&lt;script&gt;/);
    assert.match(emails.owner.html, /mailto:thandi@example\.com/);
    assert.ok(!emails.verification.text.includes("Thandi"), "verification email (to an unproven address) carries no visitor text");
  });
  await check("balance invoices are labelled 'Balance due'", async () => {
    const balance: InvoiceRecord = {
      ...openUsdInvoice,
      id: "inv_balance",
      currency: "ZAR",
      purpose: "balance",
      lines: [...quote.lines, { label: "Less invoice INV-2026-0003 (deposit)", amount: -26160 }],
      total: 39240,
      payment: { ...openUsdInvoice.payment!, charged: undefined },
    };
    assert.match(invoiceEmailToClient(balance, lead, "https://x").text, /For: Balance due/);
    const t = await pdfText(await renderInvoicePdf(balance, lead));
    assert.match(t, /Balance due/);
    assert.match(t, /-R/);
  });

  console.log("admin");
  await check("transcript: the per-turn system context attaches to the visitor turn", () => {
    const entries = toTranscript([
      { role: "user", content: "Hi" },
      { role: "system", content: "[app context]\nNow: today\n[app event] Visitor confirmed." },
      { role: "assistant", content: [{ type: "text", text: "Hello" }, { type: "tool_use", name: "create_quote" }] },
      { role: "user", content: [{ type: "tool_result", content: "ok" }] },
    ]);
    assert.equal(entries.length, 2);
    assert.equal(entries[0].text, "Hi");
    assert.match(entries[0].context, /^\[app context\][\s\S]*\[app event\] Visitor confirmed\.$/);
    assert.deepEqual(entries[1].tools, ["create_quote"]);
  });

  console.log("factories (demo defaults, temp cwd)");
  await check("no env -> file store, mock payments/calendar/email, outbox capture", async () => {
    for (const k of ["DATABASE_URL", "VERCEL", "PAYSTACK_SECRET_KEY", "PAYMENT_PROVIDER", "CALCOM_API_KEY", "CALCOM_EVENT_TYPE_ID", "SCHEDULING_PROVIDER", "RESEND_API_KEY", "ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN"]) {
      delete process.env[k];
    }
    const cwd = process.cwd();
    process.chdir(work);
    try {
      const integrations = await import("@/lib/integrations");
      assert.deepEqual(integrations.integrationStatus(), { ai: false, store: "file", payments: "mock", calendar: "mock", email: "mock" });
      assert.equal(integrations.isMockEmail(), true);
      assert.equal(integrations.getPaymentProvider("mock").name, "mock");
      assert.throws(() => integrations.getPaymentProvider("paystack"), /not active/);
      const store = integrations.getStore();
      assert.equal(store.kind, "file");
      await integrations.getEmail().send({ to: "c@example.com", subject: "Hello", html: "<p>x</p>", text: "x", attachments: [{ filename: "a.pdf", content: new Uint8Array([1]) }] });
      const [entry] = await store.listOutbox(1);
      assert.equal(entry.subject, "Hello");
      assert.deepEqual(entry.attachments, ["a.pdf"]);
      assert.ok((await readdir(join(work, ".data"))).includes("store.json"));
      assert.equal(integrations.getStore(), store, "store is memoised");
    } finally {
      process.chdir(cwd);
    }
  });

  await rm(work, { recursive: true, force: true });
  if (outDir) console.log(`\nartefacts written to ${outDir}`);
  console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
  process.exitCode = failures ? 1 : 0;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
