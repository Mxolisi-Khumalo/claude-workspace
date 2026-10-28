"use client";

import Link from "next/link";
import { useState } from "react";
import { clsx } from "clsx";
import { sendChat } from "@/lib/chat/client";
import type { ChatCard } from "@/lib/chat/types";
import { date, dateTime, money } from "@/lib/format";

/**
 * Interactive cards rendered from server tool results. Cards never trust the
 * model's text for numbers or links — they render exactly what the server
 * computed.
 */

const shell = "rounded-2xl border border-line bg-surface/80 p-4 backdrop-blur";
const label = "font-mono text-[10px] uppercase tracking-[0.16em] text-fg-subtle";
const btn =
  "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-[background,color,box-shadow,opacity] disabled:cursor-not-allowed disabled:opacity-50";
const btnPrimary = `${btn} bg-accent text-accent-ink hover:shadow-[var(--glow-accent)]`;
const btnGhost = `${btn} border border-line-strong text-fg hover:border-accent hover:text-accent`;

const TONE = { accent: "text-accent", violet: "text-violet", amber: "text-amber", sky: "text-sky" } as const;

function Header({ eyebrow, title, tone = "accent" }: { eyebrow: string; title: string; tone?: keyof typeof TONE }) {
  return (
    <div className="mb-3">
      <p className={label}>
        <span className={TONE[tone]}>●</span> {eyebrow}
      </p>
      <p className="mt-1 font-semibold text-fg">{title}</p>
    </div>
  );
}

function ServiceMatch({ card }: { card: Extract<ChatCard, { kind: "service_match" }> }) {
  return (
    <div className="grid gap-2">
      {card.services.map((s) => (
        <Link
          key={s.slug}
          href={`/services/${s.slug}`}
          data-cursor="view"
          data-cursor-label="Open"
          className={`${shell} group block transition-colors hover:border-accent/60`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-fg transition-colors group-hover:text-accent">{s.title}</p>
              <p className="mt-1 text-sm text-fg-muted">{s.tagline}</p>
            </div>
            <span className="shrink-0 text-fg-subtle transition-transform group-hover:translate-x-1 group-hover:text-accent">→</span>
          </div>
          <p className="mt-3 font-mono text-xs text-fg-subtle">
            from {money(s.fromZar, "ZAR")} · {money(s.fromUsd, "USD")}
          </p>
        </Link>
      ))}
    </div>
  );
}

function ContactForm({ card, active }: { card: Extract<ChatCard, { kind: "contact_form" }>; active: boolean }) {
  const [sent, setSent] = useState(false);
  return (
    <form
      className={shell}
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const field = (name: string) => String(f.get(name) ?? "").trim();
        setSent(true);
        // Unlock the form again if the details were rejected or the request failed.
        void sendChat({
          action: {
            type: "submit_contact",
            website: String(f.get("website") ?? ""),
            contact: {
              name: field("name"),
              email: field("email"),
              company: field("company") || undefined,
              phone: field("phone") || undefined,
              consent: true,
            },
          },
        }).then((ok) => {
          if (!ok) setSent(false);
        });
      }}
    >
      <Header eyebrow="Your details" title={card.reason ? `Share your details ${card.reason}` : "Share your details"} />
      <fieldset disabled={sent || !active} className="grid gap-2.5">
        <div className="grid gap-2.5 sm:grid-cols-2">
          {/* Same rules as the server (engine.ts), so mistakes are caught before sending. */}
          <Input name="name" label="Full name" autoComplete="name" required pattern=".*\S.*" title="Please enter your name" defaultValue={card.prefill?.name} />
          <Input
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
            required
            pattern="[^\s@]+@[^\s@]+\.[^\s@]{2,}"
            title="Please enter a full email address, like name@company.com"
            defaultValue={card.prefill?.email}
          />
          <Input name="company" label="Company (optional)" autoComplete="organization" defaultValue={card.prefill?.company} />
          <Input name="phone" label="Phone (optional)" type="tel" autoComplete="tel" defaultValue={card.prefill?.phone} />
        </div>
        {/* Honeypot: hidden from people, tempting to bots. */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
        <label className="flex items-start gap-2.5 text-xs leading-relaxed text-fg-muted">
          <input type="checkbox" required name="consent" className="mt-0.5 accent-[var(--accent)]" />
          <span>
            I agree that my details may be stored and used to respond to this enquiry, as described in the{" "}
            <Link href="/privacy" className="text-accent underline underline-offset-2" target="_blank">
              privacy notice
            </Link>
            .
          </span>
        </label>
        <button type="submit" className={`${btnPrimary} mt-1 w-full`}>
          {sent ? "Sent" : "Continue"}
        </button>
      </fieldset>
    </form>
  );
}

