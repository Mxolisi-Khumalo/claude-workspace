"use client";

import { useSyncExternalStore } from "react";

/**
 * Tiny global store for the concierge chat's open state, so any CTA on any
 * page can open the chat (optionally pre-seeded with a service or prompt)
 * without prop drilling or a context provider.
 */
interface ConciergeState {
  open: boolean;
  serviceSlug?: string;
  /** A prompt to send automatically when the chat opens. */
  seedPrompt?: string;
  /** Incremented on every open request so the UI can react to repeat opens. */
  nonce: number;
}

let state: ConciergeState = { open: false, nonce: 0 };
const listeners = new Set<() => void>();
/** The control that opened the chat, so focus can return to it on close. */
let opener: HTMLElement | null = null;

function set(next: Partial<ConciergeState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export function openConcierge(opts: { serviceSlug?: string; seedPrompt?: string } = {}) {
  // Read focus now: by the time the dock's effects run, the launcher (a
  // common opener) has already been made inert and lost focus.
  if (!state.open) {
    const active = typeof document !== "undefined" ? document.activeElement : null;
    opener = active instanceof HTMLElement && active !== document.body ? active : null;
  }
  set({ open: true, serviceSlug: opts.serviceSlug, seedPrompt: opts.seedPrompt, nonce: state.nonce + 1 });
}

export function closeConcierge() {
  set({ open: false });
}

/** The element that had focus when the chat was opened (read once, on close). */
export function takeOpener(): HTMLElement | null {
  const el = opener;
  opener = null;
  return el;
}

/** Clear the seed once the chat UI has consumed it. */
export function consumeSeed() {
  if (state.seedPrompt) set({ seedPrompt: undefined });
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

const serverState: ConciergeState = { open: false, nonce: 0 };

export function useConcierge(): ConciergeState {
  return useSyncExternalStore(subscribe, () => state, () => serverState);
}
