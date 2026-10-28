# Integrations and go-live guide

This site's AI concierge can scope a project, produce a priced quote, book a discovery call, issue an invoice and take a payment. Each of those steps goes through a small adapter:

| Capability | Live adapter | Fallback (demo) adapter |
| --- | --- | --- |
| Chat | Claude API | Scripted demo assistant |
| Storage | Postgres (Neon) | `.data/store.json` locally, in-memory on Vercel |
| Payments | Paystack | Mock checkout at `/demo/checkout/<invoice>` |
| Scheduling | Cal.com | Mock calendar with generated slots |
| Email | Resend | Captured at `/demo/outbox` |

Every adapter goes live as soon as its environment variables are set. Anything left unset falls back to its mock, so you can switch things on one at a time.

To check what is live, open **`/api/health`** on any deployment. It returns adapter names only and never shows secrets.

---

## 1. Demo mode

With **no environment variables at all**, everything still works on your machine:

- **Chat.** The concierge runs a scripted flow. It uses the real pricing engine, quote numbering and PDFs.
- **Storage.** Records are written to `.data/store.json`, which git ignores. On Vercel they are kept in memory and reset whenever the function restarts.
- **Payments.** A payment link opens `/demo/checkout/<invoice number>`, a fake hosted checkout with two buttons: "Simulate successful payment" and "Simulate failed payment". A successful simulation follows the same signed-webhook path as a real Paystack payment: the invoice is marked paid, a receipt email is sent and you are notified.
- **Calendar.** Bookable slots are generated, and each booking gets a placeholder meeting link.
- **Email.** Nothing is sent. Every message (verification codes, quotes, invoices, booking confirmations, receipts, owner notifications) appears at `/demo/outbox`, where you can preview it. While payments, calendar and email are *all* mocks, the chat also shows the verification code, since no email arrives.
- **Admin.** `/admin` and `/demo/outbox` are open while you run `npm run dev` and no `ADMIN_PASSWORD` is set.

Setting **`DEMO_MODE=true`** forces payments, calendar and email back to their mocks even when keys are present. Use it for preview deployments and screenshots. Storage still follows `DATABASE_URL`.

> **Before you take real clients, read this.** On a production deployment without `PAYSTACK_SECRET_KEY`, invoices still link to the **demo checkout**. Clients would "pay" without any money moving. Set the Paystack key, leave `DEMO_MODE` unset, then check that `/api/health` shows `"payments":"paystack"`.
>
> **Switch on email before payments or Cal.com.** A verification code proves an address only if it is really emailed. If Cal.com or Paystack is live but `RESEND_API_KEY` is not set, the code is never shown in the chat, and in production the concierge refuses to verify at all: visitors are asked to email you instead, and nothing can be booked, emailed or invoiced. In development the code lands in `/demo/outbox`.

### Run it locally

```bash
cd services-site
cp .env.example .env.local   # optional: every value can stay empty
npm install
npm run dev
```

Open http://localhost:3000, start the concierge and ask for a quote. Then try a booking and a deposit payment. Follow the emails at http://localhost:3000/demo/outbox and the records at http://localhost:3000/admin.

---

## 2. Step-by-step setup

Put every value in `.env.local` for local work and in **Vercel → Project → Settings → Environment Variables** for deployments. `.env.example` lists every variable with a one-line description.

### 2.1 `SESSION_SECRET` (do this first)

This secret signs PDF links, demo webhooks and the hashes used for rate limiting. Generate one:

```bash
openssl rand -base64 32
```

Use a different value for Production and Preview. Changing it later breaks every PDF link that has already been emailed. The documents themselves are unaffected; clients just need fresh links.

### 2.2 Claude API (AI concierge)

1. Create a key at https://console.anthropic.com → **API keys**.
2. Set a monthly spend limit under **Billing → Limits** in the same console.
3. Set these variables:
   - `ANTHROPIC_API_KEY`: the key.
   - `ANTHROPIC_MODEL`: optional. Leave it empty to use the app's default model.
   - `CHAT_EFFORT`: optional. `low` suits conversational turns; raise it to `medium` if scoping answers feel shallow.
4. Without a key, the scripted assistant answers instead.

### 2.3 Paystack (payments)

Paystack is Stripe's South African company. It settles in **ZAR only**. USD quotes are charged as rand at the `USD_ZAR_RATE` you set, and the invoice shows both amounts.

