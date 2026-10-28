/**
 * End-to-end check of the concierge business flow in demo mode (mock
 * payments, calendar and email), driven through src/lib/concierge/actions.ts
 * exactly as the chat engine calls it: lead -> quote -> contact -> verify ->
 * booking -> quote email -> deposit invoice -> signed mock webhook -> paid.
 * Also asserts the security-relevant failure paths.
 *
 *   npx tsx --conditions=react-server scripts/e2e-demo.ts
 *
 * - `--conditions=react-server` makes `import "server-only"` resolve to the
 *   package's empty react-server entry instead of the throwing default.
 * - `@/...` aliases resolve because tsx reads `paths` from tsconfig.json.
 * - Provider env vars are cleared and VERCEL=1 is set before the app modules
 *   are imported (dynamically, below), so the run uses the in-memory store
 *   and never touches .data/ or a real provider.
 * - E2E_STORE=file uses the JSON-file store (.data/store.json under the cwd)
 *   instead, so a running `next dev` can serve the created documents; the
 *   script then prints a document URL and invoice reference for curl checks.
 */
import assert from "node:assert/strict";
import type { ChatCard } from "@/lib/chat/types";
import type { ActionResult } from "@/lib/concierge/actions";

for (const name of [
  "DATABASE_URL",
  "DEMO_MODE",
  "PAYMENT_PROVIDER",
  "PAYSTACK_SECRET_KEY",
  "SCHEDULING_PROVIDER",
  "CALCOM_API_KEY",
  "CALCOM_EVENT_TYPE_ID",
  "RESEND_API_KEY",
  "VAT_REGISTERED",
  "NEXT_PUBLIC_SITE_URL",
]) {
  delete process.env[name];
}
const fileMode = process.env.E2E_STORE === "file";
if (fileMode) delete process.env.VERCEL;
else process.env.VERCEL = "1";
process.env.SESSION_SECRET ||= "e2e-session-secret";
process.env.OWNER_EMAIL = "owner@example.test";
process.env.OWNER_TIMEZONE = "Africa/Johannesburg";

/* ------------------------------------------------------------------ */
/* Harness                                                             */
/* ------------------------------------------------------------------ */

let steps = 0;
async function step<T>(name: string, fn: () => Promise<T> | T): Promise<T> {
  try {
    const value = await fn();
    steps++;
    console.log(`  ok    ${name}`);
    return value;
  } catch (err) {
    console.error(`  FAIL  ${name}\n${String((err as Error)?.stack ?? err).replace(/^/gm, "        ")}`);
    process.exit(1);
  }
}

function card<K extends ChatCard["kind"]>(result: ActionResult, kind: K): Extract<ChatCard, { kind: K }> {
  const found = result.cards.find((c) => c.kind === kind);
  assert.ok(found, `expected a "${kind}" card, got [${result.cards.map((c) => c.kind).join(", ")}]`);
  return found as Extract<ChatCard, { kind: K }>;
}

async function rejects(promise: Promise<unknown>, type: new (...args: never[]) => Error, message?: RegExp) {
  await assert.rejects(promise, (err: unknown) => {
    assert.ok(err instanceof type, `expected ${type.name}, got ${String(err)}`);
    if (message) assert.match((err as Error).message, message);
    return true;
  });
}

