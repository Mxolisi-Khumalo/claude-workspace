import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, adminMode, isValidAdminToken } from "@/app/admin/auth";

/**
 * First gate for /admin. Without ADMIN_PASSWORD the dashboard is open in
 * development and 404s everywhere else; with it, a valid `mk_admin` session
 * cookie is required (except on the login page). Pages re-check access.
 */
export function proxy(req: NextRequest) {
  const mode = adminMode();
  if (mode === "disabled") return new NextResponse("Not found", { status: 404 });
  if (mode === "open" || req.nextUrl.pathname === "/admin/login") return NextResponse.next();
  if (isValidAdminToken(req.cookies.get(ADMIN_COOKIE)?.value)) return NextResponse.next();

  const login = new URL("/admin/login", req.url);
  login.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/admin/:path*"],
};
