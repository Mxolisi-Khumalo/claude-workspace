import type { Metadata } from "next";
import Link from "next/link";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { connection } from "next/server";
import { profile } from "@/content";
import { rateLimit } from "@/lib/chat/server/rate-limit";
import { fulfilPayment } from "@/lib/concierge/actions";
import { formatMoney } from "@/lib/concierge/pricing";
import { amountDue, documentUrl, verifyDocumentToken } from "@/lib/documents";
import { getStore, isMockEmail } from "@/lib/integrations";
import type { InvoiceRecord } from "@/lib/integrations/types";
import { AutoRefresh } from "./AutoRefresh";

export const metadata: Metadata = {
  title: "Payment status",
  robots: { index: false, follow: false },
};

export const instant = false;

const REF = /^[A-Za-z0-9_-]{1,64}$/;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

type Outcome =
  | { state: "paid"; invoice: InvoiceRecord; pdfUrl?: string; emailHint?: string }
  | { state: "pending"; invoice: InvoiceRecord }
  | { state: "void"; invoice: InvoiceRecord }
  | { state: "missing" | "busy" | "error" };

async function clientKey() {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  return createHash("sha256").update(`${ip}:${process.env.SESSION_SECRET ?? "dev-secret"}`).digest("hex").slice(0, 32);
}

function maskEmail(email?: string) {
  if (!email) return undefined;
  const [user, domain] = email.split("@");
  return domain ? `${user.slice(0, 1)}•••@${domain}` : undefined;
}

function tokenValid(invoiceId: string, token: string) {
  try {
    return verifyDocumentToken("invoice", invoiceId, token);
  } catch {
    return false;
  }
}

/**
 * Invoice numbers are sequential, so the PDF link (which carries the client's
 * details) is only shown when the URL also has the invoice's document token
 * (`t`). Without it the page confirms status and points to the receipt email.
 */
async function check(ref: string | undefined, token: string | undefined): Promise<Outcome> {
  if (!ref || !REF.test(ref)) return { state: "missing" };
  if (!rateLimit(`pay-complete:${await clientKey()}`, 30, 10 * 60 * 1000).ok) return { state: "busy" };

  let invoice: InvoiceRecord | null;
  try {
    // Safe to call from a public page: it re-verifies with the provider and is idempotent.
    invoice = await fulfilPayment(ref);
  } catch (err) {
    console.error("[pay] status check failed", err);
    return { state: "error" };
  }
  if (!invoice) return { state: "missing" };
  if (invoice.status === "void") return { state: "void", invoice };
  if (invoice.status !== "paid") return { state: "pending", invoice };

  const lead = await getStore().getLead(invoice.leadId);
  return {
    state: "paid",
    invoice,
    pdfUrl: token && tokenValid(invoice.id, token) ? documentUrl("invoice", invoice.id) : undefined,
    emailHint: maskEmail(lead?.contact?.email),
  };
}

const fmtDate = (iso?: string) =>
  iso
    ? new Intl.DateTimeFormat("en-ZA", {
        timeZone: process.env.OWNER_TIMEZONE ?? "Africa/Johannesburg",
        dateStyle: "long",
        timeStyle: "short",
      }).format(new Date(iso))
    : "—";

