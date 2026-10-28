import type { Store } from "../types";

/** Store plus the internals the mock adapters need (not part of the public contract). */
export interface AppStore extends Store {
  /** True once (provider, eventId) has been recorded via recordWebhookEvent. */
  hasWebhookEvent(provider: string, eventId: string): Promise<boolean>;
}

/** Document counters restart every calendar year (Q-2026-0001, Q-2027-0001, ...). */
export const sequenceKey = (name: string) => `${name}:${new Date().getFullYear()}`;

/** Mock outbox keeps only the most recent entries. */
export const OUTBOX_CAP = 200;

export const DEFAULT_LIST_LIMIT = 100;
