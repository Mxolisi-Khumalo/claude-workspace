import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { adminMode, safeNextPath } from "../auth";
import { isAdminRequest } from "../guard";
import { LoginForm } from "./LoginForm";

export const instant = false;

export default async function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  await connection();
  const mode = adminMode();
  if (mode === "disabled") notFound();
  const next = safeNextPath((await searchParams).next);
  if (mode === "password" && (await isAdminRequest())) redirect(next);

  return (
    <div className="mx-auto max-w-sm py-12">
      <p className="eyebrow">Owner area</p>
      <h1 className="display mt-4 text-4xl">Admin</h1>
      {mode === "open" ? (
        <div className="mt-8 rounded-[var(--radius)] border border-line bg-surface p-5 text-sm text-fg-muted">
          <p>
            <span className="text-amber">ADMIN_PASSWORD is not set.</span> The dashboard is open in development and
            returns 404 in production until you set one.
          </p>
          <Link href="/admin" className="mt-4 inline-block text-accent hover:underline">
            Open the dashboard →
          </Link>
        </div>
      ) : (
        <LoginForm next={next} />
      )}
    </div>
  );
}
