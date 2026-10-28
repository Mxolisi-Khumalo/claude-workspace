/**
 * Integration factories. Each picks a real adapter when its env vars are set
 * and falls back to a mock adapter otherwise (demo mode).
 *
 * STUB — the integrations build step replaces these bodies with real adapters.
 */
import type { CalendarProvider, EmailProvider, PaymentProvider, Store } from "./types";

export interface IntegrationStatus {
  ai: boolean;
  store: string;
  payments: string;
  calendar: string;
  email: string;
}

export function getStore(): Store {
  throw new Error("getStore not implemented");
}

export function getPayments(): PaymentProvider {
  throw new Error("getPayments not implemented");
}

export function getCalendar(): CalendarProvider {
  throw new Error("getCalendar not implemented");
}

export function getEmail(): EmailProvider {
  throw new Error("getEmail not implemented");
}

/** True when outbound email is captured by the mock outbox instead of being delivered. */
export function isMockEmail(): boolean {
  return true;
}

export function integrationStatus(): IntegrationStatus {
  return { ai: Boolean(process.env.ANTHROPIC_API_KEY), store: "stub", payments: "stub", calendar: "stub", email: "stub" };
}
