"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import { registerInlinePanel, useChat } from "@/lib/chat/client";
import { usePrefersReducedMotion } from "@/hooks/useMediaQuery";
import { RevealText } from "@/components/ui/RevealText";
import { ChatPanel } from "./ChatPanel";
import { MiniBot } from "./MiniBot";

const BotHead = dynamic(() => import("./BotHead"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center">
      <MiniBot size={120} />
    </div>
  ),
});

const CAPABILITIES = [
  { k: "01", t: "Scopes your project", d: "Asks the right questions — never more than a couple at a time." },
  { k: "02", t: "Prices it instantly", d: "Quotes come from the published catalogue, calculated on the server." },
  { k: "03", t: "Books a call", d: "Live availability from the calendar; you pick the slot." },
  { k: "04", t: "Sends quote & invoice", d: "PDFs by email and a secure payment link for deposits." },
];

const TRUST = [
  "Your email is verified before anything is sent",
  "You confirm every booking, email and payment",
  "Card details stay on the payment provider's page",
  "POPIA-aligned notice, minimal data, no spam",
];

/**
 * Home-page concierge: the 3D robot stationed beside an inline chat. The
 * robot's eyes follow the cursor whenever it comes close and its expression
 * tracks the conversation (listening, thinking, happy).
 */
export function ConciergeSection() {
  const chat = useChat();
  const reduced = usePrefersReducedMotion();
  const panelWrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = panelWrap.current;
    if (!el) return;
    let visible = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting !== visible) {
          visible = entry.isIntersecting;
          registerInlinePanel(visible);
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (visible) registerInlinePanel(false);
    };
  }, []);

  return (
    <section id="concierge" className="relative scroll-mt-24 py-28 md:py-40">
      <div className="container-x">
        <div className="mb-14 grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="eyebrow mb-5">{"// 05 — Concierge"}</p>
            <RevealText as="h2" className="display max-w-4xl text-[clamp(2.5rem,6.5vw,6rem)]">
              Meet Byte. Get a quote before your coffee cools.
            </RevealText>
          </div>
          <p className="max-w-sm text-fg-muted">
            An AI concierge that knows every service, package and piece of evidence on this site — and can turn a conversation into a booked call or a paid deposit.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-12">
          <div className="relative flex flex-col">
            <div className="relative aspect-square w-full overflow-hidden rounded-[var(--radius-lg)] border border-line bg-[radial-gradient(circle_at_50%_40%,rgb(126_231_135/0.12),transparent_60%)]">
              <div className="grid-bg absolute inset-0 opacity-60" aria-hidden />
              <BotHead mood={chat.mood} reduced={reduced} className="absolute inset-0" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between p-5 font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
                <span>byte.v1 · {chat.mood}</span>
                <span className="text-accent">● online</span>
              </div>
            </div>

            <ul className="mt-6 grid gap-px overflow-hidden rounded-[var(--radius)] border border-line bg-line sm:grid-cols-2">
              {CAPABILITIES.map((c) => (
                <li key={c.k} className="bg-bg-elevated/90 p-4">
                  <p className="font-mono text-[11px] text-accent">{c.k}</p>
                  <p className="mt-1 font-semibold">{c.t}</p>
                  <p className="mt-1 text-sm text-fg-muted">{c.d}</p>
                </li>
              ))}
            </ul>
          </div>

          <div ref={panelWrap} className="flex flex-col gap-5">
            <ChatPanel variant="inline" className="h-[640px] max-h-[80dvh] shadow-[0_40px_120px_-40px_rgb(126_231_135/0.25)]" />
            <ul className="grid gap-2 text-sm text-fg-muted sm:grid-cols-2">
              {TRUST.map((t) => (
                <li key={t} className="flex gap-2">
                  <span className="text-accent">✓</span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
