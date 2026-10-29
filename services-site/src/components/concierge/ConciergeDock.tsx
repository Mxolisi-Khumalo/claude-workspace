"use client";

import { useEffect, useRef } from "react";
import { clsx } from "clsx";
import { useChat } from "@/lib/chat/client";
import { closeConcierge, openConcierge, takeOpener, useConcierge } from "@/lib/chat/concierge-store";
import { ChatPanel } from "./ChatPanel";
import { MiniBot } from "./MiniBot";

/**
 * Site-wide floating concierge: a launcher bubble plus a slide-over chat
 * panel. The launcher steps aside while the home page's inline concierge
 * section is on screen, so there is only ever one obvious place to chat.
 * While open the panel is modal: the rest of the site (`#site-shell` in the
 * root layout) is inert, and closing returns focus to whatever opened it.
 */
export function ConciergeDock() {
  const { open } = useConcierge();
  const chat = useChat();
  const panel = useRef<HTMLDivElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const hideLauncher = chat.inlineVisible > 0 && !open;

  useEffect(() => {
    if (!open) return;
    const dialog = panel.current;
    const fallback = launcher.current;
    const shell = document.getElementById("site-shell");
    if (shell) shell.inert = true;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeConcierge();
    };
    window.addEventListener("keydown", onKey);
    // Focus where the visitor acts next: the composer, or the privacy
    // notice's accept button while that gate shows — never the header's
    // "New" button, which would wipe the conversation on Enter or Space.
    const t = setTimeout(() => {
      (dialog?.querySelector<HTMLElement>("#chat-input-dock, [data-autofocus]") ?? dialog?.querySelector<HTMLElement>("[aria-label='Close chat']"))?.focus();
    }, 350);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(t);
      if (shell) shell.inert = false;
      const opener = takeOpener();
      if (opener?.isConnected && !dialog?.contains(opener)) opener.focus();
      // The opener may be gone or hidden (e.g. the closed mobile menu).
      if (document.activeElement !== opener) fallback?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={launcher}
        type="button"
        onClick={() => (open ? closeConcierge() : openConcierge())}
        aria-expanded={open}
        aria-controls="concierge-panel"
        inert={hideLauncher || open}
        data-cursor="view"
        data-cursor-label="Chat"
        className={clsx(
          "group fixed bottom-5 right-5 z-[60] flex items-center gap-3 rounded-full border border-line-strong bg-bg-elevated/90 py-2 pl-2 pr-5 shadow-[0_20px_60px_-20px_rgb(0_0_0/0.8)] backdrop-blur-xl transition-[transform,opacity,border-color] duration-500 ease-[var(--ease-out)] hover:border-accent",
          // Light: a square white cell with a soft paper shadow instead of a black halo.
          "light:rounded-none light:bg-surface light:shadow-[var(--shadow-panel)] light:hover:border-fg/60",
          (hideLauncher || open) && "pointer-events-none translate-y-4 opacity-0",
        )}
      >
        <MiniBot mood={chat.mood} size={40} />
        <span className="text-left">
          <span className="block text-sm font-semibold leading-tight">Ask Byte</span>
          <span className="block text-[11px] text-fg-muted light:font-mono">Instant quote · book a call</span>
        </span>
        <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-accent" />
        </span>
      </button>

      <div
        className={clsx(
          "fixed inset-0 z-[70] bg-black/50 backdrop-blur-[2px] transition-opacity duration-500 md:bg-black/20 light:bg-black/35 md:light:bg-black/10",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={closeConcierge}
        aria-hidden
      />
      <div
        id="concierge-panel"
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Chat with Byte, the project concierge"
        className={clsx(
          "fixed z-[80] flex transition-[transform,opacity] duration-500 ease-[var(--ease-out)]",
          "inset-0 md:inset-auto md:bottom-5 md:right-5 md:h-[min(760px,calc(100dvh-2.5rem))] md:w-[440px]",
          open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-8 opacity-0",
        )}
        inert={!open}
      >
        <ChatPanel className="h-full w-full rounded-none md:rounded-[var(--radius-lg)] md:light:rounded-none md:light:shadow-[var(--shadow-panel)]" onClose={closeConcierge} />
      </div>
    </>
  );
}
