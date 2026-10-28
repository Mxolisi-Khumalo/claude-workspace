"use client";

import { useSyncExternalStore } from "react";
import type { BotMood } from "@/components/concierge/BotHead";
import type { ChatAction, ChatCard, ChatRequest, ChatStreamEvent, DisplayMessage } from "./types";

/**
 * Client-side chat state shared by every chat surface (floating dock and the
 * home-page section), so a conversation continues wherever it is opened.
 * The server owns the authoritative transcript; this keeps only what the UI
 * renders, persisted to localStorage so a refresh doesn't lose it.
 */

interface ChatState {
  sessionId: string;
  messages: DisplayMessage[];
  streaming: boolean;
  tool?: { name: string; label: string; status: "running" | "done" | "error" };
  privacyAccepted: boolean;
  /** Whether the server reported the scripted demo engine. */
  demo: boolean;
  error?: string;
  mood: BotMood;
  /** Number of mounted inline chat panels currently visible on screen. */
  inlineVisible: number;
}

const STORAGE_KEY = "mk-concierge-v1";
const HAPPY_CARDS = new Set<ChatCard["kind"]>(["booking", "payment", "email_sent", "invoice"]);

const newSessionId = () => crypto.randomUUID().replace(/-/g, "");

const initial: ChatState = {
  sessionId: "",
  messages: [],
  streaming: false,
  privacyAccepted: false,
  demo: false,
  mood: "idle",
  inlineVisible: 0,
};

let state: ChatState = initial;
let hydrated = false;
const listeners = new Set<() => void>();
let moodTimer: ReturnType<typeof setTimeout> | undefined;

function emit() {
  listeners.forEach((l) => l());
}

function set(patch: Partial<ChatState>) {
  state = { ...state, ...patch };
  emit();
  persist();
}

function persist() {
  if (typeof window === "undefined" || !hydrated) return;
  try {
    const { sessionId, messages, privacyAccepted, demo } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessionId, messages: messages.slice(-80), privacyAccepted, demo }));
  } catch {
    /* storage full or disabled — the chat still works for this page view */
  }
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (saved?.sessionId) {
      state = {
        ...state,
        sessionId: saved.sessionId,
        messages: (saved.messages ?? []).map((m: DisplayMessage) => ({ ...m, pending: false })),
        privacyAccepted: Boolean(saved.privacyAccepted),
        demo: Boolean(saved.demo),
      };
      return;
    }
  } catch {
    /* ignore corrupt storage */
  }
  state = { ...state, sessionId: newSessionId() };
}

function setMood(mood: BotMood, revertAfterMs?: number) {
  clearTimeout(moodTimer);
  set({ mood });
  if (revertAfterMs) moodTimer = setTimeout(() => set({ mood: "idle" }), revertAfterMs);
}

function updateMessage(id: string, fn: (m: DisplayMessage) => DisplayMessage) {
  set({ messages: state.messages.map((m) => (m.id === id ? fn(m) : m)) });
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export function acceptPrivacy() {
  hydrate();
  set({ privacyAccepted: true });
}

export function resetChat() {
  set({ sessionId: newSessionId(), messages: [], error: undefined, tool: undefined, mood: "idle" });
}

export function setListening(on: boolean) {
  if (state.streaming) return;
  setMood(on ? "listening" : "idle");
}

export function registerInlinePanel(visible: boolean) {
  set({ inlineVisible: Math.max(0, state.inlineVisible + (visible ? 1 : -1)) });
}

/** Human-readable echo of a card action in the transcript. */
function describeAction(action: ChatAction): string | null {
  switch (action.type) {
    case "submit_contact":
      return `Shared my details (${action.contact.name}, ${action.contact.email})`;
    case "verify_email":
      return "Entered my verification code";
    case "pick_slot":
      return `I'd like ${action.label}`;
    case "confirm_action":
      return "Confirmed ✓";
    case "cancel_action":
      return "Cancelled";
    case "choose_currency":
      return action.currency === "USD" ? "US dollars, please" : "Rand, please";
    case "accept_quote":
      return "I'd like to go ahead with this quote";
    case "quick_reply":
      return action.text;
    case "resend_code":
      return null;
  }
}

/**
 * Sends a message or card action and streams the reply into the store.
 * Resolves `false` when nothing was sent or the server didn't accept it
 * (network error, non-2xx, or an `error` stream event), so cards can undo
 * their optimistic "done" state and let the visitor try again.
 */
export async function sendChat(input: { message?: string; action?: ChatAction; context?: ChatRequest["context"] }): Promise<boolean> {
  hydrate();
  if (state.streaming) return false;
  const text = input.message?.trim();
  if (!text && !input.action) return false;

  const echo = text ?? (input.action ? describeAction(input.action) : null);
  const userMsg: DisplayMessage | null = echo ? { id: crypto.randomUUID(), role: "user", text: echo, cards: [] } : null;
  const reply: DisplayMessage = { id: crypto.randomUUID(), role: "assistant", text: "", cards: [], pending: true };

  set({
    messages: [...state.messages, ...(userMsg ? [userMsg] : []), reply],
    streaming: true,
    error: undefined,
    tool: undefined,
  });
  setMood("thinking");

  const body: ChatRequest = {
    sessionId: state.sessionId,
    message: text,
    action: input.action,
    context: {
      ...input.context,
      path: typeof window !== "undefined" ? window.location.pathname : undefined,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    privacyAck: state.privacyAccepted,
  };

  let happy = false;
  let ok = true;
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok || !res.body) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? "The concierge is unavailable right now. Please try again shortly.");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line) continue;
        const event = JSON.parse(line) as ChatStreamEvent;
        switch (event.type) {
          case "start":
            set({ demo: event.demo });
            break;
          case "text":
            updateMessage(reply.id, (m) => ({ ...m, text: m.text + event.delta }));
            break;
          case "tool":
            set({ tool: { name: event.name, label: event.label, status: event.status } });
            break;
          case "card":
            if (HAPPY_CARDS.has(event.card.kind) || (event.card.kind === "notice" && event.card.tone === "success")) happy = true;
            updateMessage(reply.id, (m) => ({ ...m, cards: [...m.cards, event.card] }));
            break;
          case "error":
            ok = false;
            set({ error: event.message });
            break;
          case "done":
            break;
        }
      }
    }
  } catch (err) {
    ok = false;
    set({ error: err instanceof Error ? err.message : "Something went wrong." });
  } finally {
    updateMessage(reply.id, (m) => ({ ...m, pending: false }));
    // Drop an empty assistant bubble (e.g. a silent action or an error).
    const last = state.messages.find((m) => m.id === reply.id);
    if (last && !last.text.trim() && last.cards.length === 0) {
      set({ messages: state.messages.filter((m) => m.id !== reply.id) });
    }
    set({ streaming: false, tool: undefined });
    setMood(happy ? "happy" : "idle", happy ? 2600 : undefined);
  }
  return ok;
}

/* ------------------------------------------------------------------ */

const subscribe = (l: () => void) => {
  hydrate();
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useChat(): ChatState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => initial,
  );
}
