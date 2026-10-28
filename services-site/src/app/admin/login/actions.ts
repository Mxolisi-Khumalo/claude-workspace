"use server";

import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { rateLimit } from "@/lib/chat/server/rate-limit";
import { ADMIN_COOKIE, ADMIN_SESSION_SECONDS, adminMode, createAdminToken, passwordMatches, safeNextPath } from "../auth";

export interface LoginState {
  error?: string;
}

async function clientKey() {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  return createHash("sha256").update(`${ip}:${process.env.SESSION_SECRET ?? "dev-secret"}`).digest("hex").slice(0, 32);
}

/** Password login: 5 attempts per 15 minutes per client, then an 8-hour session cookie. */
export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (adminMode() !== "password") redirect("/admin");

  const limit = rateLimit(`admin-login:${await clientKey()}`, 5, 15 * 60 * 1000);
  if (!limit.ok) return { error: `Too many attempts. Try again in ${Math.ceil(limit.retryAfter / 60)} min.` };

  const password = formData.get("password");
  if (typeof password !== "string" || password.length > 512 || !passwordMatches(password)) {
    return { error: "That password is incorrect." };
  }

  (await cookies()).set(ADMIN_COOKIE, createAdminToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_SECONDS,
  });
  redirect(safeNextPath(formData.get("next")));
}

export async function logout() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin/login");
}
