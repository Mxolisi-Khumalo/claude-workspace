import "server-only";

import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ADMIN_COOKIE, adminMode, hasAdminAccess } from "./auth";

/**
 * In-render admin checks. The proxy already gates /admin, but every page,
 * handler and action re-checks so a matcher change can't expose data.
 */

/** Pages: 404 when admin is disabled, otherwise redirect to login without a valid session. */
export async function requireAdmin(next: string): Promise<void> {
  if (adminMode() === "disabled") notFound();
  if (await isAdminRequest()) return;
  redirect(`/admin/login?next=${encodeURIComponent(next)}`);
}

/** Route handlers: a plain boolean so the handler picks the response. */
export async function isAdminRequest(): Promise<boolean> {
  const mode = adminMode();
  if (mode !== "password") return mode === "open";
  return hasAdminAccess((await cookies()).get(ADMIN_COOKIE)?.value);
}

/**
 * The demo outbox can hold real visitors' names and emails. When a production
 * deployment has ADMIN_PASSWORD set, only the owner may read it.
 */
export async function requireOutboxAccess(): Promise<void> {
  if (process.env.NODE_ENV !== "production" || adminMode() !== "password") return;
  await requireAdmin("/demo/outbox");
}
