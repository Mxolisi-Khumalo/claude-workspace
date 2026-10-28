import "server-only";

import { join } from "node:path";
import { CalComCalendar } from "./calendar/calcom";
import { MockCalendar } from "./calendar/mock";
import { MockEmail } from "./email/mock";
import { ResendEmail } from "./email/resend";
import { IntegrationConfigError, isDemoMode } from "./env";
import { MockPayments } from "./payments/mock";
import { PaystackPayments } from "./payments/paystack";
import { FileStore } from "./store/file";
import { MemoryStore } from "./store/memory";
import { PostgresStore } from "./store/postgres";
import type { AppStore } from "./store/shared";
import type { CalendarProvider, EmailProvider, PaymentProvider, Store } from "./types";

/**
 * Integration factories. Each picks a real adapter when its env vars are set
 * (and DEMO_MODE is not "true") and falls back to a mock adapter otherwise,
 * so the whole site works locally with zero configuration. An explicitly
 * requested provider with missing keys throws instead of silently mocking.
 *
 * The store is not a side effect, so it follows DATABASE_URL even in demo
 * mode: Postgres when set, in-memory on Vercel, else .data/store.json.
 */

export { IntegrationConfigError, WebhookSignatureError, isDemoMode, siteUrl } from "./env";
export { MOCK_SIGNATURE_HEADER, signMockWebhook } from "./payments/mock";
export { PAYSTACK_SIGNATURE_HEADER } from "./payments/paystack";

export interface IntegrationStatus {
  ai: boolean;
  store: string;
  payments: string;
  calendar: string;
  email: string;
}

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

export type StoreKind = "postgres" | "memory" | "file";

export function storeKind(): StoreKind {
  if (process.env.DATABASE_URL) return "postgres";
  if (process.env.VERCEL) return "memory";
  return "file";
}

/** Stashed on globalThis so dev hot reloads and separately bundled routes share one store. */
const g = globalThis as typeof globalThis & { __servicesSiteStore?: AppStore };

function appStore(): AppStore {
  if (!g.__servicesSiteStore) {
    const kind = storeKind();
    g.__servicesSiteStore =
      kind === "postgres"
        ? new PostgresStore(process.env.DATABASE_URL!)
        : kind === "memory"
          ? new MemoryStore()
          : new FileStore(join(process.cwd(), ".data", "store.json"));
  }
  return g.__servicesSiteStore;
}

export function getStore(): Store {
  return appStore();
}

/* ------------------------------------------------------------------ */
/* Providers                                                           */
/* ------------------------------------------------------------------ */

function choose<T extends string>(envName: string, options: readonly T[], fallback: T): T {
  const requested = process.env[envName]?.trim().toLowerCase();
  if (!requested) return fallback;
  if (!options.includes(requested as T)) {
    throw new IntegrationConfigError(`Unknown ${envName} "${requested}" (expected ${options.join(" or ")}).`);
  }
  return requested as T;
}

let payments: PaymentProvider | undefined;
let calendar: CalendarProvider | undefined;
let email: EmailProvider | undefined;

export function getPayments(): PaymentProvider {
  if (payments) return payments;
  const key = process.env.PAYSTACK_SECRET_KEY ?? "";
  const name = isDemoMode() ? "mock" : choose("PAYMENT_PROVIDER", ["paystack", "mock"] as const, key ? "paystack" : "mock");
  payments = name === "paystack" ? new PaystackPayments(key) : new MockPayments(appStore);
  return payments;
}

let paystackForWebhooks: PaystackPayments | undefined;

/**
 * Adapter for a webhook route (`/api/webhooks/<name>`): the active provider,
 * or Paystack whenever its key is set (so late webhooks still verify after a
 * switch). Throws IntegrationConfigError when `name` is not available.
 */
export function getPaymentProvider(name: string): PaymentProvider {
  const active = getPayments();
  if (active.name === name) return active;
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (name === "paystack" && key && !isDemoMode()) return (paystackForWebhooks ??= new PaystackPayments(key));
  throw new IntegrationConfigError(`Payment provider "${name}" is not active.`);
}

/** True once the demo checkout has posted a successful (signed) mock webhook for `reference`. */
export async function isMockPaid(reference: string): Promise<boolean> {
  return new MockPayments(appStore).isPaid(reference);
}

export function getCalendar(): CalendarProvider {
  if (calendar) return calendar;
  const key = process.env.CALCOM_API_KEY ?? "";
  const eventTypeId = process.env.CALCOM_EVENT_TYPE_ID ?? "";
  const name = isDemoMode()
    ? "mock"
    : choose("SCHEDULING_PROVIDER", ["calcom", "mock"] as const, key && eventTypeId ? "calcom" : "mock");
  calendar =
    name === "calcom"
      ? new CalComCalendar(key, Number(eventTypeId), Number(process.env.CALCOM_EVENT_LENGTH_MINUTES) || 30)
      : new MockCalendar();
  return calendar;
}

export function getEmail(): EmailProvider {
  if (email) return email;
  const key = process.env.RESEND_API_KEY;
  email = key && !isDemoMode() ? new ResendEmail(key) : new MockEmail(appStore);
  return email;
}

/** True when outbound email is captured by the mock outbox instead of being delivered. */
export function isMockEmail(): boolean {
  return getEmail().name === "mock";
}

/**
 * True when nothing a visitor triggers reaches a real provider: DEMO_MODE, or
 * payments, calendar and email all mocked. Only then may the chat reveal the
 * verification code, since a live adapter would act on an unproven address.
 */
export function allSideEffectsMocked(): boolean {
  if (isDemoMode()) return true;
  try {
    return getPayments().name === "mock" && getCalendar().name === "mock" && getEmail().name === "mock";
  } catch (err) {
    if (err instanceof IntegrationConfigError) return false;
    throw err;
  }
}

/** Which adapter is live for each integration (for /api/health and demo ribbons). Never throws. */
export function integrationStatus(): IntegrationStatus {
  const nameOf = (get: () => { name: string }) => {
    try {
      return get().name;
    } catch {
      return "misconfigured";
    }
  };
  return {
    ai: Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN) && !isDemoMode(),
    store: storeKind(),
    payments: nameOf(getPayments),
    calendar: nameOf(getCalendar),
    email: nameOf(getEmail),
  };
}
