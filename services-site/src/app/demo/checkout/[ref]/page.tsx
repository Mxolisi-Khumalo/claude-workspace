import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { profile } from "@/content";
import { mockPaymentsActive } from "@/app/api/webhooks/payments";
import { formatMoney } from "@/lib/concierge/pricing";
import { amountDue } from "@/lib/documents";
import { getStore } from "@/lib/integrations";
import { simulatePayment } from "../actions";
import { returnPath } from "../return-path";
import { SubmitButton } from "../SubmitButton";

export const metadata: Metadata = {
  title: "Demo checkout",
  robots: { index: false, follow: false },
};

export const instant = false;

const REF = /^[A-Za-z0-9_-]{1,64}$/;

const button =
  "w-full rounded-full px-6 py-3 text-sm font-semibold transition-[box-shadow,border-color,color] disabled:opacity-60";

/**
 * Stand-in for a provider's hosted checkout while payments run on the mock
 * adapter. The buttons drive the same signed-webhook + fulfilment path a real
 * provider would.
 */
export default async function DemoCheckoutPage({ params, searchParams }: PageProps<"/demo/checkout/[ref]">) {
  await connection();
  if (!mockPaymentsActive()) notFound();

  const { ref } = await params;
  const invoice = REF.test(ref) ? await getStore().getInvoiceByReference(ref) : null;
  // Only invoices issued through the mock provider can be "paid" here.
  if (!invoice || invoice.payment?.provider !== "mock") notFound();

  const query = await searchParams;
  const failed = query.result === "failed";
  const back = typeof query.return === "string" ? returnPath(query.return, ref) : undefined;
  const charged = invoice.payment?.charged;
  const due = charged ?? { amount: amountDue(invoice.total, invoice.currency), currency: invoice.currency };
  const paid = invoice.status === "paid";

  return (
    <section className="container-x pb-24 pt-32">
      <div className="mx-auto max-w-md">
        <p className="rounded-full border border-amber/40 bg-amber/10 px-4 py-2 text-center font-mono text-xs text-amber">
          Demo checkout — no real money moves
        </p>

        <div className="mt-4 overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface/90 backdrop-blur-md">
          <div className="border-b border-line bg-[radial-gradient(ellipse_at_top,rgb(126_231_135/0.12),transparent_70%)] p-6 sm:p-8">
            <p className="eyebrow">Pay {profile.name}</p>
            <p className="display mt-4 text-5xl">{formatMoney(due.amount, due.currency)}</p>
            <p className="mt-3 font-mono text-sm text-fg-muted">
              {invoice.number} · {invoice.purpose === "deposit" ? "Project deposit" : "Payment in full"}
            </p>
            {charged && (
              <p className="mt-1 text-xs text-fg-subtle">
                Quoted {formatMoney(invoice.total, invoice.currency)}, charged in {charged.currency} at {charged.rate}.
              </p>
            )}
          </div>

          <div className="space-y-4 p-6 sm:p-8">
            <div>
              <p className="eyebrow">Card</p>
              <div className="mt-2 flex items-center justify-between rounded-[var(--radius-sm)] border border-line-strong bg-bg px-4 py-3 font-mono text-sm text-fg-subtle">
                <span>4242 4242 4242 4242</span>
                <span>12/34 · 123</span>
              </div>
              <p className="mt-2 text-xs text-fg-subtle">Illustration only. Nothing is entered or charged.</p>
            </div>

            {failed && !paid && (
              <p role="status" className="rounded-[var(--radius-sm)] border border-pink/30 bg-pink/10 px-4 py-3 text-sm text-pink">
                Simulated payment failed. The invoice is still open, so you can try again.
              </p>
            )}

            {paid ? (
              <div className="space-y-3">
                <p className="rounded-[var(--radius-sm)] border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent">
                  This invoice is already paid.
                </p>
                <Link
                  href={returnPath(back, ref)}
                  className={`${button} block bg-accent text-center text-accent-ink hover:shadow-[var(--glow-accent)]`}
                >
                  View payment status
                </Link>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <form action={simulatePayment.bind(null, ref, "success", back)}>
                  <SubmitButton pendingLabel="Processing…" className={`${button} bg-accent text-accent-ink hover:shadow-[var(--glow-accent)]`}>
                    Simulate successful payment
                  </SubmitButton>
                </form>
                <form action={simulatePayment.bind(null, ref, "failed", back)}>
                  <SubmitButton pendingLabel="Processing…" className={`${button} border border-line-strong text-fg hover:border-pink hover:text-pink`}>
                    Simulate failed payment
                  </SubmitButton>
                </form>
              </div>
            )}
          </div>
        </div>

        <p className="mt-4 text-center text-xs leading-relaxed text-fg-subtle">
          With live keys this step is the payment provider&apos;s hosted checkout. Card details never touch this site.
        </p>
      </div>
    </section>
  );
}
