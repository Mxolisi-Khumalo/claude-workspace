import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Shared environment + crypto helpers for the adapters and documents.
 * Env vars are read at call time so tests and scripts can set them late.
 */

/** DEMO_MODE=true forces every side-effecting adapter (payments, calendar, email) to its mock. */
export const isDemoMode = () => process.env.DEMO_MODE === "true";

/** Absolute site origin without a trailing slash. */
export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");

/** HMAC key for document tokens and mock webhooks. */
export const sessionSecret = () => process.env.SESSION_SECRET || "dev-secret";

export const hmacHex = (algorithm: "sha256" | "sha512", key: string, data: string) =>
  createHmac(algorithm, key).update(data, "utf8").digest("hex");

/** Constant-time string comparison (length is checked first, as timingSafeEqual requires). */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Thrown by `parseWebhook` when a signature is missing or wrong (respond 401, do not retry). */
export class WebhookSignatureError extends Error {
  constructor(provider: string) {
    super(`Invalid ${provider} webhook signature`);
    this.name = "WebhookSignatureError";
  }
}

/** Thrown when an adapter is selected but its env vars are incomplete. */
export class IntegrationConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IntegrationConfigError";
  }
}

/** j***@example.com — for log lines, so addresses never land in logs verbatim. */
export function maskEmail(email: string): string {
  const [user = "", domain = ""] = email.split("@");
  return `${user.slice(0, 1)}***@${domain}`;
}

/** fetch with a timeout; JSON body parsed defensively (null when not JSON). */
export async function fetchJson(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const { timeoutMs = 15_000, ...rest } = init;
  const res = await fetch(url, { ...rest, signal: AbortSignal.timeout(timeoutMs), cache: "no-store" });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  return { ok: res.ok, status: res.status, body };
}

/** Narrow an unknown JSON value to a plain record. */
export const asRecord = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