1. Sign up at https://paystack.com as a South African business (sole proprietor is fine).
2. Go to **Settings → API Keys & Webhooks** and switch to **Test mode**. Copy the **test secret key** (`sk_test_…`) into `PAYSTACK_SECRET_KEY`. Do not set `PAYMENT_PROVIDER`; Paystack is picked automatically when the key is present.
3. Still in **Test mode**, set the **Webhook URL** to:
   ```
   https://<your-domain>/api/webhooks/paystack
   ```
   The webhook is verified with your secret key (HMAC-SHA512 in the `x-paystack-signature` header). There is no separate webhook secret.
4. Callback URL: there is nothing to configure. Every payment link sends the client back to `https://<your-domain>/pay/complete?ref=<invoice number>`. That page checks the payment with Paystack's API before showing "paid", so `NEXT_PUBLIC_SITE_URL` must be your real domain.
5. Set `USD_ZAR_RATE`, for example `18.25`, if you quote in USD. Update it now and then.
6. Test it: run a deposit payment from the chat with Paystack's test cards. Then confirm the invoice turns **paid** in `/admin` and a receipt arrives.
7. Going live:
   - complete Paystack's compliance and activation steps;
   - change the key to `sk_live_…`;
   - set the **Live** webhook URL. It is a separate field from the Test one.

