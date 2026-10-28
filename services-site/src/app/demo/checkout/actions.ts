"use server";

import { redirect } from "next/navigation";
import { processMockEvent } from "@/app/api/webhooks/payments";
import { MOCK_SIGNATURE_HEADER, signMockWebhook } from "@/lib/integrations";
import { returnPath } from "./return-path";

const REF = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * Demo checkout buttons. Signs a mock event exactly like an external caller
 * of POST /api/webhooks/mock would, then runs the same verification and
 * fulfilment path. Only works while the mock payment provider is active.
 * `back` is the payment link's return URL (re-validated here).
 */
export async function simulatePayment(reference: string, status: "success" | "failed", back?: string) {
  if (!REF.test(reference) || (status !== "success" && status !== "failed")) throw new Error("Invalid request");

  const body = JSON.stringify({ reference, status });
  const result = await processMockEvent(body, new Headers({ [MOCK_SIGNATURE_HEADER]: signMockWebhook(body) }));
  if (result.status !== 200) throw new Error("Demo checkout is not available");

  const destination = returnPath(back, reference);
  if (status === "success") redirect(destination);
  const retry = new URLSearchParams({ result: "failed", ...(back ? { return: destination } : {}) });
  redirect(`/demo/checkout/${encodeURIComponent(reference)}?${retry}`);
}