function Input({ label: text, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="grid gap-1">
      <span className={label}>{text}</span>
      <input
        {...props}
        className="rounded-xl border border-line bg-bg/60 px-3 py-2 text-base text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-accent md:text-sm"
      />
    </label>
  );
}

function VerifyEmail({ card, active }: { card: Extract<ChatCard, { kind: "verify_email" }>; active: boolean }) {
  const [code, setCode] = useState("");
  return (
    <form
      className={shell}
      onSubmit={(e) => {
        e.preventDefault();
        if (code.length === 6) void sendChat({ action: { type: "verify_email", code } });
      }}
    >
      <Header eyebrow="Verify your email" title={`Enter the 6-digit code sent to ${card.email}`} tone="sky" />
      {card.demoCode && (
        <p className="mb-3 rounded-lg border border-amber/30 bg-amber/10 px-3 py-2 text-xs text-amber">
          Demo mode — no email was sent. Your code is <span className="font-mono font-semibold">{card.demoCode}</span>
        </p>
      )}
      <fieldset disabled={!active} className="flex gap-2">
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          aria-label="Verification code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          className="w-full rounded-xl border border-line bg-bg/60 px-3 py-2 text-center font-mono text-lg tracking-[0.5em] text-fg outline-none focus:border-accent"
        />
        <button type="submit" className={btnPrimary} disabled={code.length !== 6}>
          Verify
        </button>
      </fieldset>
      {active && (
        <button type="button" className="mt-2 text-xs text-fg-muted underline-offset-4 hover:text-fg hover:underline" onClick={() => void sendChat({ action: { type: "resend_code" } })}>
          Send a new code
        </button>
      )}
    </form>
  );
}

function Confirm({ card, active }: { card: Extract<ChatCard, { kind: "confirm" }>; active: boolean }) {
  const [choice, setChoice] = useState<"confirmed" | "cancelled" | null>(null);
  const [mountedAt] = useState(() => Date.now());
  const expired = new Date(card.expiresAt).getTime() < mountedAt;
  return (
    <div className={clsx(shell, "border-accent/40 shadow-[0_0_40px_-20px_var(--accent)]")}>
      <Header eyebrow="Please confirm" title={card.title} />
      <ul className="mb-4 space-y-1 text-sm text-fg-muted">
        {card.summary.map((s) => (
          <li key={s} className="flex gap-2">
            <span className="text-accent">›</span>
            {s}
          </li>
        ))}
      </ul>
      {choice ? (
        <p className="font-mono text-xs text-fg-subtle">{choice === "confirmed" ? "Confirmed" : "Cancelled"}</p>
      ) : expired || !active ? (
        <p className="font-mono text-xs text-fg-subtle">{expired ? "This confirmation has expired." : "No longer active."}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={btnPrimary}
            onClick={() => {
              setChoice("confirmed");
              // Only optimistic: if nothing was confirmed, offer the buttons again.
              void sendChat({ action: { type: "confirm_action", actionId: card.actionId } }).then((ok) => {
                if (!ok) setChoice(null);
              });
            }}
          >
            {card.confirmLabel}
          </button>
          <button
            type="button"
            className={btnGhost}
            onClick={() => {
              setChoice("cancelled");
              void sendChat({ action: { type: "cancel_action", actionId: card.actionId } }).then((ok) => {
                if (!ok) setChoice(null);
              });
            }}
          >
            Not now
          </button>
        </div>
      )}
    </div>
  );
}

