# mxolisi.dev — services website

The services website for **Mxolisi Khumalo**, a full-stack developer in Johannesburg. It sells services rather than showing a portfolio: every service lists deliverables, packages and "from" prices, and each one is backed by evidence. That evidence is real, inspectable code from public GitHub repositories.

An AI concierge (**Byte**) sits beside a 3D robot whose eyes follow your cursor. It scopes a visitor's project and prices it with a deterministic quote engine. Once the visitor confirms, it books a discovery call, emails the quote as a PDF, or issues an invoice with a secure payment link.

## Stack

- **Next.js 16** (App Router), **React 19**, **TypeScript**, **Tailwind CSS v4**
- **Motion:** GSAP + ScrollTrigger + SplitText, Lenis smooth scroll, a hand-written WebGL background shader, and React Three Fiber for the robot
- **Concierge:** Claude API (`@anthropic-ai/sdk`). It uses a streaming tool-use loop and server-owned transcripts, and has a scripted demo engine for running without keys.
- **Integrations** (each provider sits behind an adapter and has a mock):
  - Paystack for payments
  - Cal.com for scheduling
  - Resend for email
  - Postgres (Neon) or a JSON-file store for data
  - pdf-lib for quote and invoice PDFs

## Run it locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. With **no environment variables set**, the whole site runs in **demo mode**:

- The concierge uses a scripted engine that follows the same flow as the AI one.
- Emails are captured at `/demo/outbox`. The verification code is shown in the chat (only while payments, calendar and email are all mocks).
- Bookings use a mock calendar.
- Payments go to a fake checkout at `/demo/checkout/<ref>`, where you can simulate success or failure.
- Data is stored in `.data/store.json`.

To switch on the real AI concierge, set `ANTHROPIC_API_KEY`. See [`docs/INTEGRATIONS.md`](docs/INTEGRATIONS.md) for every provider, and [`.env.example`](.env.example) for all variables.

## How the concierge stays safe

- **Server-owned history.** The browser sends only the new message or button click. The full transcript, including the Claude tool calls, lives on the server and is append-only.
- **Fixed tool allowlist** (`src/lib/chat/server/tools.ts`). No tool can fetch URLs or run code. Every tool input is validated with Zod.
- **Prices are never the model's.** `src/lib/concierge/pricing.ts` computes every amount from the published catalogue (`src/content/services.ts`). Invoices and payments are derived from stored quotes.
- **Verify, then confirm.**
  - The visitor proves they own their email with a 6-digit code. The code is bound to that address, and codes are rate-limited per conversation, per address and site-wide.
  - Booking, emailing and invoicing are only *proposed* by the assistant. They run when the visitor presses the confirm button (`src/lib/concierge/actions.ts`).
- **Fixed email templates.** The only variable parts are names, numbers, dates and links.
- **Rate and cost limits:**
  - per-IP rate limit
  - verification, booking and owner-handoff email limits kept in the store
  - 40-turn cap per conversation
  - 2 000-character messages
  - `max_tokens` cap per model call
  - low default effort
- **POPIA:** a notice gate before chatting, a consent checkbox on the contact form, `/privacy`, and JSON export per lead in `/admin`.

## Project structure

```
src/
  app/                 routes (home, services, work, privacy, terms, admin, demo, api)
  components/
    background/        WebGL immersive background
    concierge/         chat panel, cards, floating dock, 3D BotHead, MiniBot
    cursor/            custom cursor
    home/ pages/       page sections
    layout/            nav, footer, preloader
    ui/                RevealText, Magnetic, Button, Marquee, ScrambleLabel
  content/             services, case studies, profile (single source of truth)
  lib/
    chat/              client store, stream types, server engine (Claude + demo)
    concierge/         business actions + pricing engine
    integrations/      store / payments / calendar / email adapters
    documents/         PDFs, email templates, signed document links
```

## Editing content

All copy, prices and evidence live in `src/content/`. Evidence items point at a repository file (`fileRef`), so a visitor can check the claim. Change prices in `services.ts`; the concierge's quote engine and system prompt pick them up automatically.

## Deploying

Deploy to Vercel with **Root Directory = `services-site`**. Then set the environment variables from `.env.example`, at minimum:

- `NEXT_PUBLIC_SITE_URL`
- `SESSION_SECRET`
- `OWNER_EMAIL`

Add the provider keys you want live. Without `DATABASE_URL`, data on Vercel is kept in memory and resets, so add Neon Postgres for production. Set `ADMIN_PASSWORD` too: in production `/admin` and `/demo/outbox` return 404 without it. Switch on Resend before Cal.com or Paystack; with those live and email mocked, production refuses email verification (see [`docs/INTEGRATIONS.md`](docs/INTEGRATIONS.md)).
