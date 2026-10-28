"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { acceptPrivacy, resetChat, sendChat, setListening, useChat } from "@/lib/chat/client";
import { consumeSeed, useConcierge } from "@/lib/chat/concierge-store";
import { ChatCardView } from "./Cards";
import { MiniBot } from "./MiniBot";
import { RichText } from "./RichText";

const STARTERS = [
  "I need a website that stands out",
  "I want to build an MVP for my startup",
  "Can you build me a booking system?",
  "I'd like an AI assistant like you",
];

const MAX_CHARS = 2000;

/** Light theme: Byte's bubbles are square white cells with a green rule on the left. */
const BOT_BUBBLE_LIGHT = "light:rounded-none light:border-l-2 light:border-l-accent light:bg-surface";
/** Light theme: suggestion chips use GitHub Universe's secondary button style. */
const CHIP_LIGHT = "light:rounded-[6px] light:bg-black/5 light:text-fg light:hover:border-fg/60 light:hover:bg-black/[0.08]";

/**
 * The concierge conversation UI, shared by the floating dock and the inline
 * home-page section. Includes the POPIA notice gate, streaming messages,
 * interactive cards and a composer.
 */
export function ChatPanel({
  className,
  onClose,
  variant = "dock",
}: {
  className?: string;
  onClose?: () => void;
  variant?: "dock" | "inline";
}) {
  const chat = useChat();
  const concierge = useConcierge();
  const [draft, setDraft] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const context = concierge.serviceSlug ? { serviceSlug: concierge.serviceSlug } : undefined;

  // Keep the newest content in view while streaming.
  const lastText = chat.messages.at(-1)?.text.length ?? 0;
  const lastCards = chat.messages.at(-1)?.cards.length ?? 0;
  useEffect(() => {
    const el = scroller.current;
    // An explicit "smooth" overrides the reduced-motion CSS reset, so choose here.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduced ? "auto" : "smooth" });
  }, [chat.messages.length, lastText, lastCards, chat.tool?.label]);

  // A CTA elsewhere asked the chat to send a prompt on open. While a reply is
  // still streaming the seed is left in place and sent once it finishes.
  useEffect(() => {
    if (variant !== "dock" || !concierge.open || !concierge.seedPrompt || !chat.privacyAccepted || chat.streaming) return;
    const seed = concierge.seedPrompt;
    consumeSeed();
    void sendChat({ message: seed, context });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [concierge.nonce, concierge.open, chat.privacyAccepted, chat.streaming, variant]);

  const submit = () => {
    const text = draft.trim();
    if (!text || chat.streaming) return;
    setDraft("");
    void sendChat({ message: text, context });
  };

  const lastAssistant = [...chat.messages].reverse().find((m) => m.role === "assistant")?.id;

  return (
    <section
      aria-label="Project concierge chat"
      className={clsx(
        "relative flex min-h-0 flex-col overflow-hidden rounded-[var(--radius-lg)] border border-line bg-bg-elevated/85 backdrop-blur-xl",
        // Light: a white, square GitHub Universe "ticket" box on a 1px rule.
        "light:rounded-none light:border-line-strong light:bg-surface light:backdrop-blur-none",
        className,
      )}
    >
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
        <MiniBot mood={chat.mood} size={34} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-semibold">
            Byte <span className="font-mono text-[10px] font-normal uppercase tracking-[0.14em] text-fg-subtle light:text-[11px] light:normal-case light:tracking-normal">AI concierge</span>
          </p>
          <p className="truncate text-xs text-fg-muted">
            {chat.streaming ? (chat.tool?.status === "running" ? `${chat.tool.label}…` : "Typing…") : "Scopes, quotes & books — you confirm every action"}
          </p>
        </div>
        {chat.demo && (
          <span
            className="rounded-full border border-amber/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-amber light:rounded-none light:border-transparent light:bg-tint-olive light:text-black"
            title="No real bookings, emails or charges"
          >
            Demo
          </span>
        )}
        {chat.messages.length > 0 && (
          <button
            type="button"
            onClick={resetChat}
            className="rounded-full px-2 py-1 text-xs text-fg-subtle transition-colors hover:text-fg light:rounded-[6px] light:font-mono light:text-fg-muted light:hover:bg-black/5 light:hover:text-fg"
            title="Start a new conversation"
          >
            New
          </button>
        )}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close chat"
            className="grid h-8 w-8 place-items-center rounded-full border border-line text-fg-muted transition-colors hover:border-accent hover:text-fg light:rounded-[6px] light:border-line-strong light:bg-black/5 light:hover:border-fg/60"
          >
            ✕
          </button>
        )}
      </header>

      {/* Transcript */}
      <div ref={scroller} data-lenis-prevent className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-5 light:bg-bg-elevated" aria-live="polite" aria-busy={chat.streaming}>
        {chat.messages.length === 0 && (
          <div className="space-y-4">
            <div className={clsx("max-w-[90%] rounded-2xl rounded-tl-sm border border-line bg-surface/70 px-4 py-3 text-sm leading-relaxed text-fg-muted", BOT_BUBBLE_LIGHT)}>
              <RichText text={"Hi, I'm **Byte**, Mxolisi's AI project concierge. Tell me what you'd like to build and I'll match you with the right service, show you real work that proves it, and give you an instant ballpark quote.\n\nWhen you're ready I can book a call, email the quote or set up a deposit — you confirm every step."} />
            </div>
            {chat.privacyAccepted && (
              <div className="flex flex-wrap gap-2">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void sendChat({ message: s, context })}
                    className={clsx("rounded-full border border-line-strong bg-surface/60 px-3.5 py-1.5 text-left text-sm text-fg-muted transition-colors hover:border-accent hover:text-fg", CHIP_LIGHT)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {chat.messages.map((m) => (
          <div key={m.id} className={clsx("flex flex-col gap-2", m.role === "user" ? "items-end" : "items-start")}>
            {(m.text || m.pending) && (
              <div
                className={clsx(
                  "max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                  m.role === "user"
                    ? "rounded-tr-sm bg-accent text-accent-ink light:rounded-none light:bg-fg light:text-bg"
                    : clsx("rounded-tl-sm border border-line bg-surface/70 text-fg-muted", BOT_BUBBLE_LIGHT),
                )}
              >
                {m.role === "user" ? (
                  <p className="whitespace-pre-wrap">{m.text}</p>
                ) : m.text ? (
                  <RichText text={m.text} />
                ) : (
                  <TypingDots />
                )}
              </div>
            )}
            {m.cards.length > 0 && (
              <div className="grid w-full max-w-[94%] gap-2">
                {m.cards.map((card, i) => (
                  <ChatCardView key={i} card={card} active={m.id === lastAssistant && !chat.streaming} />
                ))}
              </div>
            )}
          </div>
        ))}

        {chat.tool?.status === "running" && (
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle light:normal-case light:tracking-normal">
            <span className="h-1.5 w-1.5 animate-ping rounded-full bg-violet" /> {chat.tool.label}
          </p>
        )}
        {chat.error && (
          <p role="alert" className="rounded-xl border border-amber/40 bg-amber/10 px-3 py-2 text-sm text-amber light:rounded-none light:bg-surface">
            {chat.error}
          </p>
        )}
      </div>

      {/* Privacy gate or composer */}
      {!chat.privacyAccepted ? (
        <div className="border-t border-line bg-surface/60 p-4 light:bg-surface">
          <p className="text-xs leading-relaxed text-fg-muted">
            You&apos;re chatting with an AI assistant. Messages and any details you share are stored and processed (including by
            providers outside South Africa) only to respond to your enquiry, quote, book or invoice. Please don&apos;t share ID
            numbers, health or other sensitive information.{" "}
            <Link href="/privacy" className="text-accent underline underline-offset-2">
              Privacy notice
            </Link>
          </p>
          <button
            type="button"
            data-autofocus
            onClick={() => {
              acceptPrivacy();
              // The button unmounts; carry focus on to the composer that replaces it.
              requestAnimationFrame(() => input.current?.focus());
            }}
            className="mt-3 flex w-full items-center justify-center rounded-[var(--radius-button)] bg-accent py-2.5 text-sm font-semibold text-accent-ink transition-[box-shadow,background-color] hover:shadow-[var(--glow-accent)] light:justify-between light:px-4 light:py-3 light:font-[550] light:hover:bg-accent-hover light:hover:shadow-none"
          >
            I understand — start chatting
            <span aria-hidden className="hidden light:inline">
              →
            </span>
          </button>
        </div>
      ) : (
        <form
          className="border-t border-line p-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="flex items-end gap-2 rounded-2xl border border-line bg-bg/70 p-2 transition-colors focus-within:border-accent/60 light:rounded-none light:border-line-strong light:bg-surface light:p-1.5 light:focus-within:border-accent">
            <label htmlFor={`chat-input-${variant}`} className="sr-only">
              Message Byte
            </label>
            <textarea
              id={`chat-input-${variant}`}
              ref={input}
              rows={1}
              value={draft}
              maxLength={MAX_CHARS}
              placeholder="Describe your project…"
              onChange={(e) => {
                setDraft(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
              }}
              onFocus={() => setListening(true)}
              onBlur={() => setListening(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              className="max-h-36 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-base text-fg outline-none placeholder:text-fg-subtle md:text-sm"
            />
            <button
              type="submit"
              disabled={!draft.trim() || chat.streaming}
              aria-label="Send message"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-ink transition-[opacity,box-shadow,background-color] hover:shadow-[var(--glow-accent)] disabled:opacity-40 light:rounded-none light:hover:bg-accent-hover light:hover:shadow-none"
            >
              ↑
            </button>
          </div>
          <p className="mt-1.5 px-1 text-[10px] text-fg-subtle">AI can make mistakes — quotes are confirmed on a call. Enter to send · Shift+Enter for a new line</p>
        </form>
      )}
    </section>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex gap-1 py-1" aria-label="Byte is typing">
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-fg-subtle" style={{ animationDelay: `${i * 120}ms` }} />
      ))}
    </span>
  );
}
