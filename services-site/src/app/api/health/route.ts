import { connection } from "next/server";
import { integrationStatus } from "@/lib/integrations";

/** Which adapters are live vs mock, for checking a deployment. Names only, never secrets. */
export async function GET() {
  await connection();
  try {
    return Response.json(
      { ok: true, demoMode: process.env.DEMO_MODE === "true", ...integrationStatus() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[health] status check failed", err);
    return Response.json({ ok: false }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
