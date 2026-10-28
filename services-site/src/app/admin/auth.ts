/**
 * Admin session primitives, shared by the proxy (first gate) and the admin
 * pages, handlers and actions (which re-check). No `server-only` import so the
 * proxy can use it too.
 *
 * The `mk_admin` cookie is `<expiry>.<hex HMAC-SHA256 keyed with ADMIN_PASSWORD>`,
 * so sessions expire server-side after 8 hours and rotating the password signs
 * everyone out.
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "mk_admin";
export const ADMIN_SESSION_SECONDS = 8 * 60 * 60;

/**
 * `password`: a valid cookie is required. `open`: no password in development.
 * `disabled`: no password outside development, so /admin returns 404.
 */
export type AdminMode = "password" | "open" | "disabled";

export function adminMode(): AdminMode {
  if (process.env.ADMIN_PASSWORD) return "password";
  return process.env.NODE_ENV === "development" ? "open" : "disabled";
}

/** Only local development serves /demo/outbox without an admin session (see requireOutboxAccess). */
export const outboxIsPublic = () => process.env.NODE_ENV !== "production";

const sign = (password: string, exp: number) =>
  createHmac("sha256", password).update(`admin:${exp}`).digest("hex");

function equalHex(a: string, b: string) {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length > 0 && left.length === right.length && timingSafeEqual(left, right);
}

export function createAdminToken(): string {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error("ADMIN_PASSWORD is not set");
  const exp = Math.floor(Date.now() / 1000) + ADMIN_SESSION_SECONDS;
  return `${exp}.${sign(password, exp)}`;
}

export function isValidAdminToken(token: string | undefined): boolean {
  const password = process.env.ADMIN_PASSWORD;
  if (!password || !token) return false;
  const [expRaw, mac] = token.split(".");
  const exp = Number(expRaw);
  if (!Number.isSafeInteger(exp) || exp * 1000 < Date.now() || !mac) return false;
  return equalHex(mac, sign(password, exp));
}

/** Constant-time password check (both sides hashed to equal length first). */
export function passwordMatches(input: string): boolean {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(password).digest();
  return timingSafeEqual(a, b);
}

/** True when a request carrying this cookie value may see admin data. */
export function hasAdminAccess(cookie: string | undefined): boolean {
  const mode = adminMode();
  return mode === "open" || (mode === "password" && isValidAdminToken(cookie));
}

/** Only same-site admin/demo paths are allowed as post-login destinations. */
export function safeNextPath(value: unknown): string {
  return typeof value === "string" && /^\/(admin|demo\/outbox)(\/[A-Za-z0-9_-]+)*$/.test(value) ? value : "/admin";
}
