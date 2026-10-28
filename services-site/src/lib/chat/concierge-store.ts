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

function set(next: Partial<ConciergeState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export function openConcierge(opts: { serviceSlug?: string; seedPrompt?: string } = {}) {
  set({ open: true, serviceSlug: opts.serviceSlug, seedPrompt: opts.seedPrompt, nonce: state.nonce + 1 });
}

export function closeConcierge() {
  set({ open: false });
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