Invoices against a quote: the concierge offers the **deposit** or **full** amount while nothing has been invoiced on that quote. After that it can only issue the **balance** (the quote total less every invoice that isn't void), and it refuses once the quote is fully invoiced. Void an invoice in the database to reissue it.

How fulfilment works: the webhook and the return page both call one fulfilment routine. That routine:

- re-verifies the transaction with Paystack, server to server;
- checks the amount and currency against what the payment link asked for (recorded on the invoice when it was issued, so a later `VAT_REGISTERED` change doesn't strand a payment);
- marks the invoice paid;
- emails the receipt and notifies you.

It is idempotent, so retries and duplicate deliveries do no harm.

### 2.4 Cal.com (discovery calls)

1. Create an account at https://cal.com and connect your **Google Calendar** under **Settings → Calendars**. Cal.com then handles availability, Google Meet links and invites.
2. Create an event type, for example "Discovery call", 30 minutes long. Give it Google Meet as the location, a 15-minute buffer and at least 24 hours' minimum notice.
3. Open the event type. The number in the URL (`/event-types/<id>`) goes in `CALCOM_EVENT_TYPE_ID`.
4. Create an API key under **Settings → Developer → API keys** and put it in `CALCOM_API_KEY`.
5. Add a webhook under **Settings → Developer → Webhooks**:
   - **Subscriber URL**: `https://<your-domain>/api/webhooks/calcom`
   - **Triggers**: *Booking cancelled* and *Booking rescheduled*
   - **Secret**: a random string (`openssl rand -hex 24`), also stored as `CALCOM_WEBHOOK_SECRET`

   With the webhook in place, calls the client cancels or moves through Cal.com's own emails stay in sync in `/admin`. Without the secret, the endpoint returns 404.
6. `SCHEDULING_PROVIDER` is optional. Cal.com is used automatically once the key and event type id are both set.

The concierge only books the exact slots it offered, one upcoming call per visitor, and at most 3 calls per verified email address per week. Clients move a call with the reschedule link in Cal.com's confirmation email. You can also limit bookings per booker in the Cal.com event type settings.

### 2.5 Resend (email)

1. Create an account at https://resend.com.
2. Go to **Domains → Add domain** and use a sending subdomain such as `mail.yourdomain.co.za`. That keeps your main domain's reputation separate.
3. At your DNS host, add the records Resend shows you:
   - **SPF**: a TXT record on the subdomain, plus the MX record Resend uses for bounces;
   - **DKIM**: the TXT record (`resend._domainkey…`).
4. Add a **DMARC** record for your domain. Start in monitoring mode, then tighten it to `p=quarantine` once reports look clean:
   ```
   _dmarc.yourdomain.co.za  TXT  "v=DMARC1; p=none; rua=mailto:you@yourdomain.co.za"
   ```
5. Wait for the domain to show **Verified**, then create an API key with *Sending access*.
6. Set these variables:
   - `RESEND_API_KEY`
   - `EMAIL_FROM`: for example `Mxolisi Khumalo <hello@mail.yourdomain.co.za>`
   - `OWNER_EMAIL`: where lead, booking and payment notifications go. It is also the reply-to address on client emails.
7. The free tier allows about 100 emails a day and 3,000 a month, which is plenty to start with.

Client emails are fixed templates. The bot cannot write free-form email to arbitrary addresses, and nothing except the 6-digit verification code is sent to an address until it is verified. The verification email contains no visitor-supplied text (not even the name), and a code only verifies the address it was sent to.

Verification emails are rate-limited in the store, so the limits hold across sessions and server instances:

- 3 codes per hour per conversation;
- 3 per hour and 10 per day per recipient address;
- 200 per day for the whole site. Set `VERIFICATION_EMAILS_PER_DAY` to change this; keep it well under your Resend quota so quotes, invoices and receipts still go out.

"Handoff requested" emails to you are sent at most once per visitor per day and 20 times a day in total (`HANDOFF_EMAILS_PER_DAY`).

### 2.6 Neon Postgres (storage)

1. In Vercel, open the project and go to **Storage → Browse Marketplace → Neon → Create**. Pick the region closest to your clients that is available (an EU region is typical for South Africa), then **Connect** it to the project.
2. Vercel adds `DATABASE_URL` to the project's environment variables for you. For local work, copy it into `.env.local`, or leave it unset to keep using the local file store.
3. There is no migration step: the tables are created automatically on first use.
4. Your data now lives outside South Africa. Say so in the privacy notice (see §4).

### 2.7 `ADMIN_PASSWORD` (owner dashboard)

1. Generate a long password: `openssl rand -base64 24`.
2. Set `ADMIN_PASSWORD` and sign in at `https://<your-domain>/admin/login`.

From there:

- **Dashboard.** `/admin` shows integration status, leads, quotes, invoices, bookings and conversation transcripts.
- **Sessions.** A session lasts 8 hours, and the cookie is httpOnly, Secure and SameSite=Lax. Changing the password signs every session out.
- **Login limit.** Five attempts per 15 minutes per IP, counted separately on each server instance.
- **Without a password.** `/admin` is open under `npm run dev` and returns **404 everywhere else**, so a deployment never exposes it by accident.
- **Outbox.** `/demo/outbox` follows the same rule in production: it needs an admin sign-in, and returns 404 without `ADMIN_PASSWORD`, because it holds every visitor's names, emails and signed document links.

### 2.8 Business details on documents

Set these so quotes and invoices carry the details ECTA s43 requires:

- `BUSINESS_LEGAL_NAME`
- `BUSINESS_ADDRESS`
- `OWNER_TIMEZONE`, for example `Africa/Johannesburg`
- `NEXT_PUBLIC_CONTACT_EMAIL`, the address shown on the site

Leave `VAT_REGISTERED` unset until you are registered (see §4.2).

---

## 3. Deploying to Vercel

1. Push the repository to GitHub and choose **Add New → Project** in Vercel.
2. Set **Root Directory** to **`services-site`**. Vercel detects Next.js and needs no extra build settings.
3. Add the environment variables for **Production**:
   - `NEXT_PUBLIC_SITE_URL=https://<your-domain>`, with no trailing slash;
   - `SESSION_SECRET` and `ADMIN_PASSWORD`;
   - the provider keys from §2.
4. For **Preview**, use test keys, or set `DEMO_MODE=true`, and give it its own `SESSION_SECRET`.
5. Add your custom domain under **Settings → Domains**.
6. Point the Paystack and Cal.com webhooks at the production domain.
7. After each deploy, open `https://<your-domain>/api/health`. It should report the adapters you expect, for example `"payments":"paystack"`, `"email":"resend"`, `"store":"postgres"` and `"ai":true`.

Security headers (HSTS, `X-Frame-Options: DENY`, `nosniff`, a strict referrer policy and a permissions policy) are set in `next.config.ts`. A Content-Security-Policy is not set yet; add one once the site's embeds are final.

### Endpoint reference

| Endpoint | Purpose | Verification |
| --- | --- | --- |
| `POST /api/webhooks/paystack` | Payment events | `x-paystack-signature`: HMAC-SHA512 of the raw body, keyed with `PAYSTACK_SECRET_KEY`. 404 when Paystack isn't configured. |
| `POST /api/webhooks/calcom` | Booking cancelled or rescheduled | `X-Cal-Signature-256`: hex HMAC-SHA256 of the raw body, keyed with `CALCOM_WEBHOOK_SECRET`. 404 when the secret is unset. |
| `POST /api/webhooks/mock` | Demo payments | `x-mock-signature`: hex HMAC-SHA256 keyed with `SESSION_SECRET`. 404 unless the mock payment provider is active. |
| `GET /api/documents/{quote\|invoice}/{id}?token=` | Quote and invoice PDFs | HMAC token from the signed link. Every failure returns 404. |
| `GET /pay/complete?ref=` | Payment return page | Re-verifies with the provider and is rate-limited. Without the document token (`&t=`, on every payment return link) it shows the status only; invoice details, the masked email, the payment link and the PDF need the token. |
| `GET /api/health` | Adapter status | Public. Names only. |

Every webhook event is recorded once per provider event id. A bad signature gets 401. If processing fails, the endpoint returns 500 so the provider retries. A payment retry is processed again only while the invoice is still open; a Cal.com event is recorded only after its update is saved, so a retry applies it in full.

---

## 4. Compliance checklist (South Africa)

This checklist is practical guidance, not legal or tax advice. Confirm the details with a qualified adviser.

### 4.1 POPIA (Protection of Personal Information Act)

- [ ] **Information Officer.** As a sole proprietor you are automatically the Information Officer. Register on the Information Regulator's eServices portal (https://eservices.inforegulator.org.za). Sole proprietors may need to enter their details by hand.
- [ ] **Privacy notice** (`/privacy`). It must name you and give contact details. It must also say:
  - that visitors are talking to an AI assistant;
  - what is collected (messages, name, email, company, optional phone) and why (scoping, quotes, bookings, invoicing, follow-up on that enquiry);
  - how long it is kept and who receives it;
  - what rights visitors have, including complaining to the Information Regulator.
- [ ] **Operators and cross-border transfer (s72).** Accept each vendor's data processing terms and list them in the notice: Anthropic, Vercel, Neon, Resend, Cal.com (and Google), Paystack. Say that data is processed outside South Africa (US and EU).
- [ ] **Minimal collection.** The chat asks only for what a quote needs and never asks for ID numbers, health or religious details. Do not add fields like that.
- [ ] **Access requests.** Open the lead in `/admin`, click **Export JSON** and send the file to the person. It contains their record, quotes, invoices, bookings and transcript.
- [ ] **Deletion and retention.** Delete leads that never converted after a set period (for example 12 months). Keep quotes, invoices and payment records for at least **5 years** (Tax Administration Act). Deletion is currently done by hand in the database.
- [ ] **Direct marketing (s69).** Only email people who opted in, or existing clients about similar services, and include an opt-out in every marketing email. Enquiry emails sent by the concierge are not marketing.
- [ ] **Breach response (s22).** If personal data may have been exposed:
  - rotate the keys (`SESSION_SECRET`, provider keys, `ADMIN_PASSWORD`);
  - notify the Regulator through the eServices portal;
  - tell the affected people as soon as reasonably possible.

### 4.2 VAT

- [ ] **While you are not registered.** Leave `VAT_REGISTERED` unset. Invoices are titled "Invoice", carry "Not a VAT vendor — no VAT charged" and add no VAT.
- [ ] **Compulsory registration.**
  - When it applies: once taxable supplies pass **R2.3 million in any 12-month period**. That threshold applies from **1 April 2026** (Budget 2026; it was R1 million before).
  - Deadline: apply within 21 business days of crossing it.
  - Voluntary registration is reportedly possible from about R120,000.
  - **Confirm the current thresholds and your position with a tax practitioner.**
- [ ] **Once you are registered.** Set `VAT_REGISTERED=true` and `VAT_NUMBER`. Documents then become "Tax Invoice" and add 15% VAT to ZAR amounts. Services to foreign clients may qualify for zero-rating; only apply that after your accountant confirms it.

### 4.3 ECTA (Electronic Communications and Transactions Act)

- [ ] **s43 disclosures** on the site:
  - full name and legal status (sole proprietor);
  - physical address;
  - contact details;
  - service descriptions and prices;
  - payment, refund and cancellation terms (`/terms`);
  - the privacy policy.
- [ ] **s44 cooling-off.** Check how the 7-day cooling-off right applies to services that start straight away at the client's request, and cover it in the terms the client accepts with a quote.
- [ ] Card details never touch this site; payments run on the provider's hosted checkout.