function Details({ invoice }: { invoice: InvoiceRecord }) {
  const charged = invoice.payment?.charged;
  const rows: [string, string][] = [
    ["Invoice", invoice.number],
    ["For", invoice.purpose === "deposit" ? "Project deposit" : "Payment in full"],
    ["Amount", formatMoney(amountDue(invoice.total, invoice.currency), invoice.currency)],
  ];
  if (charged) rows.push(["Charged", `${formatMoney(charged.amount, charged.currency)} · rate ${charged.rate}`]);
  if (invoice.paidAt) rows.push(["Paid", fmtDate(invoice.paidAt)]);
  return (
    <dl className="mt-8 divide-y divide-line rounded-[var(--radius)] border border-line bg-bg/60">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-baseline justify-between gap-6 px-4 py-3 text-sm">
          <dt className="eyebrow">{label}</dt>
          <dd className="text-right font-mono text-fg">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

const primary =
  "inline-flex items-center justify-center rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink transition-shadow hover:shadow-[var(--glow-accent)]";
const outline =
  "inline-flex items-center justify-center rounded-full border border-line-strong px-5 py-2.5 text-sm font-semibold text-fg transition-colors hover:border-accent hover:text-accent";

function Icon({ tone }: { tone: "ok" | "wait" | "bad" }) {
  if (tone === "wait") {
    return (
      <div className="flex size-14 items-center justify-center rounded-full border border-amber/40 bg-amber/10">
        <span className="size-6 animate-spin rounded-full border-2 border-amber/30 border-t-amber" />
      </div>
    );
  }
  return (
    <div
      className={
        tone === "ok"
          ? "flex size-14 items-center justify-center rounded-full bg-accent text-accent-ink shadow-[var(--glow-accent)]"
          : "flex size-14 items-center justify-center rounded-full border border-pink/40 bg-pink/10 text-pink"
      }
    >
      <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
        {tone === "ok" ? <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" /> : <path d="M12 7v6m0 4h.01" strokeLinecap="round" />}
      </svg>
    </div>
  );
}

function Body({ outcome, mockEmail, selfHref }: { outcome: Outcome; mockEmail: boolean; selfHref: string }) {
  const contact = profile.email ? (
    <a href={`mailto:${profile.email}`} className="text-accent hover:underline">
      {profile.email}
    </a>
  ) : (
    "the email on your invoice"
  );

  switch (outcome.state) {
    case "paid":
      return (
        <>
          <Icon tone="ok" />
          <p className="eyebrow mt-8">Payment confirmed</p>
          <h1 className="display mt-3 text-5xl sm:text-6xl">
            Thank <span className="text-gradient">you.</span>
          </h1>
          <p className="mt-5 text-fg-muted">
            Your payment has been received
            {outcome.emailHint ? (
              <>
                {" "}and a receipt is on its way to <span className="font-mono text-fg">{outcome.emailHint}</span>
              </>
            ) : null}
            . {profile.shortName} has been notified and will be in touch about next steps.
          </p>
          <Details invoice={outcome.invoice} />
          <div className="mt-8 flex flex-wrap gap-3">
            {outcome.pdfUrl && (
              <a href={outcome.pdfUrl} target="_blank" rel="noopener noreferrer" className={primary}>
                Download invoice (PDF)
              </a>
            )}
            {mockEmail && (
              <Link href="/demo/outbox" className={outcome.pdfUrl ? outline : primary}>
                View the receipt email
              </Link>
            )}
            <Link href="/" className={outline}>
              Back to the site
            </Link>
          </div>
        </>
      );
    case "pending":
      return (
        <>
          <AutoRefresh />
          <Icon tone="wait" />
          <p className="eyebrow mt-8">Waiting for confirmation</p>
          <h1 className="display mt-3 text-4xl sm:text-5xl">Almost there.</h1>
          <p className="mt-5 text-fg-muted">
            We haven&apos;t received confirmation from the payment provider yet. It usually takes a few seconds; this
            page checks again automatically. If the payment didn&apos;t go through, you can try again from the payment page.
          </p>
          <Details invoice={outcome.invoice} />
          <div className="mt-8 flex flex-wrap gap-3">
            {outcome.invoice.payment?.url && (
              <a href={outcome.invoice.payment.url} className={primary}>
                Open payment page
              </a>
            )}
            <Link href={selfHref} className={outline}>
              Check again
            </Link>
          </div>
        </>
      );
    case "void":
      return (
        <>
          <Icon tone="bad" />
          <p className="eyebrow mt-8">Invoice cancelled</p>
          <h1 className="display mt-3 text-4xl sm:text-5xl">This invoice is no longer active.</h1>
          <p className="mt-5 text-fg-muted">If you believe this is a mistake, contact {contact}.</p>
        </>
      );
    default:
      return (
        <>
          <Icon tone="bad" />
          <p className="eyebrow mt-8">Payment status</p>
          <h1 className="display mt-3 text-4xl sm:text-5xl">
            {outcome.state === "missing" ? "We couldn't find that payment." : "We couldn't check this payment just now."}
          </h1>
          <p className="mt-5 text-fg-muted">
            {outcome.state === "busy"
              ? "Too many checks from your connection. Wait a minute, then refresh this page."
              : outcome.state === "error"
                ? "The payment provider didn't respond. Refresh this page in a moment."
                : "The link may be incomplete."}{" "}
            If you were charged, reply to your invoice email or contact {contact}.
          </p>
          <div className="mt-8">
            <Link href="/" className={outline}>
              Back to the site
            </Link>
          </div>
        </>
      );
  }
}

export default async function PayCompletePage({ searchParams }: PageProps<"/pay/complete">) {
  await connection();
  const params = await searchParams;
  const ref = first(params.ref) ?? first(params.reference);
  const token = first(params.t);
  const outcome = await check(ref, token);
  const selfHref = `/pay/complete?${new URLSearchParams({ ref: ref ?? "", ...(token ? { t: token } : {}) })}`;

  return (
    <section className="container-x pb-24 pt-32">
      <div className="mx-auto max-w-xl rounded-[var(--radius-lg)] border border-line bg-surface/80 p-8 backdrop-blur-md sm:p-10">
        <Body outcome={outcome} mockEmail={isMockEmail()} selfHref={selfHref} />
      </div>
    </section>
  );
}