/** Wrapped in a function: tsx compiles this script as CommonJS, which has no top-level await. */
async function main() {
  const [actions, integrations, documents, webhooks, { PaystackPayments }, { PDFDocument }, { returnPath }] = await Promise.all([
    import("@/lib/concierge/actions"),
    import("@/lib/integrations"),
    import("@/lib/documents"),
    import("@/app/api/webhooks/payments"),
    import("@/lib/integrations/payments/paystack"),
    import("pdf-lib"),
    import("@/app/demo/checkout/return-path"),
  ]);
  const { ActionError } = actions;

  const tokenOf = (url: string) => new URL(url).searchParams.get("token") ?? "";
  const isPdf = async (bytes: Uint8Array) => {
    assert.equal(Buffer.from(bytes.subarray(0, 5)).toString("latin1"), "%PDF-");
    const doc = await PDFDocument.load(bytes);
    assert.ok(doc.getPageCount() >= 1);
    return doc.getPageCount();
  };

  const run = Date.now().toString(36);
  const sessionA = `e2e-a-${run}`;
  const sessionB = `e2e-b-${run}`;
  const visitor = { name: "Thandi Test", email: `thandi+${run}@example.test`, company: "Acme (Pty) Ltd", consent: true as const };
  const store = integrations.getStore();

  /* ------------------------------------------------------------------ */
  /* Flow                                                                */
  /* ------------------------------------------------------------------ */

  console.log(`e2e demo flow (store: ${store.kind}, session ${sessionA})`);

  await step("demo mode: every side-effecting adapter is a mock", () => {
    const status = integrations.integrationStatus();
    assert.equal(status.store, fileMode ? "file" : "memory");
    assert.equal(status.payments, "mock");
    assert.equal(status.calendar, "mock");
    assert.equal(status.email, "mock");
    assert.ok(integrations.isMockEmail());
  });

  const lead0 = await step("ensureLead creates one lead per session", async () => {
    const lead = await actions.ensureLead(sessionA);
    assert.equal(lead.status, "new");
    assert.equal((await actions.ensureLead(sessionA)).id, lead.id);
    return lead;
  });

  const quoteCard = await step("createQuote prices web-applications / MVP Sprint in ZAR", async () => {
    const r = await actions.createQuote(sessionA, {
      selections: [{ serviceSlug: "web-applications", packageName: "MVP Sprint" }],
      extras: [],
      currency: "ZAR",
      rush: false,
    });
    const q = card(r, "quote");
    assert.equal(q.currency, "ZAR");
    assert.equal(q.total, 45000);
    assert.equal(q.depositPercent, 50);
    assert.match(q.number, /^Q-\d{4}-\d{4}$/);
    assert.ok(documents.verifyDocumentToken("quote", q.quoteId, tokenOf(q.pdfUrl)));
    assert.equal((await store.getLead(lead0.id))?.status, "quoted");
    return q;
  });

  await step("proposeBooking before contact details fails", () =>
    rejects(actions.proposeBooking(sessionA, new Date(Date.now() + 3 * 86_400_000).toISOString(), "Africa/Johannesburg"), ActionError, /contact details/i),
  );

  const demoCode = await step("submitContact sends a verification code (demo code on the card)", async () => {
    const r = await actions.submitContact(sessionA, visitor);
    const v = card(r, "verify_email");
    assert.equal(v.email, visitor.email);
    assert.match(v.demoCode ?? "", /^\d{6}$/);
    const lead = await store.getLead(lead0.id);
    assert.ok(lead?.verification && !lead.emailVerifiedAt);
    assert.notEqual(lead.verification.codeHash, v.demoCode, "code must be stored hashed");
    return v.demoCode!;
  });

  await step("proposeBooking before verification fails", () =>
    rejects(actions.proposeBooking(sessionA, new Date(Date.now() + 3 * 86_400_000).toISOString(), "Africa/Johannesburg"), ActionError, /not verified/i),
  );

  await step("verifyEmail rejects a wrong code", async () => {
    const wrong = demoCode === "000000" ? "111111" : "000000";
    await rejects(actions.verifyEmail(sessionA, wrong), ActionError, /doesn't match/i);
    assert.equal((await store.getLead(lead0.id))?.verification?.attempts, 1);
  });

  await step("verifyEmail accepts the emailed code", async () => {
    const r = await actions.verifyEmail(sessionA, demoCode);
    assert.equal(card(r, "notice").tone, "success");
    const lead = await store.getLead(lead0.id);
    assert.ok(lead?.emailVerifiedAt);
    assert.equal(lead.verification, undefined);
  });

  const slot = await step("listSlots returns mock calendar slots", async () => {
    const r = await actions.listSlots("Africa/Johannesburg", 7);
    const s = card(r, "slots");
    assert.ok(s.slots.length > 0);
    assert.ok(new Date(s.slots[0].start).getTime() > Date.now());
    return s.slots[0];
  });

  const bookingAction = await step("proposeBooking shows a confirm card", async () => {
    const r = await actions.proposeBooking(sessionA, slot.start, "Africa/Johannesburg", "Discuss MVP scope");
    const c = card(r, "confirm");
    assert.equal(c.action, "book_call");
    return c.actionId;
  });

  await step("executing another session's action fails (and does not consume it)", async () => {
    await actions.ensureLead(sessionB);
    await rejects(actions.executeAction(sessionB, bookingAction), ActionError, /could not be found/i);
    assert.equal((await store.getPendingAction(bookingAction))?.status, "proposed");
  });

  await step("executeAction books the call", async () => {
    const r = await actions.executeAction(sessionA, bookingAction);
    const b = card(r, "booking");
    assert.equal(b.start, slot.start);
    assert.equal(b.provider, "mock");
    assert.ok(b.meetingUrl);
    const bookings = await store.listBookings(lead0.id);
    assert.equal(bookings.length, 1);
    assert.equal(bookings[0].status, "confirmed");
    assert.equal((await store.getLead(lead0.id))?.status, "booked");
  });

  await step("executing the same action twice fails", () =>
    rejects(actions.executeAction(sessionA, bookingAction), ActionError, /already handled/i),
  );

  await step("a cancelled action cannot be executed", async () => {
    const r = await actions.proposeQuoteEmail(sessionA, quoteCard.quoteId);
    const id = card(r, "confirm").actionId;
    await actions.cancelAction(sessionA, id);
    await rejects(actions.executeAction(sessionA, id), ActionError, /already handled/i);
  });

  await step("another verified visitor cannot act on this visitor's quote", async () => {
    const r = await actions.submitContact(sessionB, { name: "Other", email: `other+${run}@example.test`, consent: true });
    await actions.verifyEmail(sessionB, card(r, "verify_email").demoCode!);
    await rejects(actions.proposeQuoteEmail(sessionB, quoteCard.quoteId), ActionError, /not found for this visitor/i);
    await rejects(actions.proposeInvoice(sessionB, quoteCard.quoteId, "deposit"), ActionError, /not found for this visitor/i);
  });

  await step("proposeQuoteEmail -> executeAction emails the quote with the PDF", async () => {
    const p = await actions.proposeQuoteEmail(sessionA, quoteCard.quoteId);
    const r = await actions.executeAction(sessionA, card(p, "confirm").actionId);
    const sent = card(r, "email_sent");
    assert.equal(sent.to, visitor.email);
    assert.equal((await store.getQuote(quoteCard.quoteId))?.status, "sent");
  });

  const invoiceCards = await step("proposeInvoice(deposit) -> executeAction issues invoice + payment cards", async () => {
    const p = await actions.proposeInvoice(sessionA, quoteCard.quoteId, "deposit");
    const confirm = card(p, "confirm");
    assert.equal(confirm.action, "create_invoice");
    const r = await actions.executeAction(sessionA, confirm.actionId);
    const inv = card(r, "invoice");
    const pay = card(r, "payment");
    assert.equal(inv.amount, 22500, "deposit is 50% of R45 000");
    assert.equal(pay.amount, 22500);
    assert.equal(pay.currency, "ZAR");
    assert.equal(pay.provider, "mock");
    assert.equal(pay.purpose, "deposit");
    assert.equal(pay.reference, inv.invoiceNumber);
    const payUrl = new URL(pay.url);
    assert.match(payUrl.pathname, /^\/demo\/checkout\/INV-\d{4}-\d{4}$/);
    assert.equal(inv.payUrl, pay.url);
    // The demo checkout returns to the callback URL, which carries the invoice PDF token.
    const back = new URL(payUrl.searchParams.get("return") ?? "", "http://localhost");
    assert.equal(back.pathname, "/pay/complete");
    assert.equal(back.searchParams.get("ref"), inv.invoiceNumber);
    const invoice = await store.getInvoiceByReference(inv.invoiceNumber);
    assert.ok(invoice && documents.verifyDocumentToken("invoice", invoice.id, back.searchParams.get("t") ?? ""));
    assert.equal(returnPath(`${back.pathname}${back.search}`, inv.invoiceNumber), `${back.pathname}${back.search}`);
    assert.equal((await store.getLead(lead0.id))?.status, "invoiced");
    assert.equal((await store.getQuote(quoteCard.quoteId))?.status, "accepted");
    return { inv, pay };
  });
  const reference = invoiceCards.pay.reference;

  await step("issuing the same invoice again returns the existing one", async () => {
    const p = await actions.proposeInvoice(sessionA, quoteCard.quoteId, "deposit");
    const r = await actions.executeAction(sessionA, card(p, "confirm").actionId);
    assert.equal(card(r, "invoice").invoiceNumber, invoiceCards.inv.invoiceNumber);
    assert.equal((await store.listInvoices(lead0.id)).length, 1);
  });

  /* ------------------------------------------------------------------ */
  /* Payment (mock webhook path)                                         */
  /* ------------------------------------------------------------------ */

  const payments = integrations.getPayments();
  const signed = (body: string, signature = integrations.signMockWebhook(body)) =>
    new Headers({ [integrations.MOCK_SIGNATURE_HEADER]: signature });

  await step("fulfilPayment before payment leaves the invoice open", async () => {
    assert.equal((await actions.fulfilPayment(reference))?.status, "open");
    assert.equal(await actions.fulfilPayment("INV-0000-9999"), null);
  });

  await step("mock webhook with a bad signature throws WebhookSignatureError", async () => {
    const body = JSON.stringify({ reference, status: "success" });
    await rejects(payments.parseWebhook(body, signed(body, "0".repeat(64))), integrations.WebhookSignatureError);
    await rejects(payments.parseWebhook(body, signed(body, "abc")), integrations.WebhookSignatureError);
    await rejects(payments.parseWebhook(body, new Headers()), integrations.WebhookSignatureError);
    assert.equal(await integrations.isMockPaid(reference), false);
  });

  await step("signed 'failed' mock event does not mark the invoice paid", async () => {
    const body = JSON.stringify({ reference, status: "failed" });
    const event = await payments.parseWebhook(body, signed(body));
    assert.equal(event.paid, false);
    assert.equal(await integrations.isMockPaid(reference), false);
    assert.equal((await actions.fulfilPayment(reference))?.status, "open");
  });

  const paidInvoice = await step("signed 'success' mock event -> marked paid -> fulfilPayment", async () => {
    const body = JSON.stringify({ reference, status: "success" });
    const event = await payments.parseWebhook(body, signed(body));
    assert.equal(event.paid, true);
    assert.equal(event.reference, reference);
    assert.ok(await integrations.isMockPaid(reference));
    const paid = await actions.fulfilPayment(reference);
    assert.equal(paid?.status, "paid");
    assert.ok(paid.paidAt);
    return paid;
  });

  await step("invoice and lead are paid in the store", async () => {
    assert.equal((await store.getInvoiceByReference(reference))?.status, "paid");
    assert.equal((await store.getLead(lead0.id))?.status, "paid");
  });

  await step("webhook replays are idempotent (route helper: processed, then duplicate; one receipt)", async () => {
    const body = JSON.stringify({ reference, status: "success" });
    const first = await webhooks.processMockEvent(body, signed(body));
    const second = await webhooks.processMockEvent(body, signed(body));
    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(second.outcome, "duplicate");
    const receipts = (await store.listOutbox(200)).filter((e) => e.subject === `Payment received: ${reference}`);
    assert.equal(receipts.length, 1);
    assert.equal((await webhooks.processMockEvent(body, signed(body, "f".repeat(64)))).status, 401);
  });

  await step("paid invoice no longer offers a payment button", async () => {
    const p = await actions.proposeInvoice(sessionA, quoteCard.quoteId, "deposit");
    const r = await actions.executeAction(sessionA, card(p, "confirm").actionId);
    assert.equal(card(r, "invoice").payUrl, undefined);
    assert.equal(r.cards.find((c) => c.kind === "payment"), undefined);
  });

  /* ------------------------------------------------------------------ */
  /* Outbox, documents, signatures                                       */
  /* ------------------------------------------------------------------ */

  await step("outbox has verification, booking, quote, invoice and receipt emails", async () => {
    const outbox = (await store.listOutbox(200)).filter((e) => e.to.includes(visitor.email));
    const find = (re: RegExp) => {
      const hit = outbox.find((e) => re.test(e.subject));
      assert.ok(hit, `no email matching ${re} in [${outbox.map((e) => e.subject).join(" | ")}]`);
      return hit;
    };
    const verification = find(/verification code/i);
    assert.ok(verification.text.includes(demoCode));
    find(/^Discovery call booked/);
    const quote = find(new RegExp(`^Your quote ${quoteCard.number}`));
    assert.deepEqual(quote.attachments, [`${quoteCard.number}.pdf`]);
    const invoice = find(new RegExp(`^Invoice ${reference}`));
    assert.deepEqual(invoice.attachments, [`${reference}.pdf`]);
    find(new RegExp(`^Payment received: ${reference}`));

    const quoteLink = quote.text.match(/https?:\/\/\S+\/api\/documents\/quote\/\S+/)?.[0];
    assert.ok(quoteLink, "quote email links to the PDF");
    assert.ok(documents.verifyDocumentToken("quote", quoteCard.quoteId, tokenOf(quoteLink)));

    const owner = (await store.listOutbox(200)).filter((e) => e.to.includes("owner@example.test")).map((e) => e.subject);
    for (const event of ["New verified lead", "Discovery call booked", "Quote sent", "Invoice issued", "Payment received"]) {
      assert.ok(owner.some((s) => s.includes(event)), `owner notification "${event}" missing`);
    }
  });

  await step("quote and invoice PDFs render", async () => {
    const lead = (await store.getLead(lead0.id))!;
    const quote = (await store.getQuote(quoteCard.quoteId))!;
    await isPdf(await documents.renderQuotePdf(quote, lead));
    await isPdf(await documents.renderInvoicePdf(paidInvoice, lead));
  });

  await step("tampered / mismatched document tokens fail verification", () => {
    const good = tokenOf(documents.documentUrl("invoice", paidInvoice.id));
    assert.ok(good.length >= 32);
    assert.ok(documents.verifyDocumentToken("invoice", paidInvoice.id, good));
    const flipped = good.slice(0, -1) + (good.at(-1) === "A" ? "B" : "A");
    assert.equal(documents.verifyDocumentToken("invoice", paidInvoice.id, flipped), false);
    assert.equal(documents.verifyDocumentToken("invoice", paidInvoice.id, good.slice(0, -1)), false);
    assert.equal(documents.verifyDocumentToken("invoice", paidInvoice.id, ""), false);
    assert.equal(documents.verifyDocumentToken("quote", paidInvoice.id, good), false, "token is bound to the kind");
    assert.equal(documents.verifyDocumentToken("invoice", quoteCard.quoteId, good), false, "token is bound to the id");
  });

  await step("Paystack webhook with a bad signature throws; a good one parses", async () => {
    const paystack = new PaystackPayments("sk_test_e2e_not_a_real_key");
    const body = JSON.stringify({ event: "charge.success", data: { id: 1, reference, amount: 2_250_000, currency: "ZAR" } });
    const header = (sig: string) => new Headers({ [integrations.PAYSTACK_SIGNATURE_HEADER]: sig });
    await rejects(paystack.parseWebhook(body, header("0".repeat(128))), integrations.WebhookSignatureError);
    await rejects(paystack.parseWebhook(body, header("deadbeef")), integrations.WebhookSignatureError);
    await rejects(paystack.parseWebhook(body, new Headers()), integrations.WebhookSignatureError);
    const { createHmac } = await import("node:crypto");
    const good = createHmac("sha512", "sk_test_e2e_not_a_real_key").update(body).digest("hex");
    const event = await paystack.parseWebhook(body, header(good));
    assert.deepEqual([event.paid, event.reference, event.amount, event.currency], [true, reference, 22500, "ZAR"]);
  });

  await step("Paystack webhook route provider is unavailable in demo mode", () => {
    assert.throws(() => integrations.getPaymentProvider("paystack"), integrations.IntegrationConfigError);
    assert.equal(webhooks.webhookProvider("paystack"), null);
    assert.equal(webhooks.webhookProvider("mock")?.name, "mock");
  });

  await step("demo checkout return path only allows this invoice's /pay/complete", () => {
    const ref = "INV-2026-0001";
    const fallback = "/pay/complete?ref=INV-2026-0001";
    assert.equal(returnPath("/pay/complete?ref=INV-2026-0001&t=abc", ref), "/pay/complete?ref=INV-2026-0001&t=abc");
    for (const bad of ["//evil.example/pay/complete?ref=INV-2026-0001", "https://evil.example/", "/admin", "/pay/complete?ref=INV-2026-0002", "/pay/complete/../admin?ref=INV-2026-0001", undefined]) {
      assert.equal(returnPath(bad, ref), fallback, String(bad));
    }
  });

  /* ------------------------------------------------------------------ */
  /* Concurrency and provider binding                                    */
  /* ------------------------------------------------------------------ */

  const sessionC = `e2e-c-${run}`;
  const leadC = await step("setup: a third verified visitor with a quote", async () => {
    const r = await actions.submitContact(sessionC, { name: "Race Test", email: `race+${run}@example.test`, consent: true });
    await actions.verifyEmail(sessionC, card(r, "verify_email").demoCode!);
    return actions.ensureLead(sessionC);
  });
  const quoteC = card(
    await actions.createQuote(sessionC, { selections: [{ serviceSlug: "cloud-backends", packageName: "API Starter" }], extras: [], currency: "ZAR", rush: false }),
    "quote",
  );

  await step("double-clicked confirm executes once (one booking)", async () => {
    const slots = card(await actions.listSlots("Africa/Johannesburg", 7), "slots").slots;
    const id = card(await actions.proposeBooking(sessionC, slots[1].start, "Africa/Johannesburg"), "confirm").actionId;
    const results = await Promise.allSettled([1, 2, 3].map(() => actions.executeAction(sessionC, id)));
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal((await store.listBookings(leadC.id)).length, 1);
  });

  await step("parallel wrong verification codes still hit the 5-attempt limit", async () => {
    const sessionD = `e2e-d-${run}`;
    const code = card(await actions.submitContact(sessionD, { name: "Guess", email: `guess+${run}@example.test`, consent: true }), "verify_email").demoCode!;
    const wrong = Array.from({ length: 10 }, (_, i) => String((Number(code) + 1 + i) % 1_000_000).padStart(6, "0"));
    const results = await Promise.allSettled(wrong.map((c) => actions.verifyEmail(sessionD, c)));
    assert.ok(results.every((r) => r.status === "rejected"));
    assert.equal((await actions.ensureLead(sessionD)).verification?.attempts, 5);
    await rejects(actions.verifyEmail(sessionD, code), ActionError, /too many attempts/i);
  });

  const refC = await step("two invoice confirmations at once issue one invoice", async () => {
    const ids = await Promise.all([1, 2].map(async () => card(await actions.proposeInvoice(sessionC, quoteC.quoteId, "deposit"), "confirm").actionId));
    const results = await Promise.all(ids.map((id) => actions.executeAction(sessionC, id)));
    const numbers = new Set(results.map((r) => card(r, "invoice").invoiceNumber));
    assert.equal(numbers.size, 1);
    assert.equal((await store.listInvoices(leadC.id)).length, 1);
    return [...numbers][0];
  });

  await step("concurrent confirmations of one payment send one receipt", async () => {
    const body = JSON.stringify({ reference: refC, status: "success" });
    await payments.parseWebhook(body, signed(body));
    const settled = await Promise.all([1, 2, 3].map(() => actions.fulfilPayment(refC)));
    assert.ok(settled.every((i) => i?.status === "paid"));
    const receipts = (await store.listOutbox(200)).filter((e) => e.subject === `Payment received: ${refC}`);
    assert.equal(receipts.length, 1);
  });

  await step("an invoice issued through Paystack cannot be settled by the mock checkout", async () => {
    const ref = `INV-E2E-${run}`;
    await store.saveInvoice({
      id: `inv_e2e_${run}`,
      number: ref,
      leadId: leadC.id,
      createdAt: new Date().toISOString(),
      dueDate: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      currency: "ZAR",
      lines: [{ label: "Test", amount: 1000 }],
      total: 1000,
      purpose: "full",
      status: "open",
      payment: { provider: "paystack", reference: ref, url: "https://checkout.paystack.com/x" },
    });
    const body = JSON.stringify({ reference: ref, status: "success" });
    const outcome = await webhooks.processMockEvent(body, signed(body));
    assert.equal(outcome.status, 200);
    assert.equal((await store.getInvoiceByReference(ref))?.status, "open");
  });

  await step("VAT_REGISTERED=true: the payment link charges the VAT-inclusive amount the PDF shows", async () => {
    process.env.VAT_REGISTERED = "true";
    try {
      const q = card(
        await actions.createQuote(sessionC, { selections: [{ serviceSlug: "mentoring", packageName: "Mentoring Pack" }], extras: [], currency: "ZAR", rush: false }),
        "quote",
      );
      const confirm = card(await actions.proposeInvoice(sessionC, q.quoteId, "full"), "confirm");
      assert.ok(confirm.summary.some((line) => line.includes("incl. VAT")));
      const r = await actions.executeAction(sessionC, confirm.actionId);
      assert.equal(card(r, "payment").amount, 4370, "R3 800 + 15% VAT");
      assert.equal(card(r, "invoice").amount, 4370);
      const email = (await store.listOutbox(200)).find((e) => e.subject.startsWith(`Tax Invoice ${card(r, "invoice").invoiceNumber}`));
      assert.ok(email?.subject.includes("4 370,00"), email?.subject);
    } finally {
      delete process.env.VAT_REGISTERED;
    }
  });

  console.log(`\n${steps} steps passed.`);
  if (fileMode) {
    const quoteUrl = new URL(documents.documentUrl("quote", quoteCard.quoteId));
    console.log(`E2E_QUOTE_PATH=${quoteUrl.pathname}${quoteUrl.search}`);
    console.log(`E2E_INVOICE_REF=${reference}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