function Quote({ card, active }: { card: Extract<ChatCard, { kind: "quote" }>; active: boolean }) {
  const deposit = Math.round((card.total * card.depositPercent) / 100);
  return (
    <div className={clsx(shell, "overflow-hidden p-0")}>
      <div className="flex items-start justify-between gap-4 border-b border-line bg-gradient-to-r from-accent/10 via-transparent to-violet/10 p-4">
        <div>
          <p className={label}>Quote {card.number}</p>
          <p className="display mt-1 text-3xl">{money(card.total, card.currency)}</p>
          <p className="mt-1 text-xs text-fg-muted">
            {card.depositPercent}% deposit · {money(deposit, card.currency)} · {card.timeline}
          </p>
        </div>
        <a href={card.pdfUrl} target="_blank" rel="noreferrer" className={`${btnGhost} shrink-0 px-3 py-1.5 text-xs`}>
          PDF ↗
        </a>
      </div>
      <table className="w-full text-sm">
        <tbody>
          {card.lines.map((l, i) => (
            <tr key={i} className="border-b border-line/60 last:border-0">
              <td className="px-4 py-2 text-fg-muted">{l.label}</td>
              <td className="px-4 py-2 text-right font-mono text-fg">{money(l.amount, card.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <details className="group border-t border-line px-4 py-3 text-xs text-fg-muted">
        <summary className="cursor-pointer list-none font-mono uppercase tracking-[0.14em] text-fg-subtle group-open:text-fg">
          Assumptions <span className="group-open:hidden">+</span>
          <span className="hidden group-open:inline">−</span>
        </summary>
        <ul className="mt-2 space-y-1">
          {card.assumptions.map((a) => (
            <li key={a}>· {a}</li>
          ))}
        </ul>
        <p className="mt-2 text-fg-subtle">Valid until {date(card.validUntil)}. Estimate until scope is confirmed.</p>
      </details>
      {active && (
        <div className="flex flex-wrap gap-2 border-t border-line p-3">
          <button type="button" className={btnPrimary} onClick={() => void sendChat({ action: { type: "quick_reply", text: "Book a discovery call" } })}>
            Book a call
          </button>
          <button type="button" className={btnGhost} onClick={() => void sendChat({ action: { type: "quick_reply", text: "Email me the quote" } })}>
            Email it to me
          </button>
          <button type="button" className={btnGhost} onClick={() => void sendChat({ action: { type: "quick_reply", text: "Pay the deposit" } })}>
            Pay deposit
          </button>
        </div>
      )}
    </div>
  );
}

function Slots({ card, active }: { card: Extract<ChatCard, { kind: "slots" }>; active: boolean }) {
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <div className={shell}>
      <Header eyebrow={`Open slots · ${card.timezone}`} title="Pick a time for a 30-minute call" tone="sky" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {card.slots.map((s) => (
          <button
            key={s.start}
            type="button"
            disabled={!active || picked !== null}
            onClick={() => {
              setPicked(s.start);
              void sendChat({ action: { type: "pick_slot", start: s.start, label: s.label } }).then((ok) => {
                if (!ok) setPicked(null);
              });
            }}
            className={clsx(
              "rounded-xl border px-3 py-2 text-left text-xs transition-colors disabled:cursor-not-allowed",
              picked === s.start ? "border-accent bg-accent/15 text-fg" : "border-line text-fg-muted hover:border-accent hover:text-fg disabled:opacity-50",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Booking({ card }: { card: Extract<ChatCard, { kind: "booking" }> }) {
  return (
    <div className={clsx(shell, "border-accent/40")}>
      <Header eyebrow="Booked" title="Discovery call confirmed ✓" />
      <p className="text-sm text-fg">{dateTime(card.start, card.timezone)}</p>
      <p className="mt-1 text-xs text-fg-muted">{card.timezone} · invite sent by email</p>
      {card.meetingUrl && (
        <a href={card.meetingUrl} target="_blank" rel="noreferrer" className={`${btnGhost} mt-3`}>
          Meeting link ↗
        </a>
      )}
    </div>
  );
}

function Payment({ card }: { card: Extract<ChatCard, { kind: "payment" }> }) {
  return (
    <div className={clsx(shell, "border-accent/40")}>
      <Header eyebrow={`Secure payment · ${card.provider}`} title={card.purpose === "deposit" ? "Pay your deposit" : card.purpose === "balance" ? "Pay the balance" : "Pay in full"} />
      <p className="display text-3xl">{money(card.amount, card.currency)}</p>
      {card.charged && (
        <p className="mt-1 text-xs text-fg-muted">
          Charged as {money(card.charged.amount, card.charged.currency)} at {card.charged.rate} {card.charged.currency}/{card.currency}
        </p>
      )}
      <p className="mt-1 font-mono text-xs text-fg-subtle">Ref {card.reference}</p>
      <a href={card.url} target="_blank" rel="noreferrer" className={`${btnPrimary} mt-4 w-full`} data-cursor="view" data-cursor-label="Pay">
        Pay securely ↗
      </a>
      <p className="mt-2 text-center text-[11px] text-fg-subtle">Card details are entered on the payment provider&apos;s page, never here.</p>
    </div>
  );
}

function Invoice({ card }: { card: Extract<ChatCard, { kind: "invoice" }> }) {
  return (
    <div className={shell}>
      <Header eyebrow="Invoice issued" title={`${card.invoiceNumber} · ${money(card.amount, card.currency)}`} tone="violet" />
      <p className="text-xs text-fg-muted">Due {date(card.dueDate)} · emailed to you with the PDF attached</p>
      <a href={card.pdfUrl} target="_blank" rel="noreferrer" className={`${btnGhost} mt-3`}>
        View invoice PDF ↗
      </a>
    </div>
  );
}

function QuickReplies({ card, active }: { card: Extract<ChatCard, { kind: "quick_replies" }>; active: boolean }) {
  if (!active) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {card.options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => void sendChat({ action: { type: "quick_reply", text: o } })}
          className="rounded-full border border-line-strong bg-surface/60 px-3.5 py-1.5 text-sm text-fg-muted transition-colors hover:border-accent hover:text-fg"
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function Notice({ card }: { card: Extract<ChatCard, { kind: "notice" }> }) {
  const tone = card.tone === "success" ? "border-accent/40 text-accent" : card.tone === "warning" ? "border-amber/40 text-amber" : "border-sky/40 text-sky";
  return <p className={clsx("rounded-xl border bg-surface/60 px-3 py-2 text-sm", tone)}>{card.text}</p>;
}

/** Renders one card. `active` is false for cards in older messages (their buttons are disabled). */
export function ChatCardView({ card, active }: { card: ChatCard; active: boolean }) {
  switch (card.kind) {
    case "service_match":
      return <ServiceMatch card={card} />;
    case "contact_form":
      return <ContactForm card={card} active={active} />;
    case "verify_email":
      return <VerifyEmail card={card} active={active} />;
    case "confirm":
      return <Confirm card={card} active={active} />;
    case "quote":
      return <Quote card={card} active={active} />;
    case "slots":
      return <Slots card={card} active={active} />;
    case "booking":
      return <Booking card={card} />;
    case "payment":
      return <Payment card={card} />;
    case "invoice":
      return <Invoice card={card} />;
    case "email_sent":
      return <Notice card={{ kind: "notice", tone: "success", text: `Sent to ${card.to}: “${card.subject}”` }} />;
    case "notice":
      return <Notice card={card} />;
    case "quick_replies":
      return <QuickReplies card={card} active={active} />;
  }
}
