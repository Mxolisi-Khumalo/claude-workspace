import { RevealText } from "@/components/ui/RevealText";
import { ConciergeCta } from "./ConciergeCta";

const FAQS = [
  {
    q: "How does pricing work?",
    a: "Every service has published starting prices and typical timelines (see Pricing). Tell Byte or me what you need and you get an exact quote calculated from that same price list — not guessed. Larger projects get a written scope before any work starts, so you know exactly what is included.",
  },
  {
    q: "How do payments and deposits work?",
    a: "A deposit, paid through a secure payment link, books your slot. Card details are entered on the payment provider's page and never touch this site. Quotes and invoices arrive as PDFs by email, and the balance is invoiced on the schedule agreed in your quote.",
  },
  {
    q: "Who owns the code?",
    a: "You do. On final payment the code is yours outright and the repository is transferred to your account, along with the documentation you need to keep working on it — with me or anyone else.",
  },
  {
    q: "Can we work together remotely, across time zones?",
    a: "Yes. I'm based in Johannesburg (SAST, UTC+2) and work with clients locally and remotely. SAST overlaps comfortably with UK and European working hours, and calls with the Americas can be scheduled for my afternoon. Prices are available in both rand and US dollars.",
  },
  {
    q: "What happens after launch?",
    a: "Every build includes a short warranty period for bugs, plus a handover walkthrough and documentation. If you want to keep improving things, ongoing work continues on a monthly Feature Retainer that you can cancel any time.",
  },
  {
    q: "Do you work with agencies and in-house teams?",
    a: "Yes — as an extra full-stack pair of hands for a defined feature, a motion-rich front end built to your designs, or a backend behind your product. We agree scope, communication and code ownership up front, exactly as with direct clients.",
  },
];

/** Accessible accordion on native <details>; height animates where supported. */
export function Faq() {
  return (
    <section id="faq" aria-label="Frequently asked questions" className="relative scroll-mt-24 py-28 md:py-40">
      <div className="container-x grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="eyebrow mb-5">{"// FAQ"}</p>
          <RevealText as="h2" className="display text-[clamp(2.5rem,4.4vw,4.25rem)]">
            Questions, answered.
          </RevealText>
          <p className="mt-6 max-w-sm leading-relaxed text-fg-muted">
            Something not covered here? Byte knows every service, package and price on this site.
          </p>
          <div className="mt-8">
            <ConciergeCta variant="outline">
              Ask Byte <span aria-hidden>→</span>
            </ConciergeCta>
          </div>
        </div>

        <div className="hm-faq border-t border-line">
          {FAQS.map((f, i) => (
            <details key={f.q} className="group border-b border-line" open={i === 0}>
              <summary className="flex cursor-pointer items-center justify-between gap-6 py-6 text-left text-lg font-medium text-fg transition-colors hover:text-accent md:py-7 md:text-xl">
                <span className="flex items-baseline gap-4">
                  <span className="font-mono text-xs text-fg-subtle">{String(i + 1).padStart(2, "0")}</span>
                  {f.q}
                </span>
                <span
                  aria-hidden
                  className="hm-faq-icon grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line-strong text-lg leading-none text-fg-muted group-open:border-accent group-open:text-accent"
                >
                  +
                </span>
              </summary>
              <p className="max-w-[62ch] pb-7 pl-9 text-base leading-relaxed text-fg-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
